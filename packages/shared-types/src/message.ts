import type { SkillManifest } from './skill.js';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool_result';

export type ContentType = 'text' | 'image' | 'tool_use' | 'tool_result';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: string;
    media_type: string;
    data: string;
  };
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

export type ContentBlock =
  | TextContent
  | ImageContent
  | ToolUseContent
  | ToolResultContent;

export interface CanonicalMessage {
  role: MessageRole;
  content: ContentBlock[];
}

export interface CanonicalRequest {
  messages: CanonicalMessage[];
  tools: SkillManifest[];
  model: string;
  max_tokens: number;
  temperature: number;
}
