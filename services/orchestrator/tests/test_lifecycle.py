"""Tests for SessionLifecycle state machine."""

from __future__ import annotations

import pytest

from nexus_orchestrator.session.lifecycle import (
    VALID_TRANSITIONS,
    SessionLifecycle,
    SessionState,
)


class TestTransition:
    """Tests for SessionLifecycle.transition()."""

    def test_defined_to_provisioning(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.DEFINED, SessionState.PROVISIONING)
        assert result == SessionState.PROVISIONING

    def test_defined_to_cancelled(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.DEFINED, SessionState.CANCELLED)
        assert result == SessionState.CANCELLED

    def test_provisioning_to_ready(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.PROVISIONING, SessionState.READY)
        assert result == SessionState.READY

    def test_provisioning_to_errored(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.PROVISIONING, SessionState.ERRORED)
        assert result == SessionState.ERRORED

    def test_ready_to_running(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.READY, SessionState.RUNNING)
        assert result == SessionState.RUNNING

    def test_running_to_completing(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.RUNNING, SessionState.COMPLETING)
        assert result == SessionState.COMPLETING

    def test_running_to_ready(self, lifecycle: SessionLifecycle) -> None:
        """After a turn the session goes back to READY."""
        result = lifecycle.transition(SessionState.RUNNING, SessionState.READY)
        assert result == SessionState.READY

    def test_running_to_cancelled(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.RUNNING, SessionState.CANCELLED)
        assert result == SessionState.CANCELLED

    def test_completing_to_archived(self, lifecycle: SessionLifecycle) -> None:
        result = lifecycle.transition(SessionState.COMPLETING, SessionState.ARCHIVED)
        assert result == SessionState.ARCHIVED

    def test_invalid_transition_raises(self, lifecycle: SessionLifecycle) -> None:
        with pytest.raises(ValueError, match="Invalid transition"):
            lifecycle.transition(SessionState.DEFINED, SessionState.RUNNING)

    def test_terminal_state_transition_raises(self, lifecycle: SessionLifecycle) -> None:
        with pytest.raises(ValueError, match="Invalid transition"):
            lifecycle.transition(SessionState.ARCHIVED, SessionState.READY)

    def test_cancelled_is_terminal(self, lifecycle: SessionLifecycle) -> None:
        with pytest.raises(ValueError, match="Invalid transition"):
            lifecycle.transition(SessionState.CANCELLED, SessionState.RUNNING)

    def test_all_valid_transitions_succeed(self, lifecycle: SessionLifecycle) -> None:
        """Walk every edge in VALID_TRANSITIONS and confirm it succeeds."""
        for source, targets in VALID_TRANSITIONS.items():
            for target in targets:
                result = lifecycle.transition(source, target)
                assert result == target


class TestIsTerminal:
    """Tests for SessionLifecycle.is_terminal()."""

    @pytest.mark.parametrize(
        "state",
        [SessionState.ARCHIVED, SessionState.ERRORED, SessionState.CANCELLED],
    )
    def test_terminal_states(self, state: SessionState) -> None:
        assert SessionLifecycle.is_terminal(state) is True

    @pytest.mark.parametrize(
        "state",
        [
            SessionState.DEFINED,
            SessionState.PROVISIONING,
            SessionState.READY,
            SessionState.RUNNING,
            SessionState.COMPLETING,
        ],
    )
    def test_non_terminal_states(self, state: SessionState) -> None:
        assert SessionLifecycle.is_terminal(state) is False
