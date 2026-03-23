"""Stub protobuf message definitions for AgentSession.

These placeholders mirror the proto schema and will be replaced by
``make proto`` which runs grpc_tools.protoc against the real .proto files.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SessionState(IntEnum):
    UNSPECIFIED = 0
    DEFINED = 1
    PROVISIONING = 2
    READY = 3
    RUNNING = 4
    COMPLETING = 5
    ARCHIVED = 6
    ERRORED = 7
    CANCELLED = 8


# ---------------------------------------------------------------------------
# Request / Response messages
# ---------------------------------------------------------------------------

@dataclass
class CreateSessionRequest:
    org_id: str = ""
    agent_id: str = ""
    user_id: str = ""
    inputs: dict[str, str] = field(default_factory=dict)


@dataclass
class CreateSessionResponse:
    session_id: str = ""
    state: int = SessionState.UNSPECIFIED


@dataclass
class SendMessageRequest:
    session_id: str = ""
    content: str = ""


@dataclass
class TextDelta:
    text: str = ""


@dataclass
class ToolUse:
    tool_id: str = ""
    name: str = ""
    input_json: str = ""


@dataclass
class ToolResult:
    tool_id: str = ""
    output_json: str = ""
    is_error: bool = False


@dataclass
class AgentEvent:
    session_id: str = ""
    event_type: str = ""
    text_delta: Optional[TextDelta] = None
    tool_use: Optional[ToolUse] = None
    tool_result: Optional[ToolResult] = None
    state: int = SessionState.UNSPECIFIED


@dataclass
class CancelSessionRequest:
    session_id: str = ""


@dataclass
class CancelSessionResponse:
    session_id: str = ""
    state: int = SessionState.CANCELLED


@dataclass
class GetSessionStatusRequest:
    session_id: str = ""


@dataclass
class SessionStatus:
    session_id: str = ""
    state: int = SessionState.UNSPECIFIED
    org_id: str = ""
    agent_id: str = ""
    user_id: str = ""
    created_at: str = ""
    updated_at: str = ""
    turn_count: int = 0
    total_tokens: int = 0
