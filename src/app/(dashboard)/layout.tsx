'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken, clearAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading) return;
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!user) {
      clearAuthToken();
      router.replace('/login');
    }
  }, [mounted, authLoading, user, router]);

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-zinc-500">Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-900">Comunidade RPM</p>
        <p className="truncate text-xs text-zinc-500">{user.email}</p>
        <nav className="mt-6 space-y-1">
          <Link
            href="/dashboard"
            className={`block rounded-lg px-3 py-2 text-sm ${
              pathname === '/dashboard'
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Início
          </Link>
        </nav>
        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full rounded-lg border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Sair
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
