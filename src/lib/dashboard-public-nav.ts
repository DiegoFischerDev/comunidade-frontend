import { DASHBOARD_HOME_PATH, isDashboardHomePath } from '@/lib/dashboard-home';

export type DashboardPublicNavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

/** Links principais do dashboard — partilhados entre sidebar e topbar da home. */
export const DASHBOARD_PUBLIC_NAV: DashboardPublicNavItem[] = [
  {
    href: DASHBOARD_HOME_PATH,
    label: 'Início',
    isActive: isDashboardHomePath,
  },
  {
    href: '/relocation/imoveis',
    label: 'Imóveis',
    isActive: (pathname) => pathname === '/relocation/imoveis',
  },
  {
    href: '/ofertas-trabalho',
    label: 'Empregos',
    isActive: (pathname) =>
      pathname === '/ofertas-trabalho' ||
      pathname.startsWith('/ofertas-trabalho/'),
  },
  {
    href: '/financiamento',
    label: 'Financiamento',
    isActive: (pathname) => pathname === '/financiamento',
  },
  {
    href: '/servicos',
    label: 'Serviços',
    isActive: (pathname) => pathname === '/servicos',
  },
];
