"""gRPC servicer implementation for AgentSessionService."""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import grpc

from nexus_orchestrator.proto import agent_session_pb2 as pb2
from nexus_orchestrator.proto import agent_session_pb2_grpc as pb2_grpc
from nexus_orchestrator.session.manager import SessionManager
from nexus_orchestrator.workflow.engine import WorkflowEngine
from nexus_orchestrator.workflow.store import WorkflowStore
from nexus_orchestrator.workflow.models import WorkflowRunState

logger = logging.getLogger(__name__)


class AgentSessionServiceServicer(pb2_grpc.AgentSessionServiceServicer):
    """Concrete servicer that delegates to :class:`SessionManager`."""

    def __init__(
        self,
        session_manager: SessionManager,
        workflow_engine: WorkflowEngine | None = None,
        workflow_store: WorkflowStore | None = None,
    ) -> None:
        self._manager = session_manager
        self._workflow_engine = workflow_engine
        self._workflow_store = workflow_store or WorkflowStore()

    async def CreateSession(
        self,
        request: pb2.CreateSessionRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.CreateSessionResponse:
        try:
            session_id, state = await self._manager.create_session(
                org_id=request.org_id,
                agent_id=request.agent_id,
                user_id=request.user_id,
                inputs=dict(request.inputs) if request.inputs else None,
            )
            return pb2.CreateSessionResponse(session_id=session_id, state=int(state))
        except Exception as exc:
            logger.exception("CreateSession failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))
            return pb2.CreateSessionResponse()

    async def SendMessage(
        self,
        request: pb2.SendMessageRequest,
        context: grpc.aio.ServicerContext,
    ) -> AsyncIterator[pb2.AgentEvent]:
        try:
            async for event in self._manager.send_message(
                session_id=request.session_id,
                content=request.content,
            ):
                yield event
        except KeyError as exc:
            logger.warning("SendMessage: %s", exc)
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(str(exc))
        except Exception as exc:
            logger.exception("SendMessage failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))

    async def CancelSession(
        self,
        request: pb2.CancelSessionRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.CancelSessionResponse:
        try:
            state = await self._manager.cancel_session(request.session_id)
            return pb2.CancelSessionResponse(
                session_id=request.session_id,
                state=int(state),
            )
        except KeyError as exc:
            logger.warning("CancelSession: %s", exc)
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(str(exc))
            return pb2.CancelSessionResponse()
        except ValueError as exc:
            logger.warning("CancelSession: invalid transition: %s", exc)
            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
            context.set_details(str(exc))
            return pb2.CancelSessionResponse()
        except Exception as exc:
            logger.exception("CancelSession failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))
            return pb2.CancelSessionResponse()

    async def GetSessionStatus(
        self,
        request: pb2.GetSessionStatusRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.SessionStatus:
        try:
            return await self._manager.get_status(request.session_id)
        except KeyError as exc:
            logger.warning("GetSessionStatus: %s", exc)
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(str(exc))
            return pb2.SessionStatus()
        except Exception as exc:
            logger.exception("GetSessionStatus failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))
            return pb2.SessionStatus()

    # ------------------------------------------------------------------
    # Workflow RPCs
    # ------------------------------------------------------------------

    async def RunWorkflow(
        self,
        request: pb2.RunWorkflowRequest,
        context: grpc.aio.ServicerContext,
    ) -> pb2.RunWorkflowResponse:
        """Execute a workflow DAG and return the result."""
        if self._workflow_engine is None:
            context.set_code(grpc.StatusCode.UNAVAILABLE)
            context.set_details("Workflow engine not initialised")
            return pb2.RunWorkflowResponse()

        try:
            org_id = request.org_id
            workflow_id = request.workflow_id
            trigger_inputs = json.loads(request.trigger_inputs_json) if request.trigger_inputs_json else {}

            # Retrieve or build the workflow definition.
            # For now we expect the definition inlined in the request.
            workflow_def = json.loads(request.workflow_definition_json) if request.workflow_definition_json else {}
            workflow_def.setdefault("workflow_id", workflow_id)

            # Create a run record
            run_id = self._workflow_store.create_run(org_id, workflow_id, trigger_inputs)
            self._workflow_store.update_run(run_id, WorkflowRunState.RUNNING)

            # Execute
            result = await self._workflow_engine.run_workflow(
                org_id=org_id,
                workflow_def=workflow_def,
                trigger_inputs=trigger_inputs,
            )

            # Persist result
            final_state = (
                WorkflowRunState.COMPLETED if result.status == "completed"
                else WorkflowRunState.FAILED
            )
            self._workflow_store.update_run(run_id, final_state, result)

            return pb2.RunWorkflowResponse(
                run_id=run_id,
                status=result.status,
                result_json=result.model_dump_json(),
            )

        except Exception as exc:
            logger.exception("RunWorkflow failed")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(exc))
            return pb2.RunWorkflowResponse()
