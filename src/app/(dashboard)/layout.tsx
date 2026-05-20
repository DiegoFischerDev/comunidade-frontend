'use client';

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getAuthToken, clearAuthToken, api } from '@/lib/api';
import {
  MEMBERSHIP_CHECKOUT_PATH,
  OPEN_AUTH_LOGIN_EVENT,
  OPEN_MEMBERSHIP_MODAL_EVENT,
} from '@/lib/auth-ui-events';
import { isActiveMember } from '@/lib/membership-access';
import { COMMUNITY_WHATSAPP_GROUPS_URL } from '@/lib/community-whatsapp-groups';
import { useAuth } from '@/contexts/AuthContext';
import {
  LoginMethodSwitchLink,
  type LoginMethod,
} from '@/components/auth/LoginMethodSwitchLink';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import {
  LOGIN_PASSWORD_STORAGE_KEY,
  persistLoginPasswordToStorage,
} from '@/lib/login-phone-storage';
import { CardButton } from '@/components/ui/CardButton';
import { FloatingWhatsAppButton } from '@/components/FloatingWhatsAppButton';
import { SupportTicketRoot } from '@/components/support-ticket';
import { SiteFooter } from '@/components/site/SiteFooter';


function formatWhatsappRegistrationDisplay(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('351')) {
    const rest = d.slice(3);
    return `+351 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim();
  }
  return d ? `+${d}` : '';
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  );
}


function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 1 11-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

/** Campo de senha no modal de auth: ícone de olho para revelar/ocultar. */
function AuthPasswordField({
  id,
  name,
  label,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  disabled,
}: {
  id: string;
  name?: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-zinc-700"
      >
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full rounded-lg border border-zinc-300 py-2 pl-3 pr-10 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-500 transition hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-40"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          disabled={disabled}
        >
          {show ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  /** Início do dashboard: hero em full-bleed; padding move-se para a página. */
  const isDashboardHome = pathname === '/dashboard';
  const isMembershipCheckout = pathname === MEMBERSHIP_CHECKOUT_PATH;
  const {
    user,
    logout,
    loading: authLoading,
    login,
    loginWithToken,
    isImpersonating,
    stopImpersonation,
  } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'forgot' | 'resetPassword'>(
    'login',
  );
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('whatsapp');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordHydrated, setLoginPasswordHydrated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
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
  const [partnerCategorySlug, setPartnerCategorySlug] = useState<string | null>(null);
  const [partnerDisplayName, setPartnerDisplayName] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(LOGIN_PASSWORD_STORAGE_KEY);
      if (saved) setLoginPassword(saved);
    } catch {
      // noop
    }
    setLoginPasswordHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !loginPasswordHydrated) return;
    try {
      if (loginPassword) {
        localStorage.setItem(LOGIN_PASSWORD_STORAGE_KEY, loginPassword);
      } else {
        localStorage.removeItem(LOGIN_PASSWORD_STORAGE_KEY);
      }
    } catch {
      // noop
    }
  }, [loginPasswordHydrated, loginPassword]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== LOGIN_PASSWORD_STORAGE_KEY) {
        return;
      }
      setLoginPassword(e.newValue ?? '');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
    if (!user || user.role !== 'PARTNER') {
      setPartnerCategorySlug(null);
      setPartnerDisplayName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.partner.me();
        if (!cancelled) {
          setPartnerCategorySlug(me.category?.slug ?? null);
          setPartnerDisplayName(me.name?.trim() || null);
        }
      } catch {
        if (!cancelled) {
          setPartnerCategorySlug(null);
          setPartnerDisplayName(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, authLoading, user?.role]);

  // Permite que outras páginas abram o modal de auth (por exemplo, página do parceiro)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: 'login' }>;
      if (custom.detail?.mode === 'login') {
        setAuthMode('login');
        setIsAuthModalOpen(true);
        return;
      }
      setIsAuthModalOpen(false);
      window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-700">Carregando…</p>
      </div>
    );
  }

  const rawName = user?.name?.trim() ?? '';
  const firstName = rawName.split(' ')[0] || 'Visitante';
  const sidebarDisplayName =
    user?.role === 'PARTNER'
      ? partnerDisplayName || rawName || firstName
      : user
        ? firstName
        : 'Visitante';
  const roleLabel =
    user?.role === 'ADMIN'
      ? 'Admin'
      : user?.role === 'PARTNER'
        ? 'Parceiro'
        : isActiveMember(user)
          ? 'Membro'
          : user
            ? 'Sem VIP'
            : 'Anónimo';

  const isRelocationPartner =
    user?.role === 'PARTNER' && partnerCategorySlug === 'relocation';
  const isCasasPath =
    pathname === '/dashboard/casas' || pathname.startsWith('/dashboard/casas/');
  const isBusinessPath = pathname === '/dashboard/business';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (typeof window === 'undefined') return;
              if (pathname === '/dashboard') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              router.push('/dashboard');
            }}
            className="cursor-pointer"
            aria-label="Ir para o início"
          >
            <Image
              src="/logo_principal2.png"
              alt="Comunidade Rafa Portugal"
              width={740}
              height={174}
              className="h-18 w-auto max-w-full object-contain sm:h-28"
              priority
            />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <a
            href="https://www.instagram.com/rafaapelomundo/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-green/35 bg-white text-brand-green shadow-sm transition hover:border-brand-green/60 hover:bg-brand-green/12 hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
              <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm10.25 1.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@rafaapelomundo"
            target="_blank"
            rel="noreferrer"
            aria-label="TikTok"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d58901]/35 bg-white text-[#d58901] shadow-sm transition hover:border-[#c07c01]/70 hover:bg-[#f0b23a]/15 hover:text-[#c07c01] hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
              <path d="M14.5 3c.3 2.5 1.8 4.7 4.3 5.5v3.1c-1.8 0-3.4-.6-4.7-1.6v6.3c0 3.4-2.8 6.2-6.2 6.2S1.7 19 1.7 15.6s2.8-6.2 6.2-6.2c.4 0 .8 0 1.2.1v3.4c-.4-.2-.8-.3-1.2-.3-1.6 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3V3h3.4Z" />
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@rafaapelomundo"
            target="_blank"
            rel="noreferrer"
            aria-label="Canal no YouTube"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#910001]/35 bg-white text-[#910001] shadow-sm transition hover:border-[#910001]/60 hover:bg-[#910001]/10 hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        </div>

        {/* Menu principal */}
        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg bg-zinc-50 p-1 pr-1 pb-3">
          {isRelocationPartner ? (
            <>
              <Link
                href="/relocation/imoveis"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/relocation/imoveis'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Imóveis
              </Link>
              <div className="mt-2 border-t border-zinc-200 pt-2">
                <Link
                  href="/dashboard/casas"
                  className={`block rounded-md px-3 py-2 text-sm ${
                    isCasasPath
                      ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                      : 'bg-white font-medium text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Minhas casas
                </Link>
                <Link
                  href="/dashboard/business"
                  className={`mt-1 block rounded-md px-3 py-2 text-sm ${
                    isBusinessPath
                      ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                      : 'bg-white font-medium text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Minha empresa
                </Link>
              </div>
              <a
                href={COMMUNITY_WHATSAPP_GROUPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100"
                aria-label="Grupos de ajuda WhatsApp — entrar e participar"
              >
                <WhatsappIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
                <span>Grupo WhatsApp</span>
              </a>
            </>
          ) : (
            <>
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
          {user?.role === 'PARTNER' ? (
            <Link
              href="/dashboard/business"
              className={`block rounded-md px-3 py-2 text-sm ${
                isBusinessPath
                  ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                  : 'text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              Minha empresa
            </Link>
          ) : null}
          {user && (user.role === 'ADMIN' || isActiveMember(user)) ? (
            <>
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
                Guia PSP
              </Link>
            </>
          ) : null}
          <Link
            href="/relocation/imoveis"
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === '/relocation/imoveis'
                ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                : 'text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Imóveis
          </Link>
          <Link
            href="/relocation/servicos"
            className={`block rounded-md px-3 py-2 text-sm ${
              pathname === '/relocation/servicos'
                ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                : 'text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            Serviços
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

          {isActiveMember(user) && (
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
                href="/dashboard/admin/houses"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/houses'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Casas (anúncios)
              </Link>
              <Link
                href="/dashboard/admin/share-links"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/share-links' ||
                  pathname.startsWith('/dashboard/admin/share-links/')
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Links rastreados
              </Link>
              <Link
                href="/dashboard/admin/recommended-services"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/recommended-services'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Serviços indicados
              </Link>
              <Link
                href="/dashboard/admin/gatilhos"
                className={`block rounded-md px-3 py-2 text-sm ${
                  pathname === '/dashboard/admin/gatilhos'
                    ? 'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-medium text-white'
                    : 'text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                Gatilhos (WhatsApp)
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
          <a
            href={COMMUNITY_WHATSAPP_GROUPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100"
            aria-label="Grupos de ajuda WhatsApp — entrar e participar"
          >
            <WhatsappIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
            <span>Grupo WhatsApp</span>
          </a>
            </>
          )}
        </nav>
      </div>

      {/* Rodapé (somente usuário/ação) */}
      <div className="mt-auto border-t border-secondary-2 pt-4 text-sm text-zinc-700">
        {/* Bloco do usuário */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {isActiveMember(user) ? (
              <Image
                src="/icon_vip.png"
                alt="VIP"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d58901] text-[16px] font-semibold text-white">
                {sidebarDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p
                className={`truncate text-xs font-semibold ${
                  user ? 'text-zinc-900' : 'text-zinc-900'
                }`}
              >
                {sidebarDisplayName}
              </p>
              {user ? (
                user.role === 'ADMIN' || user.role === 'PARTNER' ? (
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {roleLabel}
                    {isImpersonating && ' (modo admin)'}
                  </p>
                ) : isActiveMember(user) ? (
                  <div className="mt-0.5 min-w-0 space-y-0.5">
                    <p className="text-[10px] font-medium leading-tight text-zinc-600">
                      Membro VIP
                      {isImpersonating && ' (modo admin)'}
                    </p>
                    {user.membershipExpiresAt ? (
                      <p className="text-[10px] leading-tight text-zinc-500">
                        Válido até{' '}
                        <span className="font-medium text-zinc-700">
                          {new Date(user.membershipExpiresAt).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {roleLabel}
                    {isImpersonating && ' (modo admin)'}
                  </p>
                )
              ) : null}
            </div>
          </div>
          <div>
            {user ? (
              <button
                type="button"
                onClick={() => logout()}
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
                  setIsMenuOpen(false);
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

  if (isMembershipCheckout) {
    return (
      <>
        {children}
        <FloatingWhatsAppButton hideFloatingButton />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:pl-56">
      {/* Preload de imagens usadas em modais (evita carregar só quando abre) */}
      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px] h-0 w-0 overflow-hidden opacity-0">
        <Image src="/afiliados.png" alt="" width={1200} height={630} priority />
        <Image src="/rafa_cards/modal_novo_agendamento.png" alt="" width={256} height={256} priority />
        {/* Membership modal usa <img> com este SVG; pré-carrega via img escondida */}
        <img src="/comunidade_bg.svg" alt="" loading="eager" />
      </div>

      {/* Mobile: atalho flutuante para início */}
      <button
        type="button"
        onClick={() => {
          if (typeof window === 'undefined') return;
          if (pathname === '/dashboard') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          router.push('/dashboard');
        }}
        className="fixed left-4 top-4 z-50 md:hidden"
        aria-label="Ir para o início"
      >
        <Image
          src="/rp.png"
          alt="Ir para o início"
          width={1563}
          height={1563}
          className="h-8 w-8 object-contain"
          priority
        />
      </button>

      {/* Mobile: apenas menu hambúrguer flutuante */}
      <button
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        className="fixed right-4 top-4 z-50 inline-flex h-8 w-8 items-center justify-center text-red-600 md:hidden"
        aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isMenuOpen ? (
          <span className="text-xl leading-none" aria-hidden>
            ✕
          </span>
        ) : (
          <span className="flex h-3.5 w-4 flex-col justify-between" aria-hidden>
            <span className="h-[2px] w-full rounded bg-red-600" />
            <span className="h-[2px] w-full rounded bg-red-600" />
            <span className="h-[2px] w-full rounded bg-red-600" />
          </span>
        )}
      </button>

      {/* Sidebar desktop */}
      <aside className="hidden border-r border-secondary-2 bg-white p-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col md:overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile (overlay) */}
      <div
        className={`fixed inset-0 z-[60] flex md:hidden ${
          isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div
          className={`flex w-64 shrink-0 flex-col border-r border-secondary-2 bg-white p-4 transition-transform duration-200 ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
        <button
          type="button"
          onClick={() => setIsMenuOpen(false)}
          className={`flex-1 bg-black/40 transition-opacity duration-200 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Fechar menu"
          tabIndex={isMenuOpen ? 0 : -1}
        />
      </div>

      {/* Modal de autenticação (login / criar conta) */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onMouseDown={(e) => {
            // Fecha ao clicar fora do modal (no backdrop).
            if (e.target !== e.currentTarget) return;
            setIsAuthModalOpen(false);
          }}
        >
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Entrar na Comunidade Rafa Portugal
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {authMode === 'forgot'
                    ? 'Informe o e-mail da sua conta para receber um código de recuperação.'
                    : authMode === 'resetPassword'
                      ? 'Introduza o código recebido por e-mail e defina uma nova senha.'
                      : 'Entre com o WhatsApp e a senha da sua conta.'}
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


            {authMode === 'login' ? (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError('');
                  setLoginLoading(true);
                  try {
                    if (loginMethod === 'email') {
                      await login({
                        email: loginEmail.trim(),
                        password: loginPassword,
                      });
                    } else {
                      await login({
                        whatsapp: loginWhatsapp,
                        password: loginPassword,
                      });
                    }
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
                {loginMethod === 'whatsapp' ? (
                  <LoginWhatsappFields
                    idPrefix="auth-modal"
                    value={loginWhatsapp}
                    onChange={setLoginWhatsapp}
                    disabled={loginLoading}
                    labelAction={
                      <LoginMethodSwitchLink
                        method={loginMethod}
                        onSwitch={(method) => {
                          setLoginMethod(method);
                          setLoginError('');
                        }}
                        disabled={loginLoading}
                      />
                    }
                  />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="auth-modal-email"
                        className="text-sm font-medium text-zinc-700"
                      >
                        E-mail
                      </label>
                      <LoginMethodSwitchLink
                        method={loginMethod}
                        onSwitch={(method) => {
                          setLoginMethod(method);
                          setLoginError('');
                        }}
                        disabled={loginLoading}
                      />
                    </div>
                    <input
                      id="auth-modal-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loginLoading}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                )}
                <AuthPasswordField
                  id="auth-password"
                  name="password"
                  label="Senha"
                  value={loginPassword}
                  onChange={(v) => {
                    setLoginPassword(v);
                    if (loginPasswordHydrated) persistLoginPasswordToStorage(v);
                  }}
                  required
                  autoComplete="current-password"
                  disabled={loginLoading}
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError('');
                      setForgotInfo('');
                      setForgotEmail(loginEmail.trim());
                      setAuthMode('forgot');
                    }}
                    className="cursor-pointer text-sm font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
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
                <p className="text-center text-sm text-zinc-600">
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthModalOpen(false);
                      window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
                    }}
                    className="cursor-pointer font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                  >
                    Criar conta
                  </button>
                </p>
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
                    const emailSent = forgotEmail.trim();
                    await api.auth.forgotPassword(emailSent);
                    setResetEmail(emailSent);
                    setAuthMode('resetPassword');
                    setResetCode('');
                    setResetPassword('');
                    setResetError('');
                    setResetInfo(
                      `Se existir uma conta com esse e-mail, enviámos um código de recuperação para ${emailSent}.`,
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
                    className="block text-sm font-medium text-zinc-700"
                  >
                    E-mail da conta
                  </label>
                  <input
                    id="auth-forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={forgotLoading}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
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
                    if (!resetEmail.trim()) {
                      throw new Error(
                        'E-mail para recuperação não encontrado. Volte a solicitar a recuperação de senha.',
                      );
                    }

                    const emailForReset = resetEmail.trim();

                    await api.auth.resetPassword({
                      email: emailForReset,
                      code: resetCode,
                      newPassword: resetPassword,
                    });

                    await login({
                      email: emailForReset,
                      password: resetPassword,
                    });
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
                  <AuthPasswordField
                    id="auth-reset-password"
                    label="Nova senha (mín. 6 caracteres)"
                    value={resetPassword}
                    onChange={setResetPassword}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    disabled={resetLoading}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={resetLoading}
                    onClick={() => {
                      setResetError('');
                      setResetInfo('');
                      setResetCode('');
                      setResetPassword('');
                      setForgotError('');
                      setForgotInfo('');
                      setForgotEmail(resetEmail);
                      setAuthMode('forgot');
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

      <main
        className={
          isDashboardHome
            ? 'flex-1 px-0 pt-16 pb-4 text-zinc-900 md:pt-6 md:pb-6'
            : 'flex-1 p-4 pt-16 text-zinc-900 md:p-6 md:pt-6'
        }
      >
        {children}
      </main>

      <SupportTicketRoot />
      <SiteFooter />

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
                A Comunidade Rafa Portugal foi criada para te acompanhar em cada etapa do
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
                Não deixa também de explorar o nosso guia{' '}
                <span className="font-semibold">
                  “Guia Portugal Sem Perrengue”
                </span>
                , um material vivo, construído e atualizado pela comunidade,
                para reunir as melhores práticas e informações mais recentes
                sobre o passo a passo da mudança.
              </p>
              <p>
                Todos os profissionais indicados aqui são{' '}
                <span className="font-semibold">parceiros de confiança</span> da
                Comunidade Rafa Portugal e, para além do suporte especializado, conseguimos
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
