'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAuthToken, clearAuthToken, api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    logout,
    loading: authLoading,
    login,
    register,
    isImpersonating,
    stopImpersonation,
  } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<
    'login' | 'register' | 'verify' | 'forgot' | 'resetPassword'
  >('login');
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
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyInfo, setVerifyInfo] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyOrigin, setVerifyOrigin] = useState<'login' | 'register' | null>(
    null,
  );
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [pendingWelcomeAfterVerify, setPendingWelcomeAfterVerify] =
    useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotInfo, setForgotInfo] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetInfo, setResetInfo] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [categories, setCategories] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);

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

  // Sincroniza categoria ativa no menu com rota atual (categoria ou parceiro)
  useEffect(() => {
    // Página de listagem por categoria
    if (pathname.startsWith('/dashboard/category/')) {
      const segments = pathname.split('/');
      const slug = segments[segments.length - 1] || null;
      setActiveCategorySlug(slug);
      return;
    }

    // Página de parceiro dentro do dashboard
    if (pathname.startsWith('/dashboard/partner/')) {
      const segments = pathname.split('/');
      const partnerId = segments[segments.length - 1];
      if (!partnerId) return;

      // Não limpamos activeCategorySlug aqui para evitar "piscar"
      // ao navegar de /dashboard/category/[slug] -> /dashboard/partner/[id].

      (async () => {
        try {
          const data = await api.marketplace.partnerDetails(partnerId);
          // category pode ser null se o parceiro não tiver categoria associada
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const category = (data as any).category as
            | { slug: string }
            | null
            | undefined;
          if (category?.slug) {
            setActiveCategorySlug(category.slug);
          }
        } catch {
          // mantemos o slug atual (se existir) em caso de erro
        }
      })();

      return;
    }

    // Outras páginas não relacionadas a categorias/parceiros
    setActiveCategorySlug(null);
  }, [pathname]);

  // Permite que outras páginas abram o modal de auth (por exemplo, página do parceiro)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{
        mode?: 'login' | 'register' | 'verify';
      }>;
      if (custom.detail?.mode) {
        setAuthMode(custom.detail.mode);
      } else {
        setAuthMode('login');
      }
      setIsAuthModalOpen(true);
    };

    window.addEventListener('open-auth-modal', handler as EventListener);
    return () => {
      window.removeEventListener('open-auth-modal', handler as EventListener);
    };
  }, []);

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Abre modal de boas-vindas após verificação de e-mail e login concluídos
  useEffect(() => {
    if (pendingWelcomeAfterVerify && user) {
      const raw = (user.name ?? '').trim();
      const first =
        raw.split(' ')[0] ||
        (user.email ? user.email.split('@')[0] : 'bem-vindo(a)');
      setWelcomeName(first);
      setIsWelcomeOpen(true);
      setPendingWelcomeAfterVerify(false);
    }
  }, [pendingWelcomeAfterVerify, user]);

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
        : user?.tier === 'MEMBER'
          ? 'Membro'
          : 'Visitante';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-center">
          <Image
            src="/logo_bg_clara.png"
            alt="Comunidade RPM"
            width={140}
            height={32}
            priority
          />
        </div>

        {/* Grupo 1 - comum a todos (topo) */}
        <nav className="mt-4 max-h-full space-y-1 overflow-y-auto rounded-lg bg-secondary-3/40 p-1 pr-1">
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
            categories.map((c) => {
              const isActive =
                pathname === `/dashboard/category/${c.slug}` ||
                (pathname.startsWith('/dashboard/partner/') &&
                  activeCategorySlug === c.slug);
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/category/${c.slug}`}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-primary-3 font-medium text-primary-2'
                      : 'text-primary-1 hover:bg-secondary-3'
                  }`}
                >
                  {c.name}
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Grupo 2 - parceiro/admin (base do menu) */}
      <div className="mt-auto border-t border-secondary-2 pt-4 text-sm text-primary-1">
        {/* Bloco do usuário */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-3 text-[16px] font-semibold text-primary-2">
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
                  {isImpersonating && ' (modo admin)'}
                </p>
              )}
            </div>
          </div>
          <div>
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
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="cursor-pointer text-xs font-medium text-primary-3 underline-offset-2 hover:text-primary-1 hover:underline"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {isImpersonating && (
          <button
            type="button"
            onClick={async () => {
              await stopImpersonation();
            }}
            className="mt-3 w-full cursor-pointer rounded-full border border-primary-3 px-3 py-1.5 text-[11px] font-medium text-primary-3 hover:bg-primary-3 hover:text-primary-2"
          >
            Voltar ao modo admin
          </button>
        )}

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
              <Link
                href="/dashboard/my-sales"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/my-sales'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Minhas vendas
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
              <Link
                href="/dashboard/admin-purchases"
                className={`block rounded-md px-3 py-2 ${
                  pathname === '/dashboard/admin-purchases'
                    ? 'bg-primary-3 font-medium text-primary-2'
                    : 'text-primary-1 hover:bg-secondary-3'
                }`}
              >
                Compras (admin)
              </Link>
            </>
          )}
          {user && (
            <Link
              href="/dashboard/my-purchases"
              className={`block rounded-md px-3 py-2 ${
                pathname === '/dashboard/my-purchases'
                  ? 'bg-primary-3 font-medium text-primary-2'
                  : 'text-primary-1 hover:bg-secondary-3'
              }`}
            >
              Cashback
            </Link>
          )}
        </nav>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-primary-1 md:pl-56">
      {/* Header mobile com menu hamburguer */}
      <header className="flex items-center justify-between border-b border-secondary-2 bg-primary-2 px-4 py-2 md:hidden">
        <div className="flex items-center">
          <Image
            src="/logo_bg_clara.png"
            alt="Comunidade RPM"
            width={96}
            height={22}
            priority
          />
        </div>
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
      <aside className="hidden border-r border-secondary-2 bg-primary-2 p-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col md:overflow-hidden">
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
                  {authMode === 'verify'
                    ? 'Confirme o seu e-mail para concluir o acesso.'
                    : authMode === 'forgot'
                      ? 'Informe o e-mail da sua conta para receber um código de recuperação.'
                      : authMode === 'resetPassword'
                        ? 'Introduza o código recebido por e-mail e defina uma nova senha.'
                        : 'Faça login ou crie a sua conta para continuar.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(false);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-600">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setVerifyError('');
                  setVerifyInfo('');
                }}
                className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 ${
                  authMode === 'login'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'hover:text-zinc-900'
                }`}
              >
                Já tenho conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setVerifyError('');
                  setVerifyInfo('');
                }}
                className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 ${
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
                  setVerifyError('');
                  setVerifyInfo('');
                  setLoginLoading(true);
                  try {
                    await login(loginEmail, loginPassword);
                    setIsAuthModalOpen(false);
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : 'Erro ao entrar.';

                    if (
                      message.includes('confirmar o seu e-mail antes de entrar')
                    ) {
                      setAuthMode('verify');
                      setVerifyOrigin('login');
                      setVerifyEmail(loginEmail);
                      setVerifyCode('');
                      setVerifyError('');
                      setVerifyInfo(
                        'É necessário confirmar o seu e-mail antes de entrar. Verifique a sua caixa de entrada, incluindo a pasta de spam/lixo eletrónico. Se não encontrar, peça o reenvio do código abaixo.',
                      );
                      setLoginError('');
                    } else {
                      setLoginError(message);
                    }
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
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError('');
                      setForgotInfo('');
                      setForgotEmail(loginEmail);
                      setAuthMode('forgot');
                    }}
                    className="cursor-pointer text-[11px] font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex w-full cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loginLoading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>
            ) : authMode === 'register' ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setRegisterError('');
                  setVerifyError('');
                  setVerifyInfo('');
                  setRegisterLoading(true);
                  try {
                    await register({
                      email: registerEmail,
                      password: registerPassword,
                      name: registerName,
                      whatsapp: registerWhatsapp,
                    });
                    setAuthMode('verify');
                    setVerifyOrigin('register');
                    setVerifyEmail(registerEmail);
                    setVerifyCode('');
                    setVerifyError('');
                    setVerifyInfo(
                      'Enviámos um código de confirmação para o seu e-mail. Verifique a sua caixa de entrada, incluindo a pasta de spam/lixo eletrónico, e insira o código abaixo.',
                    );
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
            ) : authMode === 'verify' ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setVerifyError('');
                  setVerifyInfo('');
                  setVerifyLoading(true);
                  try {
                    if (!verifyEmail) {
                      throw new Error(
                        'E-mail para verificação não encontrado. Volte a tentar o login ou o registo.',
                      );
                    }

                    await api.auth.verifyEmail(verifyEmail, verifyCode);

                    const passwordToUse =
                      verifyOrigin === 'login'
                        ? loginPassword
                        : registerPassword;

                    if (!passwordToUse) {
                      setVerifyInfo(
                        'E-mail confirmado com sucesso. Agora pode entrar com a sua senha.',
                      );
                      setAuthMode('login');
                      setLoginEmail(verifyEmail);
                      return;
                    }

                    await login(verifyEmail, passwordToUse);
                    setIsAuthModalOpen(false);
                    setPendingWelcomeAfterVerify(true);
                  } catch (err) {
                    setVerifyError(
                      err instanceof Error
                        ? err.message
                        : 'Erro ao confirmar o e-mail. Verifique o código e tente novamente.',
                    );
                  } finally {
                    setVerifyLoading(false);
                  }
                }}
              >
                {verifyError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {verifyError}
                  </div>
                )}
                {verifyInfo && !verifyError && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {verifyInfo}
                  </div>
                )}
                <p className="text-xs text-zinc-600">
                  Introduza o código de 6 dígitos que enviámos para{' '}
                  <span className="font-semibold text-zinc-900">
                    {verifyEmail}
                  </span>
                  . Verifique também a pasta de spam/lixo eletrónico.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyError('');
                    setVerifyInfo('');
                    if (verifyOrigin === 'register') {
                      setAuthMode('register');
                      setRegisterEmail(verifyEmail);
                    } else {
                      setAuthMode('login');
                      setLoginEmail(verifyEmail);
                    }
                  }}
                  className="mt-1 cursor-pointer text-[11px] font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                >
                  Este e-mail está errado? Atualizar e-mail
                </button>
                <div>
                  <label
                    htmlFor="auth-verification-code"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    Código de confirmação
                  </label>
                  <input
                    id="auth-verification-code"
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    required
                    maxLength={10}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={verifyLoading}
                    onClick={async () => {
                      setVerifyError('');
                      setVerifyInfo('');
                      if (!verifyEmail) {
                        setVerifyError(
                          'E-mail para verificação não encontrado. Volte a tentar o login ou o registo.',
                        );
                        return;
                      }
                      try {
                        await api.auth.resendVerification(verifyEmail);
                        setVerifyInfo(
                          'Novo código enviado. Verifique a sua caixa de entrada e a pasta de spam/lixo eletrónico.',
                        );
                      } catch (err) {
                        setVerifyError(
                          err instanceof Error
                            ? err.message
                            : 'Erro ao reenviar o código. Tente novamente.',
                        );
                      }
                    }}
                    className="cursor-pointer text-xs font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline disabled:opacity-50"
                  >
                    Reenviar código
                  </button>
                  <button
                    type="submit"
                    disabled={verifyLoading}
                    className="flex cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {verifyLoading ? 'Confirmando…' : 'Confirmar e entrar'}
                  </button>
                </div>
              </form>
            ) : authMode === 'forgot' ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setForgotError('');
                  setForgotInfo('');
                  setForgotLoading(true);
                  try {
                    await api.auth.forgotPassword(forgotEmail);
                    setResetEmail(forgotEmail);
                    setAuthMode('resetPassword');
                    setResetCode('');
                    setResetPassword('');
                    setResetError('');
                    setResetInfo(
                      'Enviámos um código de recuperação para o e-mail informado. Verifique a sua caixa de entrada e a pasta de spam/lixo eletrónico.',
                    );
                  } catch (err) {
                    setForgotError(
                      err instanceof Error
                        ? err.message
                        : 'Erro ao solicitar recuperação de senha. Tente novamente.',
                    );
                  } finally {
                    setForgotLoading(false);
                  }
                }}
              >
                {forgotError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {forgotError}
                  </div>
                )}
                {forgotInfo && !forgotError && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {forgotInfo}
                  </div>
                )}
                <div>
                  <label
                    htmlFor="auth-forgot-email"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    E-mail da conta
                  </label>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex w-full cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {forgotLoading ? 'Enviando código…' : 'Enviar código de recuperação'}
                </button>
              </form>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setResetError('');
                  setResetInfo('');
                  setResetLoading(true);
                  try {
                    if (!resetEmail) {
                      throw new Error(
                        'E-mail para recuperação não encontrado. Volte a solicitar a recuperação de senha.',
                      );
                    }

                    await api.auth.resetPassword({
                      email: resetEmail,
                      code: resetCode,
                      newPassword: resetPassword,
                    });

                    await login(resetEmail, resetPassword);
                    setIsAuthModalOpen(false);
                  } catch (err) {
                    setResetError(
                      err instanceof Error
                        ? err.message
                        : 'Erro ao redefinir a senha. Verifique o código e tente novamente.',
                    );
                  } finally {
                    setResetLoading(false);
                  }
                }}
              >
                {resetError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {resetError}
                  </div>
                )}
                {resetInfo && !resetError && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {resetInfo}
                  </div>
                )}
                <p className="text-xs text-zinc-600">
                  Introduza o código que enviámos para{' '}
                  <span className="font-semibold text-zinc-900">
                    {resetEmail}
                  </span>{' '}
                  e defina a sua nova senha de acesso.
                </p>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="auth-reset-code"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      Código de recuperação
                    </label>
                    <input
                      id="auth-reset-code"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                      maxLength={10}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-reset-password"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      Nova senha (mín. 6 caracteres)
                    </label>
                    <input
                      id="auth-reset-password"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      minLength={6}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={resetLoading}
                    onClick={async () => {
                      setResetError('');
                      setResetInfo('');
                      if (!resetEmail) {
                        setResetError(
                          'E-mail para recuperação não encontrado. Volte a solicitar a recuperação de senha.',
                        );
                        return;
                      }
                      try {
                        await api.auth.forgotPassword(resetEmail);
                        setResetInfo(
                          'Novo código enviado. Verifique a sua caixa de entrada e a pasta de spam/lixo eletrónico.',
                        );
                      } catch (err) {
                        setResetError(
                          err instanceof Error
                            ? err.message
                            : 'Erro ao reenviar o código. Tente novamente.',
                        );
                      }
                    }}
                    className="cursor-pointer text-[11px] font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline disabled:opacity-50"
                  >
                    Reenviar código
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {resetLoading ? 'Salvando…' : 'Salvar nova senha e entrar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 text-primary-2 md:p-6">{children}</main>

      {isWelcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              Bem-vindo(a)
              {welcomeName ? `, ${welcomeName}` : ''}!
            </h2>
            <div className="mt-3 space-y-3 text-sm text-zinc-700">
              <p>
                A Comunidade RPM foi criada para te acompanhar em cada etapa do
                teu processo de imigração para Portugal, com informação
                atualizada e apoio de quem já passou por aí.
              </p>
              <p>
                A partir de agora tens acesso ao teu{' '}
                <span className="font-semibold">checklist de imigração</span> e
                a uma rede de{' '}
                <span className="font-semibold">
                  parceiros e profissionais especializados
                </span>{' '}
                que podem te ajudar em cada fase da jornada.
              </p>
              <p>
                Não deixa também de explorar o nosso e-book{' '}
                <span className="font-semibold">
                  “PSP – Portugal Sem Perrengue”
                </span>
                , um material vivo, construído e atualizado pela comunidade,
                para reunir as melhores práticas e informações mais recentes
                sobre o passo a passo da mudança.
              </p>
              <p>
                Todos os profissionais indicados aqui são{' '}
                <span className="font-semibold">parceiros de confiança</span> da
                Comunidade RPM e, para além do suporte especializado, conseguimos
                negociar <span className="font-semibold">benefícios exclusivos</span>{' '}
                para membros, que podem ser aproveitados em formato de{' '}
                <span className="font-semibold">cashback</span> diretamente pela
                plataforma.
              </p>
              <p>
                Desejo que esta plataforma te traga clareza, segurança e boas
                conexões ao longo do caminho.{' '}
                <span className="font-semibold">Conta comigo no processo!</span>
              </p>
              <p className="text-sm font-medium text-zinc-800">
                Um xero,<br />
                Rafa Pelo Mundo
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsWelcomeOpen(false)}
                className="inline-flex cursor-pointer items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Começar a explorar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
