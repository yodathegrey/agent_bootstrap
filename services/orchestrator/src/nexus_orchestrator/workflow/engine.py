"""Workflow execution engine — runs a DAG of agent steps."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any

from nexus_orchestrator.events.publisher import AgentEventPublisher
from nexus_orchestrator.session.manager import SessionManager
from nexus_orchestrator.workflow.dag import WorkflowDAG, resolve_inputs
from nexus_orchestrator.workflow.models import StepResult, WorkflowResult

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Executes a workflow DAG layer-by-layer with concurrent steps."""

    def __init__(
        self,
        session_manager: SessionManager,
        event_publisher: AgentEventPublisher,
    ) -> None:
        self._session_manager = session_manager
        self._event_publisher = event_publisher

    async def run_workflow(
        self,
        org_id: str,
        workflow_def: dict,
        trigger_inputs: dict,
    ) -> WorkflowResult:
        """Build, validate, and execute a workflow DAG.

        Returns a :class:`WorkflowResult` with outputs from every step.
        """
        workflow_id = workflow_def.get("workflow_id", str(uuid.uuid4()))
        start = time.monotonic()

        # Build and validate
        dag = WorkflowDAG(workflow_def)
        dag.validate()
        layers = dag.topological_sort()

        outputs: dict[str, Any] = {}
        step_results: list[StepResult] = []
        overall_status = "completed"

        for layer in layers:
            tasks = []
            for step_id in layer:
                step = dag.steps[step_id]
                # Merge trigger_inputs into step inputs, then resolve references
                merged = {**trigger_inputs, **step.get("inputs", {})}
                step_with_merged = {**step, "inputs": merged}
                resolved = resolve_inputs(step_with_merged, outputs)
                tasks.append(self._execute_step(org_id, step, resolved))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, Exception):
                    sr = StepResult(
                        step_id="unknown",
                        output="",
                        status="failed",
                        error=str(result),
                    )
                    step_results.append(sr)
                    overall_status = "partial"
                else:
                    step_results.append(result)
                    outputs[result.step_id] = result.output
                    if result.status == "failed":
                        overall_status = "partial"

        elapsed_ms = int((time.monotonic() - start) * 1000)

        return WorkflowResult(
            workflow_id=workflow_id,
            status=overall_status,
            steps=step_results,
            total_duration_ms=elapsed_ms,
            trigger_inputs=trigger_inputs,
        )

    async def _execute_step(
        self,
        org_id: str,
        step: dict,
        inputs: dict,
    ) -> StepResult:
        """Execute a single workflow step by creating a session and sending a message."""
        step_id = step["step_id"]
        agent_id = step.get("agent_id", "default")
        start = time.monotonic()

        try:
            # Create a session for this step's agent
            session_id, _ = await self._session_manager.create_session(
                org_id=org_id,
                agent_id=agent_id,
                user_id=f"workflow:{step_id}",
                inputs=inputs,
            )

            # Build a prompt from the resolved inputs
            prompt_parts = [f"{k}: {v}" for k, v in inputs.items()]
            prompt = "\n".join(prompt_parts) if prompt_parts else "Execute step."

            # Stream the response and collect into a single output
            output_parts: list[str] = []
            async for event in self._session_manager.send_message(
                session_id=session_id,
                content=prompt,
            ):
                if event.event_type == "text_delta":
                    output_parts.append(event.text_delta.text)

            output = "".join(output_parts)
            elapsed_ms = int((time.monotonic() - start) * 1000)

            logger.info(
                "Step %s completed in %dms (agent=%s)", step_id, elapsed_ms, agent_id
            )

            return StepResult(
                step_id=step_id,
                output=output,
                status="completed",
                duration_ms=elapsed_ms,
            )

        except Exception as exc:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.exception("Step %s failed: %s", step_id, exc)
            return StepResult(
                step_id=step_id,
                output="",
                status="failed",
                duration_ms=elapsed_ms,
                error=str(exc),
            )
