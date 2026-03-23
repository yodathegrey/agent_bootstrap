import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { createStripeClient } from '../config/stripe.config';

interface UsageRecord {
  agentRuns: number;
  llmTokens: number;
  periodStart: Date;
}

export interface UsageAlert {
  threshold: number;
  metric: string;
  current: number;
  limit: number;
  message: string;
}

// Default limits per billing period
const DEFAULT_LIMITS = {
  agentRuns: 1000,
  llmTokens: 1_000_000,
};

@Injectable()
export class UsageService implements OnModuleInit {
  private readonly logger = new Logger(UsageService.name);
  private stripe: Stripe | null = null;

  // In-memory usage tracking: orgId -> usage record
  private readonly usageStore = new Map<string, UsageRecord>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.stripe = createStripeClient();
  }

  recordUsage(orgId: string, agentRuns: number, llmTokens: number): UsageRecord {
    const existing = this.usageStore.get(orgId);
    const record: UsageRecord = {
      agentRuns: (existing?.agentRuns || 0) + agentRuns,
      llmTokens: (existing?.llmTokens || 0) + llmTokens,
      periodStart: existing?.periodStart || new Date(),
    };
    this.usageStore.set(orgId, record);
    this.logger.log(
      `Recorded usage for org ${orgId}: +${agentRuns} runs, +${llmTokens} tokens`,
    );
    return record;
  }

  getUsage(orgId: string): UsageRecord {
    return (
      this.usageStore.get(orgId) || {
        agentRuns: 0,
        llmTokens: 0,
        periodStart: new Date(),
      }
    );
  }

  checkThresholds(orgId: string): UsageAlert[] {
    const usage = this.getUsage(orgId);
    const alerts: UsageAlert[] = [];
    const thresholds = [50, 80, 100];

    for (const threshold of thresholds) {
      const agentRunPct =
        (usage.agentRuns / DEFAULT_LIMITS.agentRuns) * 100;
      if (agentRunPct >= threshold) {
        alerts.push({
          threshold,
          metric: 'agentRuns',
          current: usage.agentRuns,
          limit: DEFAULT_LIMITS.agentRuns,
          message: `Agent runs at ${Math.round(agentRunPct)}% of limit (${usage.agentRuns}/${DEFAULT_LIMITS.agentRuns})`,
        });
      }

      const tokenPct =
        (usage.llmTokens / DEFAULT_LIMITS.llmTokens) * 100;
      if (tokenPct >= threshold) {
        alerts.push({
          threshold,
          metric: 'llmTokens',
          current: usage.llmTokens,
          limit: DEFAULT_LIMITS.llmTokens,
          message: `LLM tokens at ${Math.round(tokenPct)}% of limit (${usage.llmTokens}/${DEFAULT_LIMITS.llmTokens})`,
        });
      }
    }

    return alerts;
  }

  async reportToStripe(orgId: string): Promise<void> {
    const usage = this.getUsage(orgId);
    this.logger.log(
      `Reporting usage to Stripe for org ${orgId}: ${usage.agentRuns} runs, ${usage.llmTokens} tokens`,
    );

    // Report usage to Stripe via subscription items
    // This requires a metered subscription item ID
    // In production, you would look up the subscription item and report usage
    // Example:
    // await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    //   quantity: usage.agentRuns,
    //   timestamp: Math.floor(Date.now() / 1000),
    //   action: 'set',
    // });
  }

  resetUsage(orgId: string): void {
    this.usageStore.set(orgId, {
      agentRuns: 0,
      llmTokens: 0,
      periodStart: new Date(),
    });
    this.logger.log(`Usage counters reset for org ${orgId}`);
  }
}
