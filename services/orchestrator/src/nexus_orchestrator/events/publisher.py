"""Publishes agent lifecycle events to Pub/Sub (or stdout fallback)."""

from __future__ import annotations

import json
import logging

from nexus_orchestrator.config import settings

logger = logging.getLogger(__name__)


class AgentEventPublisher:
    """Publishes agent state-change and usage events.

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
                    settings.GCP_PROJECT_ID, settings.PUBSUB_AGENT_TOPIC
                )
            except Exception:
                logger.warning(
                    "Failed to initialise Pub/Sub publisher; falling back to stdout"
                )

    async def publish_state_change(
        self,
        org_id: str,
        session_id: str,
        agent_id: str,
        old_state: str,
        new_state: str,
    ) -> None:
        """Publish a session state-change event."""
        payload = {
            "event": "session.state_change",
            "org_id": org_id,
            "session_id": session_id,
            "agent_id": agent_id,
            "old_state": old_state,
            "new_state": new_state,
        }
        self._publish(payload)

    async def publish_usage(
        self,
        org_id: str,
        agent_id: str,
        tokens_used: int,
    ) -> None:
        """Publish a token-usage event."""
        payload = {
            "event": "session.usage",
            "org_id": org_id,
            "agent_id": agent_id,
            "tokens_used": tokens_used,
        }
        self._publish(payload)

    def _publish(self, payload: dict) -> None:
        if self._client and self._topic_path:
            data = json.dumps(payload).encode("utf-8")
            future = self._client.publish(self._topic_path, data)
            message_id = future.result(timeout=10)
            logger.debug("Published agent event %s", message_id)
        else:
            logger.info("[agent-event] %s", json.dumps(payload))
