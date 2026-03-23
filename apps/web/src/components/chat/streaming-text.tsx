'use client';

import { Bot } from 'lucide-react';

export function StreamingText({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)]">
        <Bot className="h-4 w-4 text-[var(--foreground)]" />
      </div>
      <div className="max-w-[80%] rounded-lg bg-[var(--muted)] px-4 py-2 text-sm">
        <p className="whitespace-pre-wrap">{text}</p>
        <span className="inline-block h-4 w-1 animate-pulse bg-[var(--foreground)]" />
      </div>
    </div>
  );
}
