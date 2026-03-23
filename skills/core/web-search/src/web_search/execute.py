"""Web Search skill - performs web searches and returns summarized results."""

from __future__ import annotations

import os
from typing import Any

import httpx

SERPAPI_BASE_URL = "https://serpapi.com/search"


def execute(query: str, max_results: int = 5) -> dict[str, Any]:
    """Execute a web search and return structured results.

    Args:
        query: The search query string.
        max_results: Maximum number of results to return (default 5).

    Returns:
        A dict with a ``results`` list containing title, url, and snippet
        for each search result.
    """
    api_key = os.environ.get("SERPAPI_API_KEY")

    if not api_key:
        return {
            "results": [
                {
                    "title": f"Mock result {i + 1} for: {query}",
                    "url": f"https://example.com/result/{i + 1}",
                    "snippet": (
                        f"This is a mock search result for '{query}'. "
                        "Set the SERPAPI_API_KEY environment variable to "
                        "enable real web searches via SerpAPI."
                    ),
                }
                for i in range(max_results)
            ],
        }

    params = {
        "q": query,
        "num": max_results,
        "api_key": api_key,
    }

    with httpx.Client(timeout=30) as client:
        response = client.get(SERPAPI_BASE_URL, params=params)
        response.raise_for_status()
        data = response.json()

    organic_results = data.get("organic_results", [])

    results = [
        {
            "title": item.get("title", ""),
            "url": item.get("link", ""),
            "snippet": item.get("snippet", ""),
        }
        for item in organic_results[:max_results]
    ]

    return {"results": results}
