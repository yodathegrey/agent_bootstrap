'use client';

import { Settings, Users, KeyRound, CreditCard, Shield } from 'lucide-react';

const settingsSections = [
  {
    name: 'Users & Roles',
    description: 'Manage team members and role assignments.',
    icon: Users,
    href: '/settings/users',
  },
  {
    name: 'LLM Providers',
    description: 'Configure API keys for Claude, OpenAI, Azure, and Vertex AI.',
    icon: KeyRound,
    href: '/settings/providers',
  },
  {
    name: 'Billing',
    description: 'Manage subscription, payment methods, and usage.',
    icon: CreditCard,
    href: '/settings/billing',
  },
  {
    name: 'Security & Audit',
    description: 'View audit logs and security settings.',
    icon: Shield,
    href: '/settings/security',
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-[var(--muted-foreground)]">
        Manage your organization configuration.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {settingsSections.map((section) => (
          <a
            key={section.name}
            href={section.href}
            className="rounded-lg border border-[var(--border)] p-4 transition-colors hover:bg-[var(--muted)]"
          >
            <div className="flex items-center gap-3">
              <section.icon className="h-5 w-5 text-[var(--primary)]" />
              <h3 className="font-semibold">{section.name}</h3>
            </div>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {section.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
