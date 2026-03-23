import { Injectable, Logger } from '@nestjs/common';

export interface WorkflowInfo {
  id: string;
  org_id: string;
  display_name: string;
  description: string;
  trigger: string;
  steps: Array<{
    id: string;
    agent: string;
    inputs?: Record<string, string>;
    depends_on?: string[];
    parallel_with?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunInfo {
  run_id: string;
  workflow_id: string;
  org_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  trigger_inputs: Record<string, string>;
  steps: Array<{
    step_id: string;
    status: string;
    output?: string;
    error?: string;
    duration_ms?: number;
  }>;
  started_at: string;
  completed_at?: string;
}

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);
  private workflows = new Map<string, WorkflowInfo>();
  private runs = new Map<string, WorkflowRunInfo>();
  private counter = 0;

  async createWorkflow(data: Partial<WorkflowInfo>, orgId: string): Promise<WorkflowInfo> {
    const id = `wf_${Date.now()}_${++this.counter}`;
    const workflow: WorkflowInfo = {
      id,
      org_id: orgId,
      display_name: data.display_name || 'Untitled Workflow',
      description: data.description || '',
      trigger: data.trigger || 'manual',
      steps: data.steps || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.workflows.set(id, workflow);
    this.logger.log(`Created workflow ${id}`);
    return workflow;
  }

  async listWorkflows(orgId: string): Promise<WorkflowInfo[]> {
    return [...this.workflows.values()].filter((w) => w.org_id === orgId);
  }

  async getWorkflow(id: string): Promise<WorkflowInfo | null> {
    return this.workflows.get(id) || null;
  }

  async updateWorkflow(id: string, data: Partial<WorkflowInfo>): Promise<WorkflowInfo | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;
    Object.assign(workflow, data, { updated_at: new Date().toISOString() });
    return workflow;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    return this.workflows.delete(id);
  }

  async runWorkflow(
    workflowId: string,
    orgId: string,
    inputs: Record<string, string>,
  ): Promise<WorkflowRunInfo> {
    const workflow = this.workflows.get(workflowId);
    const runId = `run_${Date.now()}_${++this.counter}`;

    // TODO: In production, delegate to Orchestrator's WorkflowEngine via gRPC
    const run: WorkflowRunInfo = {
      run_id: runId,
      workflow_id: workflowId,
      org_id: orgId,
      status: 'completed',
      trigger_inputs: inputs,
      steps: (workflow?.steps || []).map((s) => ({
        step_id: s.id,
        status: 'completed',
        output: `Stub output for step ${s.id}`,
        duration_ms: 100,
      })),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    this.runs.set(runId, run);
    this.logger.log(`Executed workflow run ${runId} for ${workflowId}`);
    return run;
  }

  async listRuns(workflowId: string): Promise<WorkflowRunInfo[]> {
    return [...this.runs.values()].filter((r) => r.workflow_id === workflowId);
  }

  async getRun(runId: string): Promise<WorkflowRunInfo | null> {
    return this.runs.get(runId) || null;
  }
}
