"""Redis-backed kernel memory for agent sessions."""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# Default TTL for kernel memory entries (24 hours).
_DEFAULT_TTL_SECONDS = 86400


class KernelStore:
    """Async Redis wrapper for per-session kernel memory.

    Key pattern: ``kernel:{session_id}``
    Values: JSON-encoded dicts with ``scratchpad`` and ``recent_turns``.
    """

    def __init__(self, host: str = "localhost", port: int = 6379) -> None:
        self._redis = aioredis.Redis(host=host, port=port, decode_responses=True)

    def _key(self, session_id: str) -> str:
        return f"kernel:{session_id}"

    async def get(self, session_id: str) -> dict[str, Any] | None:
        """Retrieve kernel memory for *session_id*, or None if absent."""
        raw = await self._redis.get(self._key(session_id))
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Corrupt kernel memory for session %s", session_id)
            return None

    async def update(
        self,
        session_id: str,
        scratchpad: str,
        new_turn: dict[str, str],
        token_budget: int,
    ) -> None:
        """Merge *new_turn* into the session's kernel memory.

        The ``recent_turns`` list is trimmed from the front when it exceeds
        *token_budget* (approximated as character count / 4).
        """
        key = self._key(session_id)
        existing = await self.get(session_id)

        if existing is None:
            existing = {"scratchpad": "", "recent_turns": []}

        existing["scratchpad"] = scratchpad
        existing["recent_turns"].append(new_turn)

        # Rough token budget enforcement (chars / 4 as proxy).
        total_chars = sum(len(t.get("content", "")) for t in existing["recent_turns"])
        while total_chars > token_budget * 4 and len(existing["recent_turns"]) > 1:
            removed = existing["recent_turns"].pop(0)
            total_chars -= len(removed.get("content", ""))

        await self._redis.set(key, json.dumps(existing), ex=_DEFAULT_TTL_SECONDS)

    async def flush(self, session_id: str) -> dict[str, Any] | None:
        """Read and delete kernel memory for *session_id*.

        Returns the memory dict, or None if nothing was stored.
        """
        key = self._key(session_id)
        raw = await self._redis.getdel(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
