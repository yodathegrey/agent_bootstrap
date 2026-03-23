import { CanonicalRequest, StreamChunk } from './types';

export interface LLMAdapter {
  readonly provider: string;
  readonly supportedModels: string[];
  sendMessage(request: CanonicalRequest): AsyncIterable<StreamChunk>;
}
