'use client';

import { cn } from '@/lib/cn';

const stateColors: Record<string, string> = {
  DEFINED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PROVISIONING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  READY: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  COMPLETING: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  ERRORED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  IDLE: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export function AgentStatusBadge({ state }: { state: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        stateColors[state] || stateColors.IDLE,
      )}
    >
      {state}
    </span>
  );
}
