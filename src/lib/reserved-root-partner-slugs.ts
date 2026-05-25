/** Alinhado a `backend/src/partner/partner-public-slug.ts` — rotas da app no 1.º segmento. */
const RESERVED = new Set(
  [
    'api',
    '_next',
    'dashboard',
    'login',
    'registro',
    'casas',
    'partner',
    'privacidade',
    'whatsapp',
    'link',
    'lead-redirect',
    'imovel',
    'psp',
    'plano-de-imigracao',
    'relocation',
    'servicos',
    'agendamento',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
  ].map((s) => s.toLowerCase()),
);

export function isReservedRootPartnerSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}
