/**
 * Rodapé global do dashboard.
 */
import Link from 'next/link';

import { SITE_NAME } from '@/lib/site-branding';

const RECLAME_AQUI_HREF = '/dashboard/reclame-aqui';
const PRIVACIDADE_HREF = '/privacidade';

const FOOTER_LINKS = [
  {
    href: PRIVACIDADE_HREF,
    label: 'Política de privacidade',
  },
  {
    href: RECLAME_AQUI_HREF,
    label: 'Suporte e reclamações',
  },
] as const;

const footerLinkClassName =
  'no-underline transition-colors hover:text-brand-primary';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 px-4 py-5 text-xs text-muted">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
        <p className="text-center sm:text-left">
          Copyright © {year} {SITE_NAME}. Todos os direitos reservados.
        </p>

        <nav aria-label="Links do rodapé">
          <ul className="flex flex-wrap items-center justify-center">
            {FOOTER_LINKS.map((link, index) => (
              <li key={link.href} className="flex items-center">
                {index > 0 ? (
                  <span className="mx-2 text-muted/50" aria-hidden>
                    |
                  </span>
                ) : null}
                <Link href={link.href} className={footerLinkClassName}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
