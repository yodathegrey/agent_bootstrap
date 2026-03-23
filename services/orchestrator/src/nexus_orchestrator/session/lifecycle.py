"""Session state-machine with validated transitions."""

from __future__ import annotations

from enum import IntEnum


class SessionState(IntEnum):
    """Mirror of the proto SessionState enum."""

    UNSPECIFIED = 0
    DEFINED = 1
    PROVISIONING = 2
    READY = 3
    RUNNING = 4
    COMPLETING = 5
    ARCHIVED = 6
    ERRORED = 7
    CANCELLED = 8


# Legal state transitions: source -> set of allowed targets.
VALID_TRANSITIONS: dict[SessionState, set[SessionState]] = {
    SessionState.DEFINED: {SessionState.PROVISIONING, SessionState.CANCELLED},
    SessionState.PROVISIONING: {SessionState.READY, SessionState.ERRORED, SessionState.CANCELLED},
    SessionState.READY: {SessionState.RUNNING, SessionState.CANCELLED},
    SessionState.RUNNING: {
        SessionState.COMPLETING,
        SessionState.READY,
        SessionState.ERRORED,
        SessionState.CANCELLED,
    },
    SessionState.COMPLETING: {SessionState.ARCHIVED, SessionState.ERRORED},
    # Terminal states have no outgoing transitions.
    SessionState.ARCHIVED: set(),
    SessionState.ERRORED: set(),
    SessionState.CANCELLED: set(),
}

_TERMINAL_STATES: frozenset[SessionState] = frozenset(
    {SessionState.ARCHIVED, SessionState.ERRORED, SessionState.CANCELLED}
)


class SessionLifecycle:
    """Validates and executes session state transitions."""

    @staticmethod
    def transition(current: SessionState, target: SessionState) -> SessionState:
        """Return *target* if the transition is legal, otherwise raise."""
        allowed = VALID_TRANSITIONS.get(current)
        if allowed is None:
            raise ValueError(f"Unknown source state: {current!r}")
        if target not in allowed:
            raise ValueError(
                f"Invalid transition {current.name} -> {target.name}. "
                f"Allowed targets: {', '.join(s.name for s in sorted(allowed))}"
            )
        return target

    @staticmethod
    def is_terminal(state: SessionState) -> bool:
        """Return True if *state* is a terminal (no further transitions)."""
        return state in _TERMINAL_STATES
