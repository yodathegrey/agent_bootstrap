import Anthropic from '@anthropic-ai/sdk';
import { LLMAdapter } from '../adapter.interface';
import { CanonicalRequest, StreamChunk, CanonicalMessage, ContentBlock } from '../types';

export class AnthropicAdapter implements LLMAdapter {
  readonly provider = 'anthropic';
  readonly supportedModels = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'];

  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *sendMessage(request: CanonicalRequest): AsyncIterable<StreamChunk> {
    const { systemText, messages } = this.extractSystemAndMessages(request.messages);

    const tools = request.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Messages.Tool.InputSchema,
    }));

    const anthropicMessages = messages.map((msg) => this.toAnthropicMessage(msg));

    const streamParams: Anthropic.Messages.MessageCreateParamsStreaming = {
      model: request.model,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      messages: anthropicMessages,
      stream: true,
    };

    if (systemText) {
      streamParams.system = systemText;
    }

    if (tools && tools.length > 0) {
      streamParams.tools = tools;
    }

    const stream = this.client.messages.stream(streamParams);

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          yield {
            type: 'tool_use',
            tool_id: block.id,
            tool_name: block.name,
            input: {},
          };
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          yield {
            type: 'text_delta',
            text: delta.text,
          };
        } else if (delta.type === 'input_json_delta') {
          // Tool input comes as JSON deltas; we yield as text_delta for the caller to accumulate
          yield {
            type: 'text_delta',
            text: delta.partial_json,
          };
        }
      } else if (event.type === 'message_delta') {
        if (event.usage) {
          outputTokens = event.usage.output_tokens;
        }
      } else if (event.type === 'message_start') {
        if (event.message.usage) {
          inputTokens = event.message.usage.input_tokens;
        }
      } else if (event.type === 'message_stop') {
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

  private extractSystemAndMessages(
    messages: CanonicalMessage[]
  ): { systemText: string | undefined; messages: CanonicalMessage[] } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const systemText = systemMessages
      .flatMap((m) =>
        m.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
      )
      .join('\n');

    return {
      systemText: systemText || undefined,
      messages: nonSystemMessages,
    };
  }

  private toAnthropicMessage(
    msg: CanonicalMessage
  ): Anthropic.Messages.MessageParam {
    const role = msg.role === 'tool_result' ? 'user' : msg.role;

    const content = msg.content.map((block) => this.toAnthropicBlock(block));

    return {
      role: role as 'user' | 'assistant',
      content,
    };
  }

  private toAnthropicBlock(
    block: ContentBlock
  ): Anthropic.Messages.ContentBlockParam {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text };
      case 'tool_use':
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        };
      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: block.content,
        };
    }
  }
}
