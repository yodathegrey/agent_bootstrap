import { LLMAdapter } from '../adapter.interface';
import { CanonicalRequest, StreamChunk, CanonicalMessage } from '../types';

/**
 * Vertex AI Gemini adapter — uses the REST API for streaming.
 * Requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION env vars,
 * and Application Default Credentials for auth.
 */
export class VertexGeminiAdapter implements LLMAdapter {
  readonly provider = 'vertex-ai';
  readonly supportedModels = ['gemini-2.5-pro', 'gemini-2.5-flash'];

  private projectId: string;
  private location: string;

  constructor(projectId: string, location: string = 'us-central1') {
    this.projectId = projectId;
    this.location = location;
  }

  async *sendMessage(request: CanonicalRequest): AsyncIterable<StreamChunk> {
    const model = request.model;
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:streamGenerateContent`;

    const geminiRequest = this.toGeminiRequest(request);

    try {
      // Get access token from Application Default Credentials
      const tokenResponse = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } },
      );

      let accessToken: string;
      if (tokenResponse.ok) {
        const tokenData = (await tokenResponse.json()) as { access_token: string };
        accessToken = tokenData.access_token;
      } else {
        // Fallback: try gcloud CLI token for local dev
        const { execSync } = await import('child_process');
        try {
          accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
        } catch {
          yield { type: 'error', error: 'Vertex AI: No credentials available. Run `gcloud auth login` or deploy to GCP.' };
          return;
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield { type: 'error', error: `Vertex AI error ${response.status}: ${errorText}` };
        return;
      }

      // Vertex AI returns a JSON array of response chunks
      const responseData = (await response.json()) as GeminiStreamResponse[];

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (const chunk of responseData) {
        for (const candidate of chunk.candidates || []) {
          for (const part of candidate.content?.parts || []) {
            if (part.text) {
              yield { type: 'text_delta', text: part.text };
            }
            if (part.functionCall) {
              yield {
                type: 'tool_use',
                tool_id: `fc_${Date.now()}`,
                tool_name: part.functionCall.name,
                input: part.functionCall.args || {},
              };
            }
          }
        }

        if (chunk.usageMetadata) {
          totalInputTokens = chunk.usageMetadata.promptTokenCount || 0;
          totalOutputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
        }
      }

      yield {
        type: 'done',
        usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
      };
    } catch (err) {
      yield {
        type: 'error',
        error: err instanceof Error ? err.message : 'Vertex AI Gemini request failed',
      };
    }
  }

  private toGeminiRequest(request: CanonicalRequest): GeminiRequest {
    const contents: GeminiContent[] = [];
    let systemInstruction: GeminiContent | undefined;

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        const text = msg.content
          .filter((c) => c.type === 'text')
          .map((c) => (c as { type: 'text'; text: string }).text)
          .join('\n');
        systemInstruction = { role: 'user', parts: [{ text }] };
      } else if (msg.role === 'user') {
        const text = msg.content
          .filter((c) => c.type === 'text')
          .map((c) => (c as { type: 'text'; text: string }).text)
          .join('\n');
        contents.push({ role: 'user', parts: [{ text }] });
      } else if (msg.role === 'assistant') {
        const parts: GeminiPart[] = [];
        for (const c of msg.content) {
          if (c.type === 'text') parts.push({ text: (c as { type: 'text'; text: string }).text });
          if (c.type === 'tool_use') {
            const tu = c as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
            parts.push({ functionCall: { name: tu.name, args: tu.input } });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool_result') {
        const parts: GeminiPart[] = [];
        for (const c of msg.content) {
          if (c.type === 'tool_result') {
            const tr = c as { type: 'tool_result'; tool_use_id: string; content: string };
            parts.push({ functionResponse: { name: tr.tool_use_id, response: { result: tr.content } } });
          }
        }
        contents.push({ role: 'user', parts });
      }
    }

    const result: GeminiRequest = {
      contents,
      generationConfig: {
        maxOutputTokens: request.max_tokens,
        temperature: request.temperature,
      },
    };

    if (systemInstruction) {
      result.systemInstruction = systemInstruction;
    }

    if (request.tools && request.tools.length > 0) {
      result.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          })),
        },
      ];
    }

    return result;
  }
}

// Gemini API types
interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: { result: string } };
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: { maxOutputTokens: number; temperature: number };
  systemInstruction?: GeminiContent;
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  }>;
}

interface GeminiStreamResponse {
  candidates?: Array<{
    content?: { parts: GeminiPart[] };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}
