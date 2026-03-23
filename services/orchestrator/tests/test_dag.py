"""Tests for DAG validation and traversal."""

from __future__ import annotations

import pytest

from nexus_orchestrator.workflow.dag import WorkflowDAG, WorkflowDAGError, resolve_inputs


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _linear_dag() -> dict:
    """A -> B -> C linear workflow."""
    return {
        "workflow_id": "linear",
        "steps": [
            {"step_id": "a", "agent_id": "agent-1", "inputs": {"prompt": "hello"}, "depends_on": []},
            {"step_id": "b", "agent_id": "agent-2", "inputs": {"ctx": "$a.output"}, "depends_on": ["a"]},
            {"step_id": "c", "agent_id": "agent-3", "inputs": {"ctx": "$b.output"}, "depends_on": ["b"]},
        ],
    }


def _diamond_dag() -> dict:
    """Diamond: A -> B, A -> C, B+C -> D."""
    return {
        "workflow_id": "diamond",
        "steps": [
            {"step_id": "a", "agent_id": "agent-1", "inputs": {}, "depends_on": []},
            {"step_id": "b", "agent_id": "agent-2", "inputs": {}, "depends_on": ["a"]},
            {"step_id": "c", "agent_id": "agent-3", "inputs": {}, "depends_on": ["a"]},
            {"step_id": "d", "agent_id": "agent-4", "inputs": {"b_out": "$b.output", "c_out": "$c.output"}, "depends_on": ["b", "c"]},
        ],
    }


def _cyclic_dag() -> dict:
    return {
        "workflow_id": "cycle",
        "steps": [
            {"step_id": "a", "agent_id": "agent-1", "inputs": {}, "depends_on": ["c"]},
            {"step_id": "b", "agent_id": "agent-2", "inputs": {}, "depends_on": ["a"]},
            {"step_id": "c", "agent_id": "agent-3", "inputs": {}, "depends_on": ["b"]},
        ],
    }


def _missing_dep_dag() -> dict:
    return {
        "workflow_id": "bad-ref",
        "steps": [
            {"step_id": "a", "agent_id": "agent-1", "inputs": {}, "depends_on": ["nonexistent"]},
        ],
    }


# ---------------------------------------------------------------------------
# Tests: topological sort
# ---------------------------------------------------------------------------

class TestTopologicalSort:
    def test_linear_dag_produces_three_layers(self):
        dag = WorkflowDAG(_linear_dag())
        dag.validate()
        layers = dag.topological_sort()
        assert len(layers) == 3
        assert layers[0] == ["a"]
        assert layers[1] == ["b"]
        assert layers[2] == ["c"]

    def test_diamond_dag_produces_three_layers(self):
        dag = WorkflowDAG(_diamond_dag())
        dag.validate()
        layers = dag.topological_sort()
        assert len(layers) == 3
        assert layers[0] == ["a"]
        assert set(layers[1]) == {"b", "c"}
        assert layers[2] == ["d"]


# ---------------------------------------------------------------------------
# Tests: cycle detection
# ---------------------------------------------------------------------------

class TestCycleDetection:
    def test_cycle_raises_error(self):
        dag = WorkflowDAG(_cyclic_dag())
        with pytest.raises(WorkflowDAGError, match="Cycle detected"):
            dag.validate()


# ---------------------------------------------------------------------------
# Tests: missing dependency
# ---------------------------------------------------------------------------

class TestMissingDependency:
    def test_missing_dep_raises_error(self):
        dag = WorkflowDAG(_missing_dep_dag())
        with pytest.raises(WorkflowDAGError, match="unknown step 'nonexistent'"):
            dag.validate()


# ---------------------------------------------------------------------------
# Tests: get_ready_steps
# ---------------------------------------------------------------------------

class TestGetReadySteps:
    def test_initial_ready_steps(self):
        dag = WorkflowDAG(_diamond_dag())
        ready = dag.get_ready_steps(completed=set())
        ids = [s["step_id"] for s in ready]
        assert ids == ["a"]

    def test_after_first_step(self):
        dag = WorkflowDAG(_diamond_dag())
        ready = dag.get_ready_steps(completed={"a"})
        ids = sorted(s["step_id"] for s in ready)
        assert ids == ["b", "c"]

    def test_after_parallel_steps(self):
        dag = WorkflowDAG(_diamond_dag())
        ready = dag.get_ready_steps(completed={"a", "b", "c"})
        ids = [s["step_id"] for s in ready]
        assert ids == ["d"]

    def test_all_completed_returns_empty(self):
        dag = WorkflowDAG(_diamond_dag())
        ready = dag.get_ready_steps(completed={"a", "b", "c", "d"})
        assert ready == []


# ---------------------------------------------------------------------------
# Tests: resolve_inputs
# ---------------------------------------------------------------------------

class TestResolveInputs:
    def test_substitutes_output_reference(self):
        step = {"step_id": "b", "inputs": {"ctx": "$a.output"}}
        outputs = {"a": "result from a"}
        resolved = resolve_inputs(step, outputs)
        assert resolved["ctx"] == "result from a"

    def test_multiple_references_in_one_value(self):
        step = {"step_id": "d", "inputs": {"combined": "$b.output and $c.output"}}
        outputs = {"b": "B-result", "c": "C-result"}
        resolved = resolve_inputs(step, outputs)
        assert resolved["combined"] == "B-result and C-result"

    def test_unresolved_reference_kept_as_is(self):
        step = {"step_id": "b", "inputs": {"ctx": "$missing.output"}}
        resolved = resolve_inputs(step, outputs={})
        assert resolved["ctx"] == "$missing.output"

    def test_non_string_values_pass_through(self):
        step = {"step_id": "x", "inputs": {"count": 42, "flag": True}}
        resolved = resolve_inputs(step, outputs={})
        assert resolved["count"] == 42
        assert resolved["flag"] is True
