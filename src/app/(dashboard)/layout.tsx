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
  const { user, logout, loading: authLoading, login, register } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerWhatsapp, setRegisterWhatsapp] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [categories, setCategories] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading) return;
    (async () => {
      try {
        // Menu lateral deve mostrar apenas categorias que existem e têm parceiros associados
        const data = await api.marketplace.categoriesWithPartners();
        setCategories(
          data.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
        );
      } catch {
        // silencioso: menu continua sem categorias se falhar
      } finally {
        setCategoriesLoaded(true);
      }
    })();
  }, [mounted, authLoading, user]);

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-1">
        <p className="text-primary-2">Carregando…</p>
      </div>
    );
  }

  const rawName = user?.name?.trim() ?? '';
  const firstName = rawName.split(' ')[0] || 'Visitante';
  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Admin'
      : user?.role === 'PARTNER'
        ? 'Parceiro'
        : 'Visitante';

  const sidebarContent = (
    <>
      <div>
        <p className="text-sm font-medium text-primary-1">Comunidade RPM</p>

        {/* Grupo 1 - comum a todos (topo) */}
        <nav className="mt-4 space-y-1 rounded-lg bg-secondary-3/40 p-1">
          <Link
            href="/dashboard"
            className={`block rounded-md px-3 py-2 text-sm ${
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
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === `/dashboard/category/${c.slug}`
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                {c.name}
              </Link>
            ))}
        </nav>
      </div>

      {/* Grupo 2 - parceiro/admin (base do menu) */}
      <div className="mt-auto border-t border-secondary-2 pt-4 text-sm text-primary-1">
        {/* Bloco do usuário */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-3 text-[11px] font-semibold text-primary-2">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p
                className={`truncate text-xs font-semibold ${
                  user ? 'text-primary-1' : 'text-white'
                }`}
              >
                {user ? firstName : 'Visitante'}
              </p>
              {user && (
                <p className="text-[10px] uppercase tracking-wide text-primary-3">
                  {roleLabel}
                </p>
              )}
            </div>
          </div>
          {user ? (
            <button
              type="button"
              onClick={logout}
              className="cursor-pointer text-xs font-medium text-primary-3 underline-offset-2 hover:text-primary-1 hover:underline"
            >
              Sair
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="cursor-pointer text-xs font-medium text-primary-3 underline-offset-2 hover:text-primary-1 hover:underline"
            >
              Login
            </button>
          )}
        </div>

        {/* Links de ações (parceiro/admin) */}
        <nav className="mt-4 space-y-1 text-xs">
          {user?.role === 'PARTNER' && (
            <>
              <Link
                href="/dashboard/leads"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/leads'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Leads
              </Link>
              <Link
                href="/dashboard/profile"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/profile'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Meu perfil
              </Link>
              <Link
                href="/dashboard/services"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/services'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Meus serviços
              </Link>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <>
              <Link
                href="/dashboard/users"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/users'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Users
              </Link>
              <Link
                href="/dashboard/admin-services"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/admin-services'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Serviços (admin)
              </Link>
              <Link
                href="/dashboard/categories"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/categories'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Categorias
              </Link>
              <Link
                href="/dashboard/partners"
                className={`block rounded-md px-3 py-2 ${
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
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-primary-1 md:flex-row">
      {/* Header mobile com menu hamburguer */}
      <header className="flex items-center justify-between border-b border-secondary-2 bg-primary-2 px-4 py-3 md:hidden">
        <span className="text-sm font-medium text-primary-1">Comunidade RPM</span>
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-secondary-2 text-primary-1 hover:bg-secondary-3"
          aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <span className="flex h-3 w-3 flex-col justify-between">
            <span className="h-[1px] w-full bg-primary-1" />
            <span className="h-[1px] w-full bg-primary-1" />
            <span className="h-[1px] w-full bg-primary-1" />
          </span>
        </button>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-secondary-2 bg-primary-2 p-4 md:flex">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile (overlay) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex w-64 shrink-0 flex-col border-r border-secondary-2 bg-primary-2 p-4">
            {sidebarContent}
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            className="flex-1 bg-black/40"
            aria-label="Fechar menu"
          />
        </div>
      )}

      {/* Modal de autenticação (login / criar conta) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Entrar na Comunidade RPM
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Faça login ou crie a sua conta para continuar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-600">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 rounded-full px-3 py-1.5 ${
                  authMode === 'login'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'hover:text-zinc-900'
                }`}
              >
                Já tenho conta
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 rounded-full px-3 py-1.5 ${
                  authMode === 'register'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'hover:text-zinc-900'
                }`}
              >
                Criar conta
              </button>
            </div>

            {authMode === 'login' ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError('');
                  setLoginLoading(true);
                  try {
                    await login(loginEmail, loginPassword);
                    setIsAuthModalOpen(false);
                  } catch (err) {
                    setLoginError(
                      err instanceof Error ? err.message : 'Erro ao entrar.',
                    );
                  } finally {
                    setLoginLoading(false);
                  }
                }}
              >
                {loginError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {loginError}
                  </div>
                )}
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    E-mail
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    Senha
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex w-full cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loginLoading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setRegisterError('');
                  setRegisterLoading(true);
                  try {
                    await register({
                      email: registerEmail,
                      password: registerPassword,
                      name: registerName,
                      whatsapp: registerWhatsapp,
                    });
                    setIsAuthModalOpen(false);
                  } catch (err) {
                    setRegisterError(
                      err instanceof Error
                        ? err.message
                        : 'Erro ao criar conta.',
                    );
                  } finally {
                    setRegisterLoading(false);
                  }
                }}
              >
                {registerError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {registerError}
                  </div>
                )}
                <div className="grid gap-3">
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      Nome
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-email-register"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      E-mail
                    </label>
                    <input
                      id="auth-email-register"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-whatsapp"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      WhatsApp
                    </label>
                    <input
                      id="auth-whatsapp"
                      type="text"
                      value={registerWhatsapp}
                      onChange={(e) => setRegisterWhatsapp(e.target.value)}
                      required
                      placeholder="Ex: 351256854756"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-password-register"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      Senha (mín. 6 caracteres)
                    </label>
                    <input
                      id="auth-password-register"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="flex w-full cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {registerLoading ? 'Criando conta…' : 'Criar conta'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 text-primary-2 md:p-6">{children}</main>
    </div>
  );
}
