'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken, clearAuthToken, api } from '@/lib/api';
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
  const [categories, setCategories] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Admin vê todas as categorias, mesmo sem parceiros ainda
        if (user.role === 'ADMIN') {
          const data = await api.admin.categories.list();
          setCategories(
            data.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
          );
        } else {
          // USER / PARTNER vê apenas categorias com parceiros
          const data = await api.marketplace.categoriesWithPartners();
          setCategories(
            data.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
          );
        }
      } catch {
        // silencioso: menu continua sem categorias se falhar
      } finally {
        setCategoriesLoaded(true);
      }
    })();
  }, [user]);

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-1">
        <p className="text-primary-2">Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-primary-1">
      <aside className="w-56 shrink-0 border-r border-secondary-2 bg-primary-2 p-4">
        <p className="text-sm font-medium text-primary-1">Comunidade RPM</p>
        <p className="truncate text-xs text-primary-3">
          {user.email}
          {user.role === 'ADMIN' && ' (admin)'}
        </p>
        <nav className="mt-6 space-y-1">
          <Link
            href="/dashboard"
            className={`block rounded-lg px-3 py-2 text-sm ${
              pathname === '/dashboard'
                ? 'bg-primary-3 font-medium text-primary-2'
                : 'text-primary-1 hover:bg-secondary-3'
            }`}
          >
            Início
          </Link>
          {categoriesLoaded &&
            categories.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/category/${c.slug}`}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === `/dashboard/category/${c.slug}`
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                {c.name}
              </Link>
            ))}
          {user.role === 'PARTNER' && (
            <>
              <Link
                href="/dashboard/leads"
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === '/dashboard/leads'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Leads
              </Link>
              <Link
                href="/dashboard/profile"
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === '/dashboard/profile'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Meu perfil
              </Link>
              <Link
                href="/dashboard/services"
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === '/dashboard/services'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Meus serviços
              </Link>
            </>
          )}
          {user.role === 'ADMIN' && (
            <>
              <Link
                href="/dashboard/users"
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === '/dashboard/users'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Users
              </Link>
              <Link
                href="/dashboard/admin-services"
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin-services'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Serviços (admin)
              </Link>
              <Link
                href="/dashboard/categories"
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === '/dashboard/categories'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Categorias
              </Link>
              <Link
                href="/dashboard/partners"
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === '/dashboard/partners'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Parceiros
              </Link>
            </>
          )}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full rounded-lg border border-primary-3 px-3 py-2 text-left text-sm text-primary-1 hover:bg-primary-3 hover:text-primary-2"
        >
          Sair
        </button>
      </aside>
      <main className="flex-1 p-6 text-primary-2">{children}</main>
    </div>
  );
}
