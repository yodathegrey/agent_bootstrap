export interface Config {
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  AZURE_OPENAI_ENDPOINT: string;
  AZURE_OPENAI_API_KEY: string;
  AZURE_OPENAI_API_VERSION: string;
  AZURE_OPENAI_DEPLOYMENTS: string;
  VERTEX_AI_PROJECT_ID: string;
  VERTEX_AI_LOCATION: string;
  PORT: number;
  GCP_PROJECT_ID: string;
  PUBSUB_USAGE_TOPIC: string;
}

export function loadConfig(): Config {
  return {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT ?? '',
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ?? '',
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-01-preview',
    AZURE_OPENAI_DEPLOYMENTS: process.env.AZURE_OPENAI_DEPLOYMENTS ?? 'gpt-4o',
    VERTEX_AI_PROJECT_ID: process.env.VERTEX_AI_PROJECT_ID ?? '',
    VERTEX_AI_LOCATION: process.env.VERTEX_AI_LOCATION ?? 'us-central1',
    PORT: parseInt(process.env.PORT ?? '3001', 10),
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ?? '',
    PUBSUB_USAGE_TOPIC: process.env.PUBSUB_USAGE_TOPIC ?? 'usage-events',
  };
}
