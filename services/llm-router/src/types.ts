export interface StreamChunk {
  type: 'text_delta' | 'tool_use' | 'tool_result' | 'done' | 'error';
  text?: string;
  tool_id?: string;
  tool_name?: string;
  input?: Record<string, unknown>;
  output?: string;
  is_error?: boolean;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export interface CanonicalMessage {
  role: 'system' | 'user' | 'assistant' | 'tool_result';
  content: ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface CanonicalRequest {
  messages: CanonicalMessage[];
  tools?: ToolDefinition[];
  model: string;
  max_tokens: number;
  temperature: number;
}
