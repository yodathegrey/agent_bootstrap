import OpenAI from 'openai';
import { LLMAdapter } from '../adapter.interface';
import {
  CanonicalRequest,
  StreamChunk,
  CanonicalMessage,
  ContentBlock,
} from '../types';

/**
 * Azure OpenAI adapter — uses the same SDK as OpenAI but configured
 * with Azure-specific endpoint and API version.
 */
export class AzureOpenAIAdapter implements LLMAdapter {
  readonly provider = 'azure-openai';
  readonly supportedModels: string[];

  private client: OpenAI;

  constructor(
    endpoint: string,
    apiKey: string,
    apiVersion: string = '2024-10-01-preview',
    deployments: string[] = ['gpt-4o'],
  ) {
    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    });
    this.supportedModels = deployments.map((d) => `azure/${d}`);
  }

  async *sendMessage(request: CanonicalRequest): AsyncIterable<StreamChunk> {
    // Strip azure/ prefix for the deployment name
    const deploymentModel = request.model.replace('azure/', '');
    const messages = request.messages.map((m) => this.toMessage(m));

    const tools = request.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: deploymentModel,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      messages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    try {
      const stream = await this.client.chat.completions.create(params);

      let inputTokens = 0;
      let outputTokens = 0;
      const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        if (!choice) {
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens;
            outputTokens = chunk.usage.completion_tokens;
          }
          continue;
        }

        const delta = choice.delta;

        if (delta?.content) {
          yield { type: 'text_delta', text: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCalls.has(idx)) {
              toolCalls.set(idx, { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' });
            }
            const existing = toolCalls.get(idx)!;
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.args += tc.function.arguments;
          }
        }

        if (choice.finish_reason) {
          for (const [, tc] of toolCalls) {
            let parsedInput: Record<string, unknown> = {};
            try { parsedInput = JSON.parse(tc.args); } catch { /* empty */ }
            yield { type: 'tool_use', tool_id: tc.id, tool_name: tc.name, input: parsedInput };
          }

          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens;
            outputTokens = chunk.usage.completion_tokens;
          }

          yield { type: 'done', usage: { input_tokens: inputTokens, output_tokens: outputTokens } };
        }
      }
    } catch (err) {
      yield {
        type: 'error',
        error: err instanceof Error ? err.message : 'Azure OpenAI request failed',
      };
    }
  }

  private toMessage(msg: CanonicalMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    const textContent = msg.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    if (msg.role === 'system') return { role: 'system', content: textContent };
    if (msg.role === 'user') return { role: 'user', content: textContent };

    if (msg.role === 'assistant') {
      const toolUseParts = msg.content.filter(
        (c): c is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
          c.type === 'tool_use',
      );
      const result: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content: textContent || null,
      };
      if (toolUseParts.length > 0) {
        result.tool_calls = toolUseParts.map((t) => ({
          id: t.id,
          type: 'function' as const,
          function: { name: t.name, arguments: JSON.stringify(t.input) },
        }));
      }
      return result;
    }

    if (msg.role === 'tool_result') {
      const toolResults = msg.content.filter(
        (c): c is { type: 'tool_result'; tool_use_id: string; content: string } =>
          c.type === 'tool_result',
      );
      if (toolResults.length > 0) {
        return { role: 'tool', tool_call_id: toolResults[0].tool_use_id, content: toolResults[0].content };
      }
    }

    return { role: 'user', content: '' };
  }
}
