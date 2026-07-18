export type DashboardExtraNavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

export const ADMIN_NAV_ITEMS: DashboardExtraNavItem[] = [
  {
    href: '/dashboard/users',
    label: 'Users',
    isActive: (pathname) => pathname === '/dashboard/users',
  },
  {
    href: '/dashboard/admin/agendamentos',
    label: 'Agendamentos',
    isActive: (pathname) => pathname === '/dashboard/admin/agendamentos',
  },
  {
    href: '/dashboard/admin/crm',
    label: 'CRM',
    isActive: (pathname) => pathname === '/dashboard/admin/crm',
  },
  {
    href: '/dashboard/admin/financeiro',
    label: 'Financeiro',
    isActive: (pathname) => pathname === '/dashboard/admin/financeiro',
  },
  {
    href: '/dashboard/admin/houses',
    label: 'Casas (anúncios)',
    isActive: (pathname) => pathname === '/dashboard/admin/houses',
  },
  {
    href: '/dashboard/admin/share-links',
    label: 'Links rastreados',
    isActive: (pathname) =>
      pathname === '/dashboard/admin/share-links' ||
      pathname.startsWith('/dashboard/admin/share-links/'),
  },
  {
    href: '/dashboard/admin/leads-gestoras',
    label: 'Leads gestoras',
    isActive: (pathname) => pathname === '/dashboard/admin/leads-gestoras',
  },
  {
    href: '/dashboard/partners',
    label: 'Parceiros',
    isActive: (pathname) => pathname === '/dashboard/partners',
  },
  {
    href: '/dashboard/admin/whatsapp-scan',
    label: 'Whatsapp scan',
    isActive: (pathname) => pathname === '/dashboard/admin/whatsapp-scan',
  },
];

export const RELOCATION_PARTNER_NAV_ITEMS: DashboardExtraNavItem[] = [
  {
    href: '/dashboard/casas',
    label: 'Minhas casas',
    isActive: (pathname) =>
      pathname === '/dashboard/casas' || pathname.startsWith('/dashboard/casas/'),
  },
  {
    href: '/dashboard/business',
    label: 'Minha empresa',
    isActive: (pathname) => pathname === '/dashboard/business',
  },
];

export const FINANCIAMENTO_PARTNER_NAV_ITEMS: DashboardExtraNavItem[] = [
  {
    href: '/dashboard/business',
    label: 'Minha empresa',
    isActive: (pathname) => pathname === '/dashboard/business',
  },
  {
    href: '/dashboard/leads',
    label: 'Meus leads',
    isActive: (pathname) => pathname === '/dashboard/leads',
  },
  {
    href: '/dashboard/proximo-contacto',
    label: 'Próximo contacto',
    isActive: (pathname) => pathname === '/dashboard/proximo-contacto',
  },
];
