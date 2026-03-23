'use client';

import { useState } from 'react';
import { Puzzle, Download, Trash2, Search, CheckCircle, AlertCircle } from 'lucide-react';

interface SkillInfo {
  skill_id: string;
  version: string;
  display_name: string;
  description: string;
  author: string;
  runtime: string;
  platforms: string[];
  permissions: string[];
  installed: boolean;
}

const coreSkills: SkillInfo[] = [
  {
    skill_id: 'web-search',
    version: '1.0.0',
    display_name: 'Web Search',
    description: 'Performs web searches and returns summarized results via SerpAPI.',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos', 'windows'],
    permissions: ['network:outbound'],
    installed: true,
  },
  {
    skill_id: 'file-reader',
    version: '1.0.0',
    display_name: 'File Reader',
    description: 'Reads and parses local files (TXT, JSON, CSV).',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos', 'windows'],
    permissions: ['filesystem:read'],
    installed: true,
  },
  {
    skill_id: 'doc-summarizer',
    version: '1.0.0',
    display_name: 'Document Summarizer',
    description: 'Summarizes long documents using the configured LLM.',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos', 'windows'],
    permissions: ['network:outbound'],
    installed: true,
  },
  {
    skill_id: 'shell-exec',
    version: '1.0.0',
    display_name: 'Shell Execute',
    description: 'Executes allow-listed shell commands in a sandboxed subprocess.',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos', 'windows'],
    permissions: ['shell:execute'],
    installed: true,
  },
  {
    skill_id: 'http-client',
    version: '1.0.0',
    display_name: 'HTTP Client',
    description: 'Makes authenticated HTTP requests to approved endpoints.',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos', 'windows'],
    permissions: ['network:outbound'],
    installed: true,
  },
  {
    skill_id: 'email-send',
    version: '1.0.0',
    display_name: 'Email Send',
    description: 'Draft and send emails via SMTP.',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos', 'windows'],
    permissions: ['email:send'],
    installed: false,
  },
  {
    skill_id: 'calendar-manage',
    version: '1.0.0',
    display_name: 'Calendar Manager',
    description: 'Read/create calendar events via Google/Microsoft Calendar APIs.',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos', 'windows'],
    permissions: ['calendar:read', 'calendar:write'],
    installed: false,
  },
  {
    skill_id: 'code-interpreter',
    version: '1.0.0',
    display_name: 'Code Interpreter',
    description: 'Execute Python/JS code in an isolated sandbox.',
    author: 'nexus-core',
    runtime: 'python',
    platforms: ['linux', 'macos'],
    permissions: ['code:execute'],
    installed: false,
  },
];

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillInfo[]>(coreSkills);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstalled, setFilterInstalled] = useState<'all' | 'installed' | 'available'>('all');

  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterInstalled === 'all' ||
      (filterInstalled === 'installed' && s.installed) ||
      (filterInstalled === 'available' && !s.installed);
    return matchesSearch && matchesFilter;
  });

  const toggleInstall = (skillId: string) => {
    setSkills(
      skills.map((s) =>
        s.skill_id === skillId ? { ...s, installed: !s.installed } : s,
      ),
    );
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Skills Marketplace</h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Browse, install, and manage agent skills.
        </p>
      </div>

      <div className="mt-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={filterInstalled}
          onChange={(e) => setFilterInstalled(e.target.value as 'all' | 'installed' | 'available')}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        >
          <option value="all">All Skills</option>
          <option value="installed">Installed</option>
          <option value="available">Available</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSkills.map((skill) => (
          <div
            key={skill.skill_id}
            className="rounded-lg border border-[var(--border)] p-4 transition-colors hover:bg-[var(--muted)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Puzzle className="h-5 w-5 text-[var(--primary)]" />
                <h3 className="font-semibold">{skill.display_name}</h3>
              </div>
              {skill.installed ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Installed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                  <AlertCircle className="h-3 w-3" />
                  Available
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {skill.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-1">
              {skill.platforms.map((p) => (
                <span
                  key={p}
                  className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs text-[var(--muted-foreground)]"
                >
                  {p}
                </span>
              ))}
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                {skill.runtime}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>v{skill.version} · {skill.author}</span>
              <button
                onClick={() => toggleInstall(skill.skill_id)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                  skill.installed
                    ? 'text-[var(--destructive)] hover:bg-red-50 dark:hover:bg-red-950'
                    : 'text-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-950'
                }`}
              >
                {skill.installed ? (
                  <>
                    <Trash2 className="h-3 w-3" />
                    Uninstall
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3" />
                    Install
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] p-12">
          <Puzzle className="h-12 w-12 text-[var(--muted-foreground)]" />
          <h3 className="mt-4 font-semibold">No skills found</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Try adjusting your search or filter.
          </p>
        </div>
      )}
    </div>
  );
}
