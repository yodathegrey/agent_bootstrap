"""In-memory workflow run storage (Firestore in production)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from nexus_orchestrator.workflow.models import WorkflowResult, WorkflowRunState


class WorkflowStore:
    """Stores workflow run metadata in memory.

    Swap with a Firestore-backed implementation for production.
    """

    def __init__(self) -> None:
        self._runs: dict[str, dict[str, Any]] = {}

    def create_run(
        self,
        org_id: str,
        workflow_id: str,
        trigger_inputs: dict,
    ) -> str:
        """Create a new workflow run record and return its run_id."""
        run_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        self._runs[run_id] = {
            "run_id": run_id,
            "org_id": org_id,
            "workflow_id": workflow_id,
            "trigger_inputs": trigger_inputs,
            "state": WorkflowRunState.PENDING,
            "result": None,
            "created_at": now,
            "updated_at": now,
        }
        return run_id

    def update_run(
        self,
        run_id: str,
        state: WorkflowRunState,
        result: WorkflowResult | None = None,
    ) -> None:
        """Update the state and optionally the result of a run."""
        run = self._runs.get(run_id)
        if run is None:
            raise KeyError(f"Workflow run not found: {run_id}")
        run["state"] = state
        if result is not None:
            run["result"] = result.model_dump()
        run["updated_at"] = datetime.now(timezone.utc).isoformat()

    def get_run(self, run_id: str) -> dict[str, Any]:
        """Retrieve a workflow run by id."""
        run = self._runs.get(run_id)
        if run is None:
            raise KeyError(f"Workflow run not found: {run_id}")
        return dict(run)

    def list_runs(
        self,
        org_id: str,
        workflow_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """List workflow runs for an org, optionally filtered by workflow_id."""
        results = []
        for run in self._runs.values():
            if run["org_id"] != org_id:
                continue
            if workflow_id and run["workflow_id"] != workflow_id:
                continue
            results.append(dict(run))
        return results
