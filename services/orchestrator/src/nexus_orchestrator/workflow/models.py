"""Pydantic models for workflow execution."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class WorkflowRunState(str, Enum):
    """State of a workflow run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepResult(BaseModel):
    """Result of a single workflow step execution."""

    step_id: str
    output: str = ""
    status: str = "completed"  # 'completed' | 'failed' | 'skipped'
    duration_ms: int = 0
    error: Optional[str] = None


class WorkflowResult(BaseModel):
    """Aggregate result of a full workflow run."""

    workflow_id: str
    status: str = "completed"  # 'completed' | 'failed' | 'partial'
    steps: list[StepResult] = Field(default_factory=list)
    total_duration_ms: int = 0
    trigger_inputs: dict = Field(default_factory=dict)
