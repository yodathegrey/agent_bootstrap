'use client';

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ChatMessage } from '@/stores/session';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-[var(--primary-foreground)]" />
        ) : (
          <Bot className="h-4 w-4 text-[var(--foreground)]" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2 text-sm',
          isUser
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'bg-[var(--muted)] text-[var(--foreground)]',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
