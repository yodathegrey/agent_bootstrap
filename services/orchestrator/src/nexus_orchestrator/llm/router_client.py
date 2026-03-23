"""Async HTTP client for the LLM Router service."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

import httpx

logger = logging.getLogger(__name__)


class LLMRouterClient:
    """Streams LLM completions from the Router service over HTTP.

    The Router exposes a POST endpoint that returns newline-delimited JSON
    chunks (NDJSON).
    """

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    async def send_message(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        tools: list[dict[str, Any]] | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncIterator[dict[str, Any]]:
        """POST to the router and yield parsed stream chunks.

        Each yielded dict has at least a ``type`` key (``text_delta``,
        ``tool_use``, ``tool_result``, ``usage``, ``done``, etc.).
        """
        payload: dict[str, Any] = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }
        if model:
            payload["model"] = model
        if tools:
            payload["tools"] = tools

        url = f"{self._base_url}/v1/chat/completions"

        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        yield chunk
                    except json.JSONDecodeError:
                        logger.warning("Skipping non-JSON line from router: %s", line[:120])
