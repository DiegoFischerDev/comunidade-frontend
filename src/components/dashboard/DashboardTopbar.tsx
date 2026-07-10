'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { CommunityWhatsappInviteModal } from '@/components/navigation/CommunityWhatsappInviteModal';
import { useAuth } from '@/contexts/AuthContext';
import { isActiveMember } from '@/lib/membership-access';
import { DASHBOARD_PUBLIC_NAV } from '@/lib/dashboard-public-nav';
import {
  ADMIN_NAV_ITEMS,
  FINANCIAMENTO_PARTNER_NAV_ITEMS,
  RELOCATION_PARTNER_NAV_ITEMS,
  type DashboardExtraNavItem,
} from '@/lib/dashboard-extra-nav';
import { DASHBOARD_HOME_PATH, isDashboardHomePath } from '@/lib/dashboard-home';
import {
  BRAND_LOGO_HORIZONTAL_COLORIDA_DARK_BG,
  SITE_NAME_FULL,
} from '@/lib/site-branding';

type Props = {
  /** Na home, oculto em scroll 0; visível quando scrollY > 0. */
  visible: boolean;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  isRelocationPartner: boolean;
  isFinanciamentoPartner: boolean;
};

function MenuIcon({ className }: { className?: string }) {
  return (
    <span className={`flex h-3.5 w-4 flex-col justify-between ${className ?? ''}`} aria-hidden>
      <span className="h-[2px] w-full rounded bg-current" />
      <span className="h-[2px] w-full rounded bg-current" />
      <span className="h-[2px] w-full rounded bg-current" />
    </span>
  );
}

function TopbarExtraNavDropdown({
  label,
  items,
  pathname,
}: {
  label: string;
  items: DashboardExtraNavItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasActiveItem = items.some((item) => item.isActive(pathname));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`dashboard-home-topbar-link inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
          hasActiveItem
            ? 'dashboard-home-topbar-link-active'
            : 'dashboard-home-topbar-link-inactive'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <span className="text-[0.65rem] opacity-80" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-1/2 top-[calc(100%+0.5rem)] z-50 min-w-[12.5rem] -translate-x-1/2 rounded-xl border border-white/10 bg-brand-primary-dark p-1.5 shadow-xl"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                item.isActive(pathname)
                  ? 'bg-brand-accent/20 font-semibold text-brand-accent'
                  : 'text-brand-on-primary/90 hover:bg-white/8 hover:text-brand-on-primary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardTopbar({
  visible,
  isMenuOpen,
  onMenuToggle,
  onOpenAuth,
  onLogout,
  isRelocationPartner,
  isFinanciamentoPartner,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const rawName = user?.name?.trim() ?? '';
  const displayName = rawName.split(' ')[0] || 'Visitante';

  const handleLogoClick = () => {
    if (typeof window === 'undefined') return;
    if (isDashboardHomePath(pathname)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    router.push(DASHBOARD_HOME_PATH);
  };

  const showAdminMenu = user?.role === 'ADMIN';
  const showPartnerMenu =
    user?.role === 'PARTNER' &&
    (isRelocationPartner || isFinanciamentoPartner);
  const partnerMenuItems = isRelocationPartner
    ? RELOCATION_PARTNER_NAV_ITEMS
    : isFinanciamentoPartner
      ? FINANCIAMENTO_PARTNER_NAV_ITEMS
      : [];

  return (
    <>
      <header
        className={`dashboard-home-topbar fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-out ${
          visible
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
        aria-hidden={!visible}
      >
        <div className="dashboard-home-topbar-shell border-b shadow-lg backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:h-[4.5rem] sm:gap-4 sm:px-6">
            <button
              type="button"
              onClick={handleLogoClick}
              className="dashboard-home-topbar-logo min-w-0 shrink cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary"
              aria-label="Ir para o início"
            >
              <Image
                src={BRAND_LOGO_HORIZONTAL_COLORIDA_DARK_BG}
                alt={SITE_NAME_FULL}
                width={720}
                height={192}
                className="h-11 w-auto max-w-[min(58vw,15rem)] object-contain object-left sm:h-12 sm:max-w-[18rem] md:h-14 md:max-w-none"
                priority
              />
            </button>

            <nav
              aria-label="Navegação principal"
              className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
            >
              {DASHBOARD_PUBLIC_NAV.map((item) => {
                const active = item.isActive(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`dashboard-home-topbar-link rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? 'dashboard-home-topbar-link-active'
                        : 'dashboard-home-topbar-link-inactive'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => setWhatsappModalOpen(true)}
                className="dashboard-home-topbar-link dashboard-home-topbar-link-inactive inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200"
              >
                <WhatsappIcon className="h-4 w-4 shrink-0 text-[#25D366]" />
                Grupos whatsapp
              </button>

              {showAdminMenu ? (
                <TopbarExtraNavDropdown
                  label="Admin"
                  items={ADMIN_NAV_ITEMS}
                  pathname={pathname}
                />
              ) : null}

              {showPartnerMenu ? (
                <TopbarExtraNavDropdown
                  label="Parceiro"
                  items={partnerMenuItems}
                  pathname={pathname}
                />
              ) : null}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {user ? (
                <div className="hidden items-center gap-2 md:flex">
                  {isActiveMember(user) ? (
                    <Image
                      src="/icon_vip.png"
                      alt="VIP"
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  ) : (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-sm font-semibold text-brand-primary"
                      aria-hidden
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[8rem] truncate text-sm font-medium text-brand-on-primary/95">
                    {displayName}
                  </span>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="cursor-pointer text-xs font-medium text-brand-on-primary/70 underline-offset-2 transition hover:text-brand-accent hover:underline"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="hidden cursor-pointer text-sm font-medium text-brand-on-primary/75 underline-offset-2 transition hover:text-brand-on-primary hover:underline md:inline-flex"
                >
                  Login
                </button>
              )}

              <button
                type="button"
                onClick={onMenuToggle}
                className="dashboard-home-topbar-menu inline-flex h-10 w-10 min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-[12px] transition active:scale-[0.97] md:hidden"
                aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? (
                  <span className="text-lg leading-none" aria-hidden>
                    ✕
                  </span>
                ) : (
                  <MenuIcon />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <CommunityWhatsappInviteModal
        open={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
      />
    </>
  );
}
