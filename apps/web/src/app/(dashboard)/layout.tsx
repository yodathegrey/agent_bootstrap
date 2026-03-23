'use client';

import { Sidebar } from '@/components/sidebar';
import { useAuthStore } from '@/stores/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null; // AuthProvider will redirect to /login
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
