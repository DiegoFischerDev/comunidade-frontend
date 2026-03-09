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
      <div className="flex min-h-screen items-center justify-center bg-primary-1">
        <p className="text-secondary-3">Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-primary-1">
      <aside className="w-56 shrink-0 border-r border-secondary-2 bg-primary-1 p-4">
        <p className="text-sm font-medium text-primary-2">Comunidade RPM</p>
        <p className="truncate text-xs text-secondary-3/80">{user.email}</p>
        <nav className="mt-6 space-y-1">
          <Link
            href="/dashboard"
            className={`block rounded-lg px-3 py-2 text-sm ${
              pathname === '/dashboard'
                ? 'bg-primary-3 font-medium text-primary-2'
                : 'text-secondary-3 hover:bg-secondary-2'
            }`}
          >
            Início
          </Link>
        </nav>
        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full rounded-lg border border-secondary-2 px-3 py-2 text-left text-sm text-secondary-3 hover:bg-secondary-2"
        >
          Sair
        </button>
      </aside>
      <main className="flex-1 p-6 text-primary-2">{children}</main>
    </div>
  );
}
