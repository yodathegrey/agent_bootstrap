import { LLMAdapter } from '../adapter.interface';
import { Config } from '../config';
import { AnthropicAdapter } from './anthropic.adapter';
import { OpenAIAdapter } from './openai.adapter';
import { AzureOpenAIAdapter } from './azure-openai.adapter';
import { VertexGeminiAdapter } from './vertex-gemini.adapter';

export class AdapterRegistry {
  private adapters: Map<string, LLMAdapter> = new Map();

  register(adapter: LLMAdapter): void {
    for (const model of adapter.supportedModels) {
      this.adapters.set(model, adapter);
    }
  }

  resolve(model: string): LLMAdapter {
    const adapter = this.adapters.get(model);
    if (!adapter) {
      throw new Error(
        `No adapter registered for model "${model}". Available models: ${[...this.adapters.keys()].join(', ')}`
      );
    }
    return adapter;
  }

  listModels(): string[] {
    return [...this.adapters.keys()];
  }
}

export function createDefaultRegistry(config: Config): AdapterRegistry {
  const registry = new AdapterRegistry();

  if (config.ANTHROPIC_API_KEY) {
    registry.register(new AnthropicAdapter(config.ANTHROPIC_API_KEY));
  }

  if (config.OPENAI_API_KEY) {
    registry.register(new OpenAIAdapter(config.OPENAI_API_KEY));
  }

  if (config.AZURE_OPENAI_ENDPOINT && config.AZURE_OPENAI_API_KEY) {
    const deployments = config.AZURE_OPENAI_DEPLOYMENTS.split(',').map((d) => d.trim());
    registry.register(
      new AzureOpenAIAdapter(
        config.AZURE_OPENAI_ENDPOINT,
        config.AZURE_OPENAI_API_KEY,
        config.AZURE_OPENAI_API_VERSION,
        deployments,
      ),
    );
  }

  if (config.VERTEX_AI_PROJECT_ID) {
    registry.register(
      new VertexGeminiAdapter(config.VERTEX_AI_PROJECT_ID, config.VERTEX_AI_LOCATION),
    );
  }

  return registry;
}
