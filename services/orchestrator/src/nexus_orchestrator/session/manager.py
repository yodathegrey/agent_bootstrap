"""Session manager: create, message, cancel, status."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from nexus_orchestrator.llm.router_client import LLMRouterClient
from nexus_orchestrator.memory.kernel_store import KernelStore
from nexus_orchestrator.proto import agent_session_pb2 as pb2
from nexus_orchestrator.session.context_builder import ContextBuilder
from nexus_orchestrator.session.lifecycle import SessionLifecycle, SessionState

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages agent session lifecycle and message dispatch.

    Sessions are stored in-memory for now; a Firestore backend can be
    substituted by swapping the ``_sessions`` dict with a DAO.
    """

    def __init__(
        self,
        router_client: LLMRouterClient,
        kernel_store: KernelStore,
    ) -> None:
        self._router = router_client
        self._kernel = kernel_store
        self._lifecycle = SessionLifecycle()
        # In-memory session store: session_id -> session dict
        self._sessions: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_session(
        self,
        org_id: str,
        agent_id: str,
        user_id: str,
        inputs: dict[str, str] | None = None,
    ) -> tuple[str, SessionState]:
        """Create a new session, returning (session_id, state)."""
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        session: dict[str, Any] = {
            "session_id": session_id,
            "org_id": org_id,
            "agent_id": agent_id,
            "user_id": user_id,
            "inputs": inputs or {},
            "state": SessionState.DEFINED,
            "conversation": [],
            "turn_count": 0,
            "total_tokens": 0,
            "created_at": now,
            "updated_at": now,
        }

        self._sessions[session_id] = session
        logger.info("Session %s created (org=%s, agent=%s)", session_id, org_id, agent_id)

        # Immediately transition to PROVISIONING -> READY (no heavy setup yet).
        self._transition(session_id, SessionState.PROVISIONING)
        self._transition(session_id, SessionState.READY)

        return session_id, self._sessions[session_id]["state"]

    async def send_message(
        self,
        session_id: str,
        content: str,
    ) -> AsyncIterator[pb2.AgentEvent]:
        """Send a user message and yield streaming AgentEvent objects."""
        session = self._get_session(session_id)
        self._transition(session_id, SessionState.RUNNING)

        # Append user turn
        session["conversation"].append({"role": "user", "content": content})

        # Retrieve kernel memory (may be None for a fresh session)
        memory = await self._kernel.get(session_id)

        # Build LLM context
        agent_def: dict[str, Any] = {
            "name": f"Agent-{session['agent_id']}",
            "description": "",
            "instructions": "",
        }
        messages = ContextBuilder.build_context(
            agent_def=agent_def,
            skills=[],
            memory=memory,
            conversation=session["conversation"],
        )

        # Stream response from LLM Router
        assistant_text_parts: list[str] = []
        async for chunk in self._router.send_message(messages=messages):
            chunk_type = chunk.get("type", "")

            if chunk_type == "text_delta":
                text = chunk.get("text", "")
                assistant_text_parts.append(text)
                yield pb2.AgentEvent(
                    session_id=session_id,
                    event_type="text_delta",
                    text_delta=pb2.TextDelta(text=text),
                )

            elif chunk_type == "tool_use":
                yield pb2.AgentEvent(
                    session_id=session_id,
                    event_type="tool_use",
                    tool_use=pb2.ToolUse(
                        tool_id=chunk.get("tool_id", ""),
                        name=chunk.get("name", ""),
                        input_json=chunk.get("input_json", "{}"),
                    ),
                )

            elif chunk_type == "tool_result":
                yield pb2.AgentEvent(
                    session_id=session_id,
                    event_type="tool_result",
                    tool_result=pb2.ToolResult(
                        tool_id=chunk.get("tool_id", ""),
                        output_json=chunk.get("output_json", "{}"),
                        is_error=chunk.get("is_error", False),
                    ),
                )

            elif chunk_type == "usage":
                tokens = chunk.get("total_tokens", 0)
                session["total_tokens"] += tokens

        # Record assistant reply
        full_reply = "".join(assistant_text_parts)
        session["conversation"].append({"role": "assistant", "content": full_reply})
        session["turn_count"] += 1
        session["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Update kernel memory with latest scratchpad
        await self._kernel.update(
            session_id=session_id,
            scratchpad=full_reply[:500],  # truncated summary
            new_turn={"role": "assistant", "content": full_reply},
            token_budget=4096,
        )

        # Back to READY
        self._transition(session_id, SessionState.READY)

    async def cancel_session(self, session_id: str) -> SessionState:
        """Cancel the session and return the new state."""
        self._get_session(session_id)
        self._transition(session_id, SessionState.CANCELLED)
        logger.info("Session %s cancelled", session_id)
        return self._sessions[session_id]["state"]

    async def get_status(self, session_id: str) -> pb2.SessionStatus:
        """Return the current status of a session."""
        session = self._get_session(session_id)
        return pb2.SessionStatus(
            session_id=session_id,
            state=int(session["state"]),
            org_id=session["org_id"],
            agent_id=session["agent_id"],
            user_id=session["user_id"],
            created_at=session["created_at"],
            updated_at=session["updated_at"],
            turn_count=session["turn_count"],
            total_tokens=session["total_tokens"],
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_session(self, session_id: str) -> dict[str, Any]:
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(f"Session not found: {session_id}")
        return session

    def _transition(self, session_id: str, target: SessionState) -> None:
        session = self._sessions[session_id]
        current = session["state"]
        new_state = self._lifecycle.transition(current, target)
        session["state"] = new_state
        session["updated_at"] = datetime.now(timezone.utc).isoformat()
