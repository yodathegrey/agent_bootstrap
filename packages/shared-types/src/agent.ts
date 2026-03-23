export enum AgentLifecycleState {
  DEFINED = 'DEFINED',
  PROVISIONING = 'PROVISIONING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  COMPLETING = 'COMPLETING',
  ARCHIVED = 'ARCHIVED',
  ERRORED = 'ERRORED',
  CANCELLED = 'CANCELLED',
}

export interface AgentDefinition {
  agent_id: string;
  display_name: string;
  description: string;
  model_preference: string[];
  skills: string[];
  max_turns: number;
  timeout_seconds: number;
  memory_policy: 'summarize-on-close' | 'discard' | 'retain-full';
  rbac_required_role: string;
  platform_constraints: string[];
}
