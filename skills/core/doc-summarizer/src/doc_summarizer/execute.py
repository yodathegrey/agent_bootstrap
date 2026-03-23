"""Document Summarizer skill - summarizes long documents using the configured LLM."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

DEFAULT_LLM_ROUTER_URL = "http://localhost:3001"
DEFAULT_MODEL = "claude-sonnet-4-6"


def _build_chat_request(text: str, max_length: int) -> dict[str, Any]:
    """Build an OpenAI-compatible chat completion request."""
    return {
        "model": DEFAULT_MODEL,
        "stream": True,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a document summarizer. Summarize the following "
                    "text concisely."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Summarize the following text in at most {max_length} words:\n\n"
                    f"{text}"
                ),
            },
        ],
    }


def _fallback_truncation(text: str, max_length: int) -> str:
    """Simple truncation fallback when the LLM Router is unavailable."""
    words = text.split()
    if len(words) <= max_length:
        return text
    return " ".join(words[:max_length]) + "..."


def _parse_streaming_response(response: httpx.Response) -> str:
    """Parse an NDJSON streaming response and accumulate text deltas."""
    summary_parts: list[str] = []

    for line in response.iter_lines():
        line = line.strip()
        if not line or line.startswith(":"):
            continue

        # Handle SSE-style "data: " prefix.
        if line.startswith("data: "):
            line = line[len("data: "):]

        if line == "[DONE]":
            break

        try:
            chunk = json.loads(line)
        except json.JSONDecodeError:
            continue

        choices = chunk.get("choices", [])
        if not choices:
            continue

        delta = choices[0].get("delta", {})
        content = delta.get("content", "")
        if content:
            summary_parts.append(content)

    return "".join(summary_parts)


def execute(text: str, max_length: int = 500) -> dict[str, Any]:
    """Summarize a document using the configured LLM.

    Args:
        text: The text to summarize.
        max_length: Maximum summary length in words (default 500).

    Returns:
        A dict with ``summary``, ``original_length`` (character count of
        the input), and ``summary_length`` (character count of the summary).
    """
    llm_router_url = os.environ.get("LLM_ROUTER_URL", DEFAULT_LLM_ROUTER_URL)
    endpoint = f"{llm_router_url}/v1/chat/completions"

    request_body = _build_chat_request(text, max_length)

    try:
        with httpx.Client(timeout=120) as client:
            with client.stream("POST", endpoint, json=request_body) as response:
                response.raise_for_status()
                summary = _parse_streaming_response(response)
    except (httpx.HTTPError, httpx.ConnectError, OSError):
        summary = _fallback_truncation(text, max_length)

    return {
        "summary": summary,
        "original_length": len(text),
        "summary_length": len(summary),
    }
