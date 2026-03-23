"""Shared pytest fixtures for the orchestrator test suite."""

from __future__ import annotations

import pytest

from nexus_orchestrator.session.lifecycle import SessionLifecycle, SessionState


@pytest.fixture
def lifecycle() -> SessionLifecycle:
    """Return a fresh SessionLifecycle instance."""
    return SessionLifecycle()


@pytest.fixture
def defined_state() -> SessionState:
    """Convenience fixture for the DEFINED state."""
    return SessionState.DEFINED


@pytest.fixture
def ready_state() -> SessionState:
    """Convenience fixture for the READY state."""
    return SessionState.READY
