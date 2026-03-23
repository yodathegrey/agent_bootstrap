"""Orchestrator service entry-point.

Starts:
  1. An async gRPC server on GRPC_PORT (default 50051).
  2. A lightweight HTTP health-check server on HEALTH_PORT (default 8080).

Gracefully shuts down on SIGTERM / SIGINT.
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
from asyncio import AbstractEventLoop
from http import HTTPStatus

import grpc

from nexus_orchestrator.config import settings
from nexus_orchestrator.events.publisher import AgentEventPublisher
from nexus_orchestrator.grpc_server import AgentSessionServiceServicer
from nexus_orchestrator.llm.router_client import LLMRouterClient
from nexus_orchestrator.memory.kernel_store import KernelStore
from nexus_orchestrator.proto import agent_session_pb2_grpc as pb2_grpc
from nexus_orchestrator.session.manager import SessionManager
from nexus_orchestrator.workflow.engine import WorkflowEngine
from nexus_orchestrator.workflow.store import WorkflowStore

logger = logging.getLogger("nexus_orchestrator")


# ---------------------------------------------------------------------------
# HTTP health-check (minimal asyncio server)
# ---------------------------------------------------------------------------

async def _health_handler(
    reader: asyncio.StreamReader,
    writer: asyncio.StreamWriter,
) -> None:
    """Respond to any TCP connection with a 200 OK (HTTP/1.0)."""
    # Read the request (we don't parse it).
    await reader.read(4096)

    body = b'{"status":"ok"}'
    response = (
        f"HTTP/1.0 {HTTPStatus.OK.value} OK\r\n"
        f"Content-Type: application/json\r\n"
        f"Content-Length: {len(body)}\r\n"
        f"\r\n"
    ).encode() + body

    writer.write(response)
    await writer.drain()
    writer.close()
    await writer.wait_closed()


async def _start_health_server(port: int) -> asyncio.Server:
    server = await asyncio.start_server(_health_handler, "0.0.0.0", port)
    logger.info("Health-check server listening on :%d", port)
    return server


# ---------------------------------------------------------------------------
# gRPC server
# ---------------------------------------------------------------------------

async def _start_grpc_server(port: int) -> grpc.aio.Server:
    """Configure and start the async gRPC server."""
    server = grpc.aio.server()

    # Wire up dependencies
    router_client = LLMRouterClient(base_url=settings.LLM_ROUTER_URL)
    kernel_store = KernelStore(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
    session_manager = SessionManager(
        router_client=router_client,
        kernel_store=kernel_store,
    )

    # Workflow engine
    event_publisher = AgentEventPublisher()
    workflow_engine = WorkflowEngine(
        session_manager=session_manager,
        event_publisher=event_publisher,
    )
    workflow_store = WorkflowStore()

    servicer = AgentSessionServiceServicer(
        session_manager,
        workflow_engine=workflow_engine,
        workflow_store=workflow_store,
    )
    pb2_grpc.add_AgentSessionServiceServicer_to_server(servicer, server)

    listen_addr = f"[::]:{port}"
    server.add_insecure_port(listen_addr)
    await server.start()
    logger.info("gRPC server listening on %s", listen_addr)
    return server


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def _serve() -> None:
    """Start all servers and wait for shutdown signal."""
    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()

    def _signal_handler() -> None:
        logger.info("Shutdown signal received")
        shutdown_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _signal_handler)

    grpc_server = await _start_grpc_server(settings.GRPC_PORT)
    health_server = await _start_health_server(settings.HEALTH_PORT)

    # Block until shutdown signal
    await shutdown_event.wait()

    logger.info("Shutting down gracefully...")
    health_server.close()
    await health_server.wait_closed()
    await grpc_server.stop(grace=5)
    logger.info("Shutdown complete")


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    asyncio.run(_serve())


if __name__ == "__main__":
    main()
