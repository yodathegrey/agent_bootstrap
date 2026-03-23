import { PubSub } from '@google-cloud/pubsub';
import pino from 'pino';
import { Config } from './config';

const logger = pino({ name: 'cost-tracker' });

export class CostTrackerService {
  private pubsub: PubSub | null = null;
  private topic: string;

  constructor(private config: Config) {
    this.topic = config.PUBSUB_USAGE_TOPIC;

    if (config.GCP_PROJECT_ID) {
      this.pubsub = new PubSub({ projectId: config.GCP_PROJECT_ID });
    }
  }

  async trackUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    orgId?: string
  ): Promise<void> {
    const event = {
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      org_id: orgId ?? 'default',
      timestamp: new Date().toISOString(),
    };

    logger.info(event, 'Usage tracked');

    if (this.pubsub) {
      try {
        const topic = this.pubsub.topic(this.topic);
        await topic.publishMessage({
          data: Buffer.from(JSON.stringify(event)),
        });
        logger.debug({ topic: this.topic }, 'Usage event published to Pub/Sub');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ error: message }, 'Failed to publish usage event to Pub/Sub');
      }
    }
  }
}
