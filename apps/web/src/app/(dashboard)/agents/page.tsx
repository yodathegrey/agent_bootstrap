'use client';

import { Bot, Plus } from 'lucide-react';

export default function AgentsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Define, configure, and manage your AI agents.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
          <Plus className="h-4 w-4" />
          New Agent
        </button>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] p-12">
        <Bot className="h-12 w-12 text-[var(--muted-foreground)]" />
        <h3 className="mt-4 font-semibold">No agents yet</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Create your first agent to start automating workflows.
        </p>
      </div>
    </div>
  );
}
