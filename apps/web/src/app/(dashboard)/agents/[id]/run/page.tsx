'use client';

import { useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Bot } from 'lucide-react';
import { ChatContainer } from '@/components/chat/chat-container';
import { AgentStatusBadge } from '@/components/agent-status-badge';
import { useSessionStore } from '@/stores/session';
import { createSession } from '@/lib/api';

export default function AgentRunPage() {
  const params = useParams();
  const agentId = params.id as string;
  const { sessionId, state, setSession, setError } = useSessionStore();

  const initSession = useCallback(async () => {
    try {
      const session = await createSession(agentId);
      setSession(session.session_id, agentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  }, [agentId, setSession, setError]);

  useEffect(() => {
    if (!sessionId) {
      initSession();
    }
  }, [sessionId, initSession]);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 text-[var(--primary)]" />
          <h1 className="font-semibold">Agent: {agentId}</h1>
          <AgentStatusBadge state={state} />
        </div>
        {sessionId && (
          <span className="text-xs text-[var(--muted-foreground)]">
            Session: {sessionId}
          </span>
        )}
      </div>

      <div className="flex-1">
        <ChatContainer />
      </div>
    </div>
  );
}
