import OpenAI from 'openai';
import { LLMAdapter } from '../adapter.interface';
import {
  CanonicalRequest,
  StreamChunk,
  CanonicalMessage,
  ContentBlock,
} from '../types';

export class OpenAIAdapter implements LLMAdapter {
  readonly provider = 'openai';
  readonly supportedModels = ['gpt-4o', 'o3', 'o4-mini'];

  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *sendMessage(request: CanonicalRequest): AsyncIterable<StreamChunk> {
    const messages = request.messages.map((m) => this.toOpenAIMessage(m));

    const tools = request.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: request.model,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      messages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    const stream = await this.client.chat.completions.create(params);

    let inputTokens = 0;
    let outputTokens = 0;
    const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) {
        // Usage-only chunk at the end
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
        continue;
      }

      const delta = choice.delta;

      // Text content
      if (delta?.content) {
        yield {
          type: 'text_delta',
          text: delta.content,
        };
      }

      // Tool calls
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

      // Finish reason
      if (choice.finish_reason) {
        // Emit accumulated tool calls
        for (const [, tc] of toolCalls) {
          let parsedInput: Record<string, unknown> = {};
          try {
            parsedInput = JSON.parse(tc.args);
          } catch {
            // leave as empty object
          }
          yield {
            type: 'tool_use',
            tool_id: tc.id,
            tool_name: tc.name,
            input: parsedInput,
          };
        }

        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }

        yield {
          type: 'done',
          usage: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          },
        };
      }
    }
  }

  private toOpenAIMessage(
    msg: CanonicalMessage
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    if (msg.role === 'system') {
      const text = msg.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
      return { role: 'system', content: text };
    }

    if (msg.role === 'user') {
      const text = msg.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
      return { role: 'user', content: text };
    }

    if (msg.role === 'assistant') {
      return this.toOpenAIAssistantMessage(msg.content);
    }

    if (msg.role === 'tool_result') {
      // Each tool_result content block becomes a separate tool message
      const toolResults = msg.content.filter(
        (c): c is { type: 'tool_result'; tool_use_id: string; content: string } =>
          c.type === 'tool_result'
      );
      // OpenAI expects individual tool messages; return the first one
      // (caller should flatten if multiple)
      if (toolResults.length > 0) {
        return {
          role: 'tool',
          tool_call_id: toolResults[0].tool_use_id,
          content: toolResults[0].content,
        };
      }
      return { role: 'user', content: '' };
    }

    return { role: 'user', content: '' };
  }

  private toOpenAIAssistantMessage(
    content: ContentBlock[]
  ): OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam {
    const textParts = content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text);

    const toolUseParts = content.filter(
      (c): c is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        c.type === 'tool_use'
    );

    const msg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
      role: 'assistant',
      content: textParts.join('\n') || null,
    };

    if (toolUseParts.length > 0) {
      msg.tool_calls = toolUseParts.map((t) => ({
        id: t.id,
        type: 'function' as const,
        function: {
          name: t.name,
          arguments: JSON.stringify(t.input),
        },
      }));
    }

    return msg;
  }
}
