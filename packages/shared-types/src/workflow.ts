export interface WorkflowStep {
  id: string;
  agent: string;
  inputs: Record<string, string>;
  depends_on: string[];
  parallel_with?: string;
}

export type WorkflowTrigger = 'manual' | 'api' | 'schedule';

export interface WorkflowDefinition {
  id: string;
  org_id: string;
  display_name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
}
