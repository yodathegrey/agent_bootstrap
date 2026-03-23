import { getConfig, getAuthHeaders } from "./config.js";

function getBaseUrl(): string {
  return getConfig().api_url;
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...extra,
  };
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T = unknown>(
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T = unknown>(
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function streamSSE(
  path: string,
  body: unknown,
  onEvent: (event: { type: string; data: string }) => void
): Promise<void> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...buildHeaders(),
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} SSE failed (${res.status}): ${text}`);
  }

  if (!res.body) {
    throw new Error("No response body for SSE stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventType = "message";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        currentEventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        onEvent({ type: currentEventType, data });
        currentEventType = "message";
      }
      // Ignore comments and empty lines
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    if (buffer.startsWith("data:")) {
      const data = buffer.slice(5).trim();
      onEvent({ type: currentEventType, data });
    }
  }
}
