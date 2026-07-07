/** Página inicial autenticada / área principal (carrossel, vídeo de boas-vindas). */
export const DASHBOARD_HOME_PATH = '/' as const;

/** Raiz atual ou legado `/dashboard` (redirect). */
export function isDashboardHomePath(pathname: string): boolean {
  return pathname === DASHBOARD_HOME_PATH || pathname === '/dashboard';
}
