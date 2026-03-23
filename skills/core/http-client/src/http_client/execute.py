"""HTTP Client skill - makes HTTP requests and returns the response."""

from __future__ import annotations

from typing import Any

import httpx


def execute(
    url: str,
    method: str = "GET",
    headers: dict | None = None,
    body: str | None = None,
) -> dict[str, Any]:
    """Make an HTTP request and return the response.

    Args:
        url: The URL to request.
        method: HTTP method (default ``GET``).
        headers: Optional request headers as a dict.
        body: Optional request body string.

    Returns:
        A dict with ``status_code``, ``headers`` (as dict), and ``body``
        (response text).
    """
    try:
        with httpx.Client(timeout=30) as client:
            response = client.request(
                method=method.upper(),
                url=url,
                headers=headers,
                content=body,
            )
        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": response.text,
        }
    except httpx.TimeoutException:
        return {
            "status_code": 0,
            "headers": {},
            "body": f"Error: request to {url} timed out after 30 seconds",
        }
    except httpx.RequestError as exc:
        return {
            "status_code": 0,
            "headers": {},
            "body": f"Error: request failed: {exc}",
        }
    except Exception as exc:
        return {
            "status_code": 0,
            "headers": {},
            "body": f"Error: unexpected failure: {exc}",
        }
