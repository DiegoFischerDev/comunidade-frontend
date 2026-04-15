'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAuthToken, clearAuthToken, api } from '@/lib/api';
import { OPEN_AUTH_LOGIN_EVENT } from '@/lib/auth-ui-events';
import {
  WHATSAPP_REGISTRATION_POLL_MAX_MS,
  WHATSAPP_REGISTRATION_POLL_TIMEOUT_MESSAGE,
} from '@/lib/whatsapp-registration-poll';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';
import { FloatingWhatsAppButton } from '@/components/FloatingWhatsAppButton';

function formatWhatsappRegistrationDisplay(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('351')) {
    const rest = d.slice(3);
    return `+351 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim();
  }
  return d ? `+${d}` : '';
}

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
    loginWithToken,
    register,
    isImpersonating,
    stopImpersonation,
  } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<
    'login' | 'register' | 'registerWhatsappVerify' | 'forgot' | 'resetPassword'
  >('login');
  const [whatsappVerifyCode, setWhatsappVerifyCode] = useState('');
  const [whatsappVerifyOpenUrl, setWhatsappVerifyOpenUrl] = useState('');
  const [whatsappRegistrationNumber, setWhatsappRegistrationNumber] =
    useState('');
  const [whatsappBrowserSessionToken, setWhatsappBrowserSessionToken] =
    useState('');
  const [whatsappPollError, setWhatsappPollError] = useState('');
  const whatsappPollStartedAtRef = useRef<number | null>(null);
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerInfo, setRegisterInfo] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [pendingWelcomeAfterVerify, setPendingWelcomeAfterVerify] =
    useState(false);
  const [forgotWhatsapp, setForgotWhatsapp] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotInfo, setForgotInfo] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetWhatsapp, setResetWhatsapp] = useState('');
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
  const [partnerId, setPartnerId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const openLogin = () => {
      setAuthMode('login');
      setIsAuthModalOpen(true);
    };
    window.addEventListener(OPEN_AUTH_LOGIN_EVENT, openLogin);
    return () => window.removeEventListener(OPEN_AUTH_LOGIN_EVENT, openLogin);
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

  useEffect(() => {
    if (!mounted || authLoading) return;
    if (!user || user.role !== 'PARTNER') {
      setPartnerId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.partner.me();
        if (!cancelled) setPartnerId(me.id);
      } catch {
        if (!cancelled) setPartnerId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, authLoading, user?.role]);

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
        mode?: 'login' | 'register';
      }>;
      const mode = custom.detail?.mode ?? 'login';
      setAuthMode(mode);
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

  // Boas-vindas após registo + WhatsApp concluído na página /registro
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem('comunidade_welcome_after_wa') === '1') {
        sessionStorage.removeItem('comunidade_welcome_after_wa');
        const raw = (user.name ?? '').trim();
        const first =
          raw.split(' ')[0] ||
          (user.email ? user.email.split('@')[0] : 'bem-vindo(a)');
        setWelcomeName(first);
        setIsWelcomeOpen(true);
      }
    } catch {
      // noop
    }
  }, [user]);

  useEffect(() => {
    if (authMode === 'registerWhatsappVerify' && whatsappBrowserSessionToken) {
      whatsappPollStartedAtRef.current = Date.now();
    } else {
      whatsappPollStartedAtRef.current = null;
    }
  }, [authMode, whatsappBrowserSessionToken]);

  const pollWhatsappRegistration = useCallback(async () => {
    if (!whatsappBrowserSessionToken) return;
    const started = whatsappPollStartedAtRef.current;
    if (
      started != null &&
      Date.now() - started > WHATSAPP_REGISTRATION_POLL_MAX_MS
    ) {
      setWhatsappPollError(WHATSAPP_REGISTRATION_POLL_TIMEOUT_MESSAGE);
      setWhatsappBrowserSessionToken('');
      return;
    }
    try {
      const r = await api.auth.pollWhatsappRegistration(
        whatsappBrowserSessionToken,
      );
      if (r.status === 'ready') {
        setPendingWelcomeAfterVerify(true);
        await loginWithToken(r.token);
        setWhatsappVerifyCode('');
        setWhatsappVerifyOpenUrl('');
        setWhatsappRegistrationNumber('');
        setWhatsappBrowserSessionToken('');
        setWhatsappPollError('');
        setAuthMode('login');
        setIsAuthModalOpen(false);
        return;
      }
      if (r.status === 'expired') {
        setWhatsappPollError(
          'O tempo para ativar a conta neste passo expirou. Crie a conta de novo.',
        );
        setWhatsappBrowserSessionToken('');
        return;
      }
      if (r.status === 'consumed') {
        setWhatsappPollError(
          'Esta sessão já foi utilizada. Entre com o WhatsApp e a palavra-passe.',
        );
        setWhatsappBrowserSessionToken('');
        return;
      }
      if (r.status === 'invalid') {
        setWhatsappPollError(
          'Não encontrámos o pedido de registo. Volte atrás e tente criar a conta outra vez.',
        );
        setWhatsappBrowserSessionToken('');
      }
    } catch {
      // próximo intervalo
    }
  }, [whatsappBrowserSessionToken, loginWithToken]);

  useEffect(() => {
    if (authMode !== 'registerWhatsappVerify' || !whatsappBrowserSessionToken) {
      return;
    }
    void pollWhatsappRegistration();
    const id = window.setInterval(() => void pollWhatsappRegistration(), 2500);
    return () => window.clearInterval(id);
  }, [authMode, whatsappBrowserSessionToken, pollWhatsappRegistration]);

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-700">Carregando…</p>
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-center">
          <Image
            src="/logo_comunidade.png"
            alt="Comunidade RPM"
            width={140}
            height={32}
          />
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <a
            href="https://www.instagram.com/rafaapelomundo/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#910001]/30 bg-white text-[#910001] shadow-sm transition hover:border-[#910001]/55 hover:bg-[#910001]/10 hover:text-[#910001] hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
              <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm10.25 1.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@rafaapelomundo"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d58901]/35 bg-white text-[#d58901] shadow-sm transition hover:border-[#d58901]/60 hover:bg-[#d58901]/10 hover:text-[#d58901] hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
              <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.5 12 4.5 12 4.5s-5.7 0-7.5.6A3 3 0 0 0 2.4 7.2 31.3 31.3 0 0 0 2 12a31.3 31.3 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.6 7.5.6 7.5.6s5.7 0 7.5-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 22 12a31.3 31.3 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@rafaapelomundo"
            target="_blank"
            rel="noreferrer"
            aria-label="TikTok"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#086601]/30 bg-white text-[#086601] shadow-sm transition hover:border-[#086601]/55 hover:bg-[#086601]/10 hover:text-[#086601] hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
              <path d="M14.5 3c.3 2.5 1.8 4.7 4.3 5.5v3.1c-1.8 0-3.4-.6-4.7-1.6v6.3c0 3.4-2.8 6.2-6.2 6.2S1.7 19 1.7 15.6s2.8-6.2 6.2-6.2c.4 0 .8 0 1.2.1v3.4c-.4-.2-.8-.3-1.2-.3-1.6 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3V3h3.4Z" />
            </svg>
          </a>
        </div>

        {/* Menu principal */}
        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg bg-zinc-50 p-1 pr-1 pb-3">
          <Link
            href="/dashboard"
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === '/dashboard'
                ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                : 'text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Início
          </Link>
          <Link
            href="/plano-de-imigracao"
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === '/plano-de-imigracao'
                ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                : 'text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Plano de imigração
          </Link>
          <Link
            href="/psp"
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === '/psp' || pathname.startsWith('/psp/')
                ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                : 'text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Ebook PSP
          </Link>
          <Link
            href="/grupos-vip"
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === '/grupos-vip'
                ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                : 'text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Grupos whatsapp
          </Link>
          {user && user.role !== 'ADMIN' ? (
            <Link
              href="/dashboard/reclame-aqui"
              className={`block rounded-md px-3 py-2 text-sm ${
                pathname === '/dashboard/reclame-aqui'
                  ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                  : 'text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              Reclame aqui
            </Link>
          ) : null}

          {/* Links “extras” (antes ficavam no grupo de baixo) */}
          {user?.role === 'PARTNER' && (
            <>
              <Link
                href="/dashboard/leads"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/leads'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Meus leads
              </Link>
              {partnerId ? (
                <Link
                  href={`/dashboard/partner/${partnerId}`}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    pathname === `/dashboard/partner/${partnerId}`
                      ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                      : 'text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  Minha página
                </Link>
              ) : null}
              <Link
                href="/dashboard/my-sales"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/my-sales'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Minhas vendas
              </Link>
              <Link
                href="/dashboard/business"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/business'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Minha empresa
              </Link>
              <Link
                href="/dashboard/my-services"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/my-services' ||
                  pathname === '/dashboard/commissions'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
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
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/users'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Users
              </Link>
              <Link
                href="/dashboard/admin/rafacall-hoje"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/rafacall-hoje'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Agendamentos
              </Link>
              <Link
                href="/dashboard/admin/reclame-aqui"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/reclame-aqui'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Reclame aqui
              </Link>
              <Link
                href="/dashboard/admin/sales"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/sales'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Todas as vendas
              </Link>
              <Link
                href="/dashboard/admin/commissions"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/commissions' ||
                  pathname === '/dashboard/admin/services'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Comissões
              </Link>
              <Link
                href="/dashboard/categories"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/categories'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Categorias
              </Link>
              <Link
                href="/dashboard/partners"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/partners'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Parceiros
              </Link>
              <Link
                href="/dashboard/affiliates"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/affiliates'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Afiliados
              </Link>
            </>
          )}
          {user?.tier === 'MEMBER' && (
            <Link
              href="/dashboard/my-referrals"
              className={`block rounded-md px-3 py-2 text-sm ${
                pathname === '/dashboard/my-referrals'
                  ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                  : 'text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              Minhas indicações
            </Link>
          )}

          <Link
            href="/dashboard/services"
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === '/dashboard/services' ||
              pathname.startsWith('/dashboard/category/') ||
              pathname.startsWith('/dashboard/partner/')
                ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                : 'text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Serviços
          </Link>
          {categoriesLoaded && categories.length ? (
            <div className="mt-2 space-y-1 border-l border-zinc-200 pl-3">
              {categories.map((c) => {
                const isActive =
                  pathname === `/dashboard/category/${c.slug}` ||
                  (pathname.startsWith('/dashboard/partner/') &&
                    activeCategorySlug === c.slug);
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/category/${c.slug}`}
                    className={`relative block rounded-lg px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] text-white shadow-sm'
                        : 'text-zinc-700 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute -left-[7px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-2 ring-white ${
                        isActive ? 'bg-[#d58901]' : 'bg-zinc-300'
                      }`}
                      aria-hidden
                    />
                    {c.name}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>
      </div>

      {/* Rodapé (somente usuário/ação) */}
      <div className="mt-auto border-t border-secondary-2 pt-4 text-sm text-zinc-700">
        {/* Bloco do usuário */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {user?.tier === 'MEMBER' ? (
              <Image
                src="/vip-card.png"
                alt="VIP"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d58901] text-[16px] font-semibold text-white">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p
                className={`truncate text-xs font-semibold ${
                  user ? 'text-zinc-900' : 'text-zinc-900'
                }`}
              >
                {user ? firstName : 'Visitante'}
              </p>
              {user && (
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
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
                className="cursor-pointer text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
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
                className="cursor-pointer text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
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
            className="mt-3 w-full cursor-pointer rounded-full border border-zinc-300 px-3 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            Voltar ao modo admin
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:pl-56">
      {/* Header mobile com menu hamburguer */}
      <header className="flex items-center justify-between border-b border-secondary-2 bg-white px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="flex cursor-pointer items-center"
          aria-label="Ir para o início"
        >
          <Image
            src="/logo_comunidade.png"
            alt="Comunidade RPM"
            width={96}
            height={22}
          />
        </button>
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-secondary-2 text-zinc-900 hover:bg-zinc-100"
          aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <span className="flex h-3 w-3 flex-col justify-between">
            <span className="h-[1px] w-full bg-zinc-900" />
            <span className="h-[1px] w-full bg-zinc-900" />
            <span className="h-[1px] w-full bg-zinc-900" />
          </span>
        </button>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden border-r border-secondary-2 bg-white p-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col md:overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile (overlay) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex w-64 shrink-0 flex-col border-r border-secondary-2 bg-white p-4">
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {authMode === 'registerWhatsappVerify'
                    ? 'Ativar conta no WhatsApp'
                    : 'Entrar na Comunidade RPM'}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {authMode === 'registerWhatsappVerify'
                      ? 'Envie o código pelo WhatsApp para concluir o registo.'
                      : authMode === 'forgot'
                        ? 'Informe o seu WhatsApp para receber um código de recuperação.'
                        : authMode === 'resetPassword'
                          ? 'Introduza o código recebido por WhatsApp e defina uma nova senha.'
                          : 'Faça login ou crie a sua conta para continuar.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWhatsappVerifyCode('');
                  setWhatsappVerifyOpenUrl('');
                  setWhatsappRegistrationNumber('');
                  setWhatsappBrowserSessionToken('');
                  setWhatsappPollError('');
                  setIsAuthModalOpen(false);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {authMode !== 'registerWhatsappVerify' && (
              <div className="mt-4 flex rounded-full bg-zinc-100 p-1 text-xs font-medium text-zinc-600">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
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
                    setRegisterError('');
                    setRegisterInfo('');
                    setWhatsappVerifyCode('');
                    setWhatsappVerifyOpenUrl('');
                    setWhatsappRegistrationNumber('');
                    setWhatsappBrowserSessionToken('');
                    setWhatsappPollError('');
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
            )}

            {authMode === 'login' ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError('');
                  setLoginLoading(true);
                  try {
                    await login(loginWhatsapp, loginPassword);
                    setIsAuthModalOpen(false);
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : 'Erro ao entrar.';
                    setLoginError(message);
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
                    htmlFor="auth-whatsapp"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    WhatsApp
                  </label>
                  <input
                    id="auth-whatsapp"
                    type="tel"
                    value={loginWhatsapp}
                    onChange={(e) => setLoginWhatsapp(e.target.value)}
                    required
                    placeholder="Ex.: 351954785654 ou 55999867458"
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
                      setForgotWhatsapp(loginWhatsapp);
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
                  setRegisterInfo('');
                  if (registerPassword !== registerPasswordConfirm) {
                    setRegisterError('As senhas não coincidem.');
                    return;
                  }
                  setRegisterLoading(true);
                  try {
                    const refRaw =
                      typeof window !== 'undefined'
                        ? window.localStorage.getItem(
                            'comunidade_ref_affiliate',
                          )
                        : null;
                    const refTrimmed =
                      refRaw &&
                      refRaw !== 'nenhum' &&
                      refRaw.trim().length > 0
                        ? refRaw.trim()
                        : undefined;

                    const res = await register({
                      name: registerName,
                      password: registerPassword,
                      affiliateCode: refTrimmed,
                    });
                    if (
                      res.requiresWhatsappVerification &&
                      res.whatsappOpenUrl &&
                      res.whatsappVerificationCode &&
                      res.whatsappRegistrationNumber &&
                      res.whatsappBrowserSessionToken
                    ) {
                      setWhatsappPollError('');
                      setWhatsappVerifyCode(res.whatsappVerificationCode);
                      setWhatsappVerifyOpenUrl(res.whatsappOpenUrl);
                      setWhatsappRegistrationNumber(res.whatsappRegistrationNumber);
                      setWhatsappBrowserSessionToken(res.whatsappBrowserSessionToken);
                      setAuthMode('registerWhatsappVerify');
                      return;
                    }
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
                {registerInfo && !registerError && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {registerInfo}
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
                  <div>
                    <label
                      htmlFor="auth-password-register-2"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      Confirmar senha
                    </label>
                    <input
                      id="auth-password-register-2"
                      type="password"
                      value={registerPasswordConfirm}
                      onChange={(e) =>
                        setRegisterPasswordConfirm(e.target.value)
                      }
                      required
                      minLength={6}
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {/* Ativação passa a ser sempre via WhatsApp */}
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="flex w-full cursor-pointer items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {registerLoading ? 'A processar…' : 'Criar conta'}
                </button>
              </form>
            ) : authMode === 'registerWhatsappVerify' ? (
              <div className="mt-5 space-y-4">
                {whatsappPollError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {whatsappPollError}
                  </div>
                )}
                <p className="text-xs leading-relaxed text-zinc-700">
                  Para ativar a sua conta, envie o código de verificação pelo WhatsApp para{' '}
                  <span className="font-semibold text-zinc-900">
                    {formatWhatsappRegistrationDisplay(whatsappRegistrationNumber)}
                  </span>
                  .
                </p>
                <div>
                  <p className="text-xs font-medium text-zinc-600">
                    Código de verificação
                  </p>
                  <p
                    className="mt-1 select-all rounded-lg border border-zinc-200 bg-zinc-50 py-3 text-center text-2xl font-bold tracking-[0.2em] text-zinc-900"
                    aria-live="polite"
                  >
                    {whatsappVerifyCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (whatsappVerifyOpenUrl) {
                      window.open(
                        whatsappVerifyOpenUrl,
                        '_blank',
                        'noopener,noreferrer',
                      );
                    }
                  }}
                  className="flex w-full cursor-pointer items-center justify-center rounded-full bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setWhatsappVerifyCode('');
                    setWhatsappVerifyOpenUrl('');
                    setWhatsappRegistrationNumber('');
                    setWhatsappBrowserSessionToken('');
                    setWhatsappPollError('');
                  }}
                  className="w-full cursor-pointer text-center text-[11px] font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                >
                  Voltar ao registo
                </button>
              </div>
            ) : authMode === 'forgot' ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setForgotError('');
                  setForgotInfo('');
                  setForgotLoading(true);
                  try {
                    await api.auth.forgotPassword(forgotWhatsapp);
                    setResetWhatsapp(forgotWhatsapp);
                    setAuthMode('resetPassword');
                    setResetCode('');
                    setResetPassword('');
                    setResetError('');
                    setResetInfo(
                      'Enviámos um código de recuperação para o WhatsApp informado.',
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
                    htmlFor="auth-forgot-whatsapp"
                    className="block text-xs font-medium text-zinc-700"
                  >
                    WhatsApp da conta
                  </label>
                  <input
                    id="auth-forgot-whatsapp"
                    type="tel"
                    value={forgotWhatsapp}
                    onChange={(e) => setForgotWhatsapp(e.target.value)}
                    required
                    placeholder="Ex.: 351954785654 ou 55999867458"
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
                    if (!resetWhatsapp) {
                      throw new Error(
                        'WhatsApp para recuperação não encontrado. Volte a solicitar a recuperação de senha.',
                      );
                    }

                    await api.auth.resetPassword({
                      whatsapp: resetWhatsapp,
                      code: resetCode,
                      newPassword: resetPassword,
                    });

                    await login(resetWhatsapp, resetPassword);
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
                  Introduza o código que enviámos para o seu WhatsApp e defina a sua nova senha de acesso.
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
                      if (!resetWhatsapp) {
                        setResetError(
                          'WhatsApp para recuperação não encontrado. Volte a solicitar a recuperação de senha.',
                        );
                        return;
                      }
                      try {
                        await api.auth.forgotPassword(resetWhatsapp);
                        setResetInfo(
                          'Novo código enviado para o seu WhatsApp.',
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

      <main className="flex-1 p-4 text-zinc-900 md:p-6">
        {children}
      </main>

      <footer className="border-t border-secondary-2 bg-white px-4 py-4 text-xs text-zinc-600 md:px-6">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-1 text-center">
          <p>
            © {new Date().getFullYear()} Comunidade RPM. Todos os direitos reservados. ·{' '}
            rafaapelomundo@gmail.com
          </p>
        </div>
      </footer>

      <FloatingWhatsAppButton hideFloatingButton />

      {isWelcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
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
                para membros, que podem ser aproveitados diretamente pela
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
              <CardButton
                type="button"
                onClick={() => setIsWelcomeOpen(false)}
                variant="primary"
              >
                Começar a explorar
              </CardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
