export type SubscriptionTier = 'starter' | 'team' | 'enterprise';

export interface BillingState {
  org_id: string;
  tier: SubscriptionTier;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  usage: {
    agent_runs: number;
    llm_tokens: number;
    active_users: number;
  };
  limits: {
    max_agent_runs: number;
    max_llm_tokens: number;
    max_users: number;
    max_agents: number;
  };
}
