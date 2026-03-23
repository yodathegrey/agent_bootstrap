"""DAG representation, validation, and traversal for workflow definitions."""

from __future__ import annotations

import re
from collections import defaultdict, deque
from typing import Any


class WorkflowDAGError(Exception):
    """Raised when a workflow DAG is invalid."""


class WorkflowDAG:
    """Directed acyclic graph built from a workflow definition.

    Expected definition format::

        {
            "workflow_id": "my-workflow",
            "steps": [
                {
                    "step_id": "step_a",
                    "agent_id": "agent-1",
                    "inputs": {"prompt": "do something"},
                    "depends_on": []
                },
                {
                    "step_id": "step_b",
                    "agent_id": "agent-2",
                    "inputs": {"context": "$step_a.output"},
                    "depends_on": ["step_a"]
                }
            ]
        }
    """

    def __init__(self, definition: dict) -> None:
        self._definition = definition
        self._steps: dict[str, dict] = {}
        self._adjacency: dict[str, list[str]] = defaultdict(list)
        self._reverse: dict[str, list[str]] = defaultdict(list)
        self._parse(definition)

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    def _parse(self, definition: dict) -> None:
        steps = definition.get("steps", [])
        if not steps:
            raise WorkflowDAGError("Workflow definition must contain at least one step")

        for step in steps:
            step_id = step.get("step_id")
            if not step_id:
                raise WorkflowDAGError("Every step must have a 'step_id'")
            if step_id in self._steps:
                raise WorkflowDAGError(f"Duplicate step_id: {step_id}")
            self._steps[step_id] = step

        # Build adjacency lists from depends_on
        for step in steps:
            step_id = step["step_id"]
            for dep in step.get("depends_on", []):
                # dep -> step_id  (dep must finish before step_id)
                self._adjacency[dep].append(step_id)
                self._reverse[step_id].append(dep)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def steps(self) -> dict[str, dict]:
        return dict(self._steps)

    def validate(self) -> None:
        """Validate the DAG: check references and detect cycles."""
        # Check that all depends_on references point to existing steps
        for step_id, deps in self._reverse.items():
            for dep in deps:
                if dep not in self._steps:
                    raise WorkflowDAGError(
                        f"Step '{step_id}' depends on unknown step '{dep}'"
                    )

        # Cycle detection via Kahn's algorithm
        self.topological_sort()

    def topological_sort(self) -> list[list[str]]:
        """Return execution layers (parallel groups) via Kahn's algorithm.

        Each layer is a list of step_ids that can execute concurrently.
        Raises :class:`WorkflowDAGError` if a cycle is detected.
        """
        in_degree: dict[str, int] = {sid: 0 for sid in self._steps}
        for step_id, deps in self._reverse.items():
            in_degree[step_id] = len(deps)

        queue: deque[str] = deque()
        for sid, deg in in_degree.items():
            if deg == 0:
                queue.append(sid)

        layers: list[list[str]] = []
        visited_count = 0

        while queue:
            layer = list(queue)
            queue.clear()
            layers.append(layer)
            visited_count += len(layer)

            for sid in layer:
                for child in self._adjacency.get(sid, []):
                    in_degree[child] -= 1
                    if in_degree[child] == 0:
                        queue.append(child)

        if visited_count != len(self._steps):
            raise WorkflowDAGError(
                "Cycle detected in workflow DAG — not all steps are reachable"
            )

        return layers

    def get_ready_steps(self, completed: set[str]) -> list[dict]:
        """Return step dicts whose dependencies are all in *completed*."""
        ready = []
        for step_id, step in self._steps.items():
            if step_id in completed:
                continue
            deps = step.get("depends_on", [])
            if all(dep in completed for dep in deps):
                ready.append(step)
        return ready


# ------------------------------------------------------------------
# Input resolution helpers
# ------------------------------------------------------------------

_REF_PATTERN = re.compile(r"\$(\w+)\.output")


def resolve_inputs(step: dict, outputs: dict[str, Any]) -> dict:
    """Resolve ``$step_id.output`` references in step inputs.

    Returns a **new** dict with references replaced by actual output values.
    """
    raw_inputs = step.get("inputs", {})
    resolved: dict[str, Any] = {}
    for key, value in raw_inputs.items():
        if isinstance(value, str):
            resolved[key] = _REF_PATTERN.sub(
                lambda m: str(outputs.get(m.group(1), m.group(0))),
                value,
            )
        else:
            resolved[key] = value
    return resolved
