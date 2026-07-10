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
  BRAND_LOGO_SQUARE,
  BRAND_LOGO_SQUARE_TRANSPARENT,
  SITE_NAME_FULL,
} from '@/lib/site-branding';
import {
  MEMBERSHIP_CHECKOUT_PATH,
  RAFA_CALL_CHECKOUT_PATH,
  OPEN_AUTH_LOGIN_EVENT,
  OPEN_MEMBERSHIP_MODAL_EVENT,
} from '@/lib/auth-ui-events';
import { isActiveMember } from '@/lib/membership-access';
import { SidebarWhatsAppGroupLinks } from '@/components/navigation/SidebarWhatsAppGroupLinks';
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
import { SiteFooter } from '@/components/site/SiteFooter';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import {
  ADMIN_NAV_ITEMS,
  FINANCIAMENTO_PARTNER_NAV_ITEMS,
  RELOCATION_PARTNER_NAV_ITEMS,
} from '@/lib/dashboard-extra-nav';
import {
  DASHBOARD_HOME_PATH,
  isDashboardHomePath,
} from '@/lib/dashboard-home';
import { DASHBOARD_PUBLIC_NAV } from '@/lib/dashboard-public-nav';
import {
  NAV_LINK_ACTIVE_CLASS,
  NAV_LINK_INACTIVE_CLASS,
  PAGE_SHELL_CLASS,
  SIDEBAR_NAV_CLASS,
  SIDEBAR_SHELL_CLASS,
} from '@/lib/brand-ui';


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
        className="block text-xs font-medium text-foreground/90"
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
          className="w-full rounded-lg border border-border py-2 pl-3 pr-10 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 disabled:opacity-50"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted transition hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
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
  const isDashboardHome = isDashboardHomePath(pathname);
  const isStandaloneCheckout =
    pathname === MEMBERSHIP_CHECKOUT_PATH || pathname === RAFA_CALL_CHECKOUT_PATH;
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
  const [isHomeTopbarRevealed, setIsHomeTopbarRevealed] = useState(false);
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
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerPublicSlug, setPartnerPublicSlug] = useState<string | null>(null);
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
      setPartnerId(null);
      setPartnerPublicSlug(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.partner.me();
        if (!cancelled) {
          setPartnerCategorySlug(me.categorySlug ?? null);
          setPartnerDisplayName(me.name?.trim() || null);
          setPartnerId(me.id ?? null);
          setPartnerPublicSlug(me.publicSlug?.trim() || null);
        }
      } catch {
        if (!cancelled) {
          setPartnerCategorySlug(null);
          setPartnerDisplayName(null);
          setPartnerId(null);
          setPartnerPublicSlug(null);
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

  // Fecha o menu mobile e repõe o scroll ao trocar de rota (layout partilhado não
  // garante scrollY === 0 no App Router).
  useEffect(() => {
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  // Na home, o topbar fica oculto em scroll 0 e aparece ao descer a página
  useEffect(() => {
    if (!isDashboardHome) {
      setIsHomeTopbarRevealed(true);
      return;
    }

    const syncTopbarVisibility = () => {
      setIsHomeTopbarRevealed(window.scrollY > 0);
    };

    syncTopbarVisibility();
    window.addEventListener('scroll', syncTopbarVisibility, { passive: true });
    return () => window.removeEventListener('scroll', syncTopbarVisibility);
  }, [isDashboardHome]);

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
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p className="text-foreground/90">Carregando…</p>
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
  const isFinanciamentoPartner =
    user?.role === 'PARTNER' && partnerCategorySlug === 'financiamento';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (typeof window === 'undefined') return;
              if (isDashboardHomePath(pathname)) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              router.push(DASHBOARD_HOME_PATH);
            }}
            className="cursor-pointer"
            aria-label="Ir para o início"
          >
            <Image
              src={BRAND_LOGO_SQUARE_TRANSPARENT}
              alt={SITE_NAME_FULL}
              width={800}
              height={800}
              className="h-28 w-28 object-contain sm:h-32 sm:w-32 md:hidden"
              priority
            />
            <Image
              src={BRAND_LOGO_SQUARE}
              alt={SITE_NAME_FULL}
              width={800}
              height={800}
              className="hidden h-28 w-28 object-contain sm:h-32 sm:w-32 md:block"
              priority
            />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3">
          <a
            href="https://www.instagram.com/rafaapelomundo/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-on-primary/25 bg-brand-on-primary/10 text-brand-on-primary shadow-sm transition hover:border-brand-on-primary/40 hover:bg-brand-on-primary/20 hover:shadow"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-secondary/40 bg-brand-on-primary/10 text-brand-secondary shadow-sm transition hover:border-brand-secondary hover:bg-brand-secondary/25 hover:shadow"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-on-primary/25 bg-brand-on-primary/10 text-brand-on-primary/90 shadow-sm transition hover:border-brand-on-primary/40 hover:bg-brand-on-primary/20 hover:shadow"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden>
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        </div>

        {/* Menu principal */}
        <nav className={`mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto p-1 pr-1 pb-3 ${SIDEBAR_NAV_CLASS}`}>
          {DASHBOARD_PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                item.isActive(pathname)
                  ? NAV_LINK_ACTIVE_CLASS
                  : NAV_LINK_INACTIVE_CLASS
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isRelocationPartner ? (
            <div className="brand-sidebar-divider mt-2 border-t pt-2">
              <p className="brand-sidebar-label px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide">
                Menu de parceiro
              </p>
              {RELOCATION_PARTNER_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    item.isActive(pathname)
                      ? NAV_LINK_ACTIVE_CLASS
                      : NAV_LINK_INACTIVE_CLASS
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            <>
          {user?.role === 'ADMIN' && (
            <div className="brand-sidebar-divider mt-2 border-t pt-2">
              <p className="brand-sidebar-label px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide">
                Menu de admin
              </p>
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    item.isActive(pathname)
                      ? NAV_LINK_ACTIVE_CLASS
                      : NAV_LINK_INACTIVE_CLASS
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
          {user?.role === 'PARTNER' && !isRelocationPartner ? (
            <div className="brand-sidebar-divider mt-2 border-t pt-2">
              <p className="brand-sidebar-label px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide">
                Menu de parceiro
              </p>
              {FINANCIAMENTO_PARTNER_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    item.isActive(pathname)
                      ? NAV_LINK_ACTIVE_CLASS
                      : NAV_LINK_INACTIVE_CLASS
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
            </>
          )}
          <SidebarWhatsAppGroupLinks />
        </nav>
      </div>

      {/* Rodapé (somente usuário/ação) */}
      <div className="mt-auto border-t brand-sidebar-divider pt-4 text-sm brand-sidebar-text-muted">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-[16px] font-semibold text-brand-primary">
                {sidebarDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold brand-sidebar-text">
                {sidebarDisplayName}
              </p>
              {user ? (
                user.role === 'ADMIN' || user.role === 'PARTNER' ? (
                  <p className="text-[10px] uppercase tracking-wide brand-sidebar-text-muted">
                    {roleLabel}
                    {isImpersonating && ' (modo admin)'}
                  </p>
                ) : isActiveMember(user) ? (
                  <div className="mt-0.5 min-w-0 space-y-0.5">
                    <p className="text-[10px] font-medium leading-tight brand-sidebar-text-muted">
                      Membro VIP
                      {isImpersonating && ' (modo admin)'}
                    </p>
                    {user.membershipExpiresAt ? (
                      <p className="text-[10px] leading-tight brand-sidebar-text-muted">
                        Válido até{' '}
                        <span className="font-medium brand-sidebar-text">
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
                  <p className="text-[10px] uppercase tracking-wide brand-sidebar-text-muted">
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
                className="cursor-pointer text-xs font-medium brand-sidebar-text-muted underline-offset-2 hover:text-brand-on-primary hover:underline"
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
                className="cursor-pointer text-xs font-medium brand-sidebar-text-muted underline-offset-2 hover:text-brand-on-primary hover:underline"
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
            className="mt-3 w-full cursor-pointer rounded-full border border-brand-on-primary/25 px-3 py-1.5 text-[11px] font-medium brand-sidebar-text hover:bg-brand-primary-light"
          >
            Voltar ao modo admin
          </button>
        )}
      </div>
    </div>
  );

  if (isStandaloneCheckout) {
    return (
      <>
        {children}
        <FloatingWhatsAppButton hideFloatingButton />
      </>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col ${PAGE_SHELL_CLASS}`}>
      {/* Preload de imagens usadas em modais (evita carregar só quando abre) */}
      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px] h-0 w-0 overflow-hidden opacity-0">
        <Image src="/rafa_cards/modal_novo_agendamento.png" alt="" width={256} height={256} priority />
        {/* Membership modal usa <img> com este SVG; pré-carrega via img escondida */}
        <img src="/comunidade_bg.svg" alt="" loading="eager" />
      </div>

      <DashboardTopbar
        visible={isDashboardHome ? isHomeTopbarRevealed || isMenuOpen : true}
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen((open) => !open)}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={() => logout()}
        isRelocationPartner={isRelocationPartner}
        isFinanciamentoPartner={isFinanciamentoPartner}
      />

      {/* Sidebar mobile (overlay) */}
      <div
        className={`fixed inset-0 z-[60] flex lg:hidden ${
          isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div
          className={`flex w-64 shrink-0 flex-col border-r p-4 transition-transform duration-200 ${SIDEBAR_SHELL_CLASS} ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
        <button
          type="button"
          onClick={() => setIsMenuOpen(false)}
          className={`flex-1 brand-modal-scrim transition-opacity duration-200 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Fechar menu"
          tabIndex={isMenuOpen ? 0 : -1}
        />
      </div>

      {/* Modal de autenticação (login / criar conta) */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto brand-modal-scrim p-4"
          onMouseDown={(e) => {
            // Fecha ao clicar fora do modal (no backdrop).
            if (e.target !== e.currentTarget) return;
            setIsAuthModalOpen(false);
          }}
        >
          <div className="my-8 w-full max-w-lg rounded-[18px] bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Acessar dashboard de parceiros
                </h2>
                <p className="mt-1 text-xs text-muted">
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted hover:bg-page"
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
                        className="text-sm font-medium text-foreground/90"
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
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 disabled:opacity-50"
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
                    className="cursor-pointer text-sm font-medium text-brand-primary underline-offset-2 hover:text-brand-primary hover:underline"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <CardButton
                  type="submit"
                  variant="secondary"
                  fullWidth
                  loading={loginLoading}
                >
                  {loginLoading ? 'Entrando…' : 'Entrar'}
                </CardButton>
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
                    className="block text-sm font-medium text-foreground/90"
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
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 disabled:opacity-50"
                  />
                </div>
                <CardButton
                  type="submit"
                  variant="secondary"
                  fullWidth
                  loading={forgotLoading}
                >
                  {forgotLoading ? 'Enviando código…' : 'Enviar código de recuperação'}
                </CardButton>
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
                      className="block text-xs font-medium text-foreground/90"
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
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
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
                    className="cursor-pointer text-[11px] font-medium text-brand-primary underline-offset-2 hover:text-brand-primary hover:underline disabled:opacity-50"
                  >
                    Reenviar código
                  </button>
                  <CardButton
                    type="submit"
                    variant="secondary"
                    size="sm"
                    loading={resetLoading}
                  >
                    {resetLoading ? 'Salvando…' : 'Salvar nova senha e entrar'}
                  </CardButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <main
        className={`flex-1 p-4 pb-0 text-foreground md:p-6 md:pb-0 ${
          isDashboardHome ? 'pt-16 lg:pt-6' : 'pt-16 lg:pt-24'
        }`}
      >
        {children}
      </main>

      <SiteFooter />

      <FloatingWhatsAppButton hideFloatingButton />

      {isWelcomeOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto brand-modal-scrim p-4">
          <div className="my-8 w-full max-w-3xl rounded-[18px] bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">
              Bem-vindo(a)
              {welcomeName ? `, ${welcomeName}` : ''}!
            </h2>
            <div className="mt-3 space-y-3 text-sm text-foreground/90">
              <p>
                A {SITE_NAME_FULL} foi criada para te acompanhar em cada etapa do
                teu processo de imigração para Portugal, com informação
                atualizada e apoio de quem já passou por aí.
              </p>
              <p>
                A partir de agora tens acesso a uma rede de{' '}
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
                {SITE_NAME_FULL} e, para além do suporte especializado, conseguimos
                negociar <span className="font-semibold">benefícios exclusivos</span>{' '}
                para membros, que podem ser aproveitados diretamente pela
                plataforma.
              </p>
              <p>
                Desejo que esta plataforma te traga clareza, segurança e boas
                conexões ao longo do caminho.{' '}
                <span className="font-semibold">Conta comigo no processo!</span>
              </p>
              <p className="text-sm font-medium text-foreground">
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
