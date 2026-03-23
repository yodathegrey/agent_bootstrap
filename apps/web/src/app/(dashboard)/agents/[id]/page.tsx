'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, Play, Settings, Clock } from 'lucide-react';

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)]">
            <Bot className="h-6 w-6 text-[var(--primary-foreground)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agent: {agentId}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              View configuration and run history
            </p>
          </div>
        </div>
        <Link
          href={`/agents/${agentId}/run`}
          className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        >
          <Play className="h-4 w-4" />
          Run Agent
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h2 className="font-semibold">Configuration</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Model Preference</span>
              <span>claude-sonnet-4-6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Max Turns</span>
              <span>25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Timeout</span>
              <span>300s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Memory Policy</span>
              <span>summarize-on-close</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h2 className="font-semibold">Recent Runs</h2>
          </div>
          <div className="mt-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              No runs yet. Click &quot;Run Agent&quot; to start a session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
