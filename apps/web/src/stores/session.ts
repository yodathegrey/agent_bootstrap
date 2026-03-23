import { create } from 'zustand';
import type { AgentEvent } from '@/lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUses?: Array<{
    tool_id: string;
    tool_name: string;
    input: Record<string, unknown>;
    output?: string;
    is_error?: boolean;
  }>;
  timestamp: string;
}

interface SessionState {
  sessionId: string | null;
  agentId: string | null;
  state: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamText: string;
  error: string | null;

  setSession: (sessionId: string, agentId: string) => void;
  addUserMessage: (content: string) => void;
  handleEvent: (event: AgentEvent) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  agentId: null,
  state: 'IDLE',
  messages: [],
  isStreaming: false,
  currentStreamText: '',
  error: null,

  setSession: (sessionId, agentId) =>
    set({ sessionId, agentId, state: 'READY', messages: [], error: null }),

  addUserMessage: (content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `msg_${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  handleEvent: (event) => {
    const state = get();

    switch (event.type) {
      case 'text_delta':
        set({ currentStreamText: state.currentStreamText + (event.text || '') });
        break;

      case 'tool_use':
        // Add tool use to current streaming context
        break;

      case 'status_update':
        set({ state: event.state || state.state });
        break;

      case 'done': {
        const streamText = get().currentStreamText;
        if (streamText) {
          set((s) => ({
            messages: [
              ...s.messages,
              {
                id: `msg_${Date.now()}`,
                role: 'assistant',
                content: streamText,
                timestamp: new Date().toISOString(),
              },
            ],
            currentStreamText: '',
            isStreaming: false,
          }));
        } else {
          set({ isStreaming: false });
        }
        break;
      }

      case 'error':
        set({ error: event.error || 'Unknown error', isStreaming: false });
        break;
    }
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      sessionId: null,
      agentId: null,
      state: 'IDLE',
      messages: [],
      isStreaming: false,
      currentStreamText: '',
      error: null,
    }),
}));
