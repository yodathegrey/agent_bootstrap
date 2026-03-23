"""Publishes memory-flush events to Pub/Sub (or stdout fallback)."""

from __future__ import annotations

import json
import logging
from typing import Any

from nexus_orchestrator.config import settings

logger = logging.getLogger(__name__)


class MemoryEventPublisher:
    """Publishes memory events to the configured Pub/Sub topic.

    When ``GCP_PROJECT_ID`` is not set the events are logged to stdout
    instead, which is useful for local development.
    """

    def __init__(self) -> None:
        self._client = None
        self._topic_path: str | None = None

        if settings.GCP_PROJECT_ID:
            try:
                from google.cloud import pubsub_v1  # type: ignore[import-untyped]

                self._client = pubsub_v1.PublisherClient()
                self._topic_path = self._client.topic_path(
                    settings.GCP_PROJECT_ID, settings.PUBSUB_MEMORY_TOPIC
                )
            except Exception:
                logger.warning(
                    "Failed to initialise Pub/Sub publisher; falling back to stdout"
                )

    async def publish_flush(
        self,
        org_id: str,
        session_id: str,
        agent_id: str,
        kernel_memory: dict[str, Any],
    ) -> None:
        """Publish a memory-flush event."""
        payload = {
            "event": "memory.flush",
            "org_id": org_id,
            "session_id": session_id,
            "agent_id": agent_id,
            "kernel_memory": kernel_memory,
        }

        if self._client and self._topic_path:
            data = json.dumps(payload).encode("utf-8")
            future = self._client.publish(self._topic_path, data)
            message_id = future.result(timeout=10)
            logger.debug("Published memory event %s", message_id)
        else:
            logger.info("[memory-event] %s", json.dumps(payload))
