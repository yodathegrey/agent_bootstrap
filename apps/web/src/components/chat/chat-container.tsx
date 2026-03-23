'use client';

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/session';
import { MessageBubble } from './message-bubble';
import { StreamingText } from './streaming-text';
import { ChatInput } from './chat-input';
import { sendMessage } from '@/lib/api';

export function ChatContainer() {
  const {
    sessionId,
    messages,
    isStreaming,
    currentStreamText,
    error,
    addUserMessage,
    handleEvent,
    setStreaming,
    setError,
  } = useSessionStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamText]);

  const handleSend = async (content: string) => {
    if (!sessionId) return;

    addUserMessage(content);
    setStreaming(true);
    setError(null);

    try {
      await sendMessage(sessionId, content, handleEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Send a message to begin interacting with the agent.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && <StreamingText text={currentStreamText} />}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-[var(--destructive)] dark:bg-red-950">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] p-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={handleSend} disabled={isStreaming || !sessionId} />
        </div>
      </div>
    </div>
  );
}
