'use client';

import { Bot, GitBranch, Puzzle, Activity } from 'lucide-react';

const stats = [
  { name: 'Active Agents', value: '0', icon: Bot },
  { name: 'Workflows', value: '0', icon: GitBranch },
  { name: 'Skills Installed', value: '0', icon: Puzzle },
  { name: 'Runs Today', value: '0', icon: Activity },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-[var(--muted-foreground)]">
        Welcome to Nexus. Monitor your agents, workflows, and system health.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4"
          >
            <div className="flex items-center gap-3">
              <stat.icon className="h-5 w-5 text-[var(--primary)]" />
              <span className="text-sm text-[var(--muted-foreground)]">{stat.name}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-[var(--border)] p-6">
        <h2 className="font-semibold">Recent Activity</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          No agent activity yet. Create your first agent to get started.
        </p>
      </div>
    </div>
  );
}
