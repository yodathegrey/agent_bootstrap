const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  // In production, get the Firebase ID token
  // For now, return empty headers for development
  return {
    'Content-Type': 'application/json',
  };
}

export async function createSession(
  agentId: string,
  inputs?: Record<string, string>,
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/agents/${agentId}/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ agent_id: agentId, inputs }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.statusText}`);
  return res.json();
}

export async function sendMessage(
  sessionId: string,
  content: string,
  onEvent: (event: AgentEvent) => void,
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  });

  if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as AgentEvent;
          onEvent(event);
        } catch {
          // Skip malformed lines
        }
      }
    }
  }
}

export async function getSession(sessionId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, { headers });
  if (!res.ok) throw new Error(`Failed to get session: ${res.statusText}`);
  return res.json();
}

export async function cancelSession(sessionId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`Failed to cancel session: ${res.statusText}`);
  return res.json();
}

export interface AgentEvent {
  type: 'text_delta' | 'tool_use' | 'tool_result' | 'status_update' | 'done' | 'error';
  text?: string;
  tool_id?: string;
  tool_name?: string;
  input?: Record<string, unknown>;
  output?: string;
  state?: string;
  error?: string;
}
