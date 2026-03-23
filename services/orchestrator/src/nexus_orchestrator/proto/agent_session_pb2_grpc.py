"""Stub gRPC servicer and registration for AgentSessionService.

These placeholders will be replaced by ``make proto`` which runs
grpc_tools.protoc against the real .proto files.
"""

from __future__ import annotations

from typing import Any

import grpc


# ---------------------------------------------------------------------------
# Servicer base class
# ---------------------------------------------------------------------------

class AgentSessionServiceServicer:
    """Base class for AgentSessionService implementations."""

    async def CreateSession(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        """Create a new agent session."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Method not implemented!")
        raise NotImplementedError("Method not implemented!")

    async def SendMessage(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        """Send a message and stream back agent events."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Method not implemented!")
        raise NotImplementedError("Method not implemented!")

    async def CancelSession(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        """Cancel a running session."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Method not implemented!")
        raise NotImplementedError("Method not implemented!")

    async def GetSessionStatus(self, request: Any, context: grpc.aio.ServicerContext) -> Any:
        """Get the current status of a session."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Method not implemented!")
        raise NotImplementedError("Method not implemented!")


# ---------------------------------------------------------------------------
# Server registration helper
# ---------------------------------------------------------------------------

_METHOD_HANDLERS: dict[str, str] = {
    "CreateSession": "unary_unary",
    "SendMessage": "unary_stream",
    "CancelSession": "unary_unary",
    "GetSessionStatus": "unary_unary",
}


def add_AgentSessionServiceServicer_to_server(
    servicer: AgentSessionServiceServicer,
    server: grpc.aio.Server,
) -> None:
    """Register *servicer* on *server*.

    In the real generated code this wires up full method descriptors.  The
    stub version uses ``grpc.method_service_handler`` style generic handlers
    so the server can at least start.
    """
    from grpc import (
        unary_unary_rpc_method_handler,
        unary_stream_rpc_method_handler,
    )

    handler = grpc.method_service_handler(
        {
            "CreateSession": unary_unary_rpc_method_handler(servicer.CreateSession),
            "SendMessage": unary_stream_rpc_method_handler(servicer.SendMessage),
            "CancelSession": unary_unary_rpc_method_handler(servicer.CancelSession),
            "GetSessionStatus": unary_unary_rpc_method_handler(servicer.GetSessionStatus),
        }
    ) if hasattr(grpc, "method_service_handler") else None

    # Fallback: register a generic service handler that routes by method name.
    generic_handler = _GenericHandler(servicer)
    server.add_generic_rpc_handlers([generic_handler])


class _GenericHandler(grpc.GenericRpcHandler):
    """Minimal generic handler that dispatches to the servicer methods."""

    _SERVICE_NAME = "nexus.orchestrator.AgentSessionService"

    def __init__(self, servicer: AgentSessionServiceServicer) -> None:
        self._servicer = servicer

    def service(self, handler_call_details: grpc.HandlerCallDetails):
        method = handler_call_details.method
        if method is None:
            return None

        # Method string looks like "/package.Service/Method"
        parts = method.split("/")
        rpc_name = parts[-1] if parts else method

        if rpc_name == "CreateSession":
            return grpc.unary_unary_rpc_method_handler(self._servicer.CreateSession)
        elif rpc_name == "SendMessage":
            return grpc.unary_stream_rpc_method_handler(self._servicer.SendMessage)
        elif rpc_name == "CancelSession":
            return grpc.unary_unary_rpc_method_handler(self._servicer.CancelSession)
        elif rpc_name == "GetSessionStatus":
            return grpc.unary_unary_rpc_method_handler(self._servicer.GetSessionStatus)

        return None
