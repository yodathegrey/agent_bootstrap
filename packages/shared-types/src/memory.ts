export interface TurnSummary {
  role: string;
  summary: string;
}

export interface KernelMemory {
  session_id: string;
  agent_id: string;
  scratchpad: string;
  turn_history: TurnSummary[];
  metadata: {
    created_at: string;
    last_active: string;
    token_budget_remaining: number;
  };
}

export interface LongTermMemory {
  memory_id: string;
  agent_id: string;
  user_id: string;
  summary: string;
  embedding: number[];
  tags: string[];
  created_at: string;
  ttl: number;
}
