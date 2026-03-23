"""Calendar Manager skill - manages calendar events via Google or Microsoft APIs."""

from __future__ import annotations

import os
import uuid
from typing import Any

import httpx

GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
MICROSOFT_GRAPH_API = "https://graph.microsoft.com/v1.0/me/events"


def _get_provider() -> tuple[str | None, str | None]:
    """Detect which calendar provider is configured."""
    google_key = os.environ.get("GOOGLE_CALENDAR_API_KEY")
    if google_key:
        return "google", google_key

    ms_token = os.environ.get("MICROSOFT_GRAPH_TOKEN")
    if ms_token:
        return "microsoft", ms_token

    return None, None


def _list_events(
    provider: str, token: str, date: str | None,
) -> dict[str, Any]:
    """List calendar events for a given date."""
    # Stub: would call the appropriate calendar API
    return {
        "success": True,
        "events": [
            {
                "event_id": str(uuid.uuid4()),
                "title": "Sample Event",
                "date": date or "today",
                "description": f"Stub event from {provider} provider",
            },
        ],
        "error": "",
    }


def _create_event(
    provider: str,
    token: str,
    title: str | None,
    date: str | None,
    description: str | None,
) -> dict[str, Any]:
    """Create a new calendar event."""
    if not title:
        return {
            "success": False,
            "events": [],
            "error": "A title is required to create an event.",
        }

    # Stub: would POST to the appropriate calendar API
    new_event = {
        "event_id": str(uuid.uuid4()),
        "title": title,
        "date": date or "today",
        "description": description or "",
    }

    return {
        "success": True,
        "events": [new_event],
        "error": "",
    }


def _delete_event(
    provider: str, token: str, event_id: str | None,
) -> dict[str, Any]:
    """Delete a calendar event by ID."""
    if not event_id:
        return {
            "success": False,
            "events": [],
            "error": "An event_id is required to delete an event.",
        }

    # Stub: would DELETE via the appropriate calendar API
    return {
        "success": True,
        "events": [],
        "error": "",
    }


def execute(
    action: str,
    date: str | None = None,
    title: str | None = None,
    description: str | None = None,
    event_id: str | None = None,
) -> dict[str, Any]:
    """Manage calendar events.

    Args:
        action: One of ``list``, ``create``, or ``delete``.
        date: Date in ``YYYY-MM-DD`` format (used by list/create).
        title: Event title (used by create).
        description: Event description (used by create).
        event_id: Event identifier (used by delete).

    Returns:
        A dict with ``success``, ``events`` list, and ``error``.
    """
    if action not in ("list", "create", "delete"):
        return {
            "success": False,
            "events": [],
            "error": f"Invalid action '{action}'. Must be one of: list, create, delete.",
        }

    provider, token = _get_provider()

    if provider is None or token is None:
        return {
            "success": False,
            "events": [],
            "error": "Calendar API not configured. Set GOOGLE_CALENDAR_API_KEY or MICROSOFT_GRAPH_TOKEN env var.",
        }

    if action == "list":
        return _list_events(provider, token, date)
    elif action == "create":
        return _create_event(provider, token, title, date, description)
    else:
        return _delete_event(provider, token, event_id)
