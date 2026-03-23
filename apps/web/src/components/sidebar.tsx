'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Puzzle,
  Settings,
  LogOut,
} from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '@/stores/auth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Skills', href: '/skills', icon: Puzzle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const handleSignOut = async () => {
    await signOut(getFirebaseAuth());
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--muted)]">
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Bot className="h-6 w-6 text-[var(--primary)]" />
          Nexus
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm">
          <div className="flex-1 truncate">
            <p className="truncate font-medium">{user?.displayName ?? 'User'}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {user?.email ?? ''}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
