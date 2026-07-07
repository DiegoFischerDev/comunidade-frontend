/**
 * Rodapé global do dashboard.
 */
import { SITE_NAME_FULL } from '@/lib/site-branding';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card px-6 py-8 text-center text-sm text-muted">
      <p className="max-w-prose mx-auto leading-relaxed">
        © {new Date().getFullYear()} {SITE_NAME_FULL}. Todos os direitos reservados.
      </p>
      <p className="mt-2">
        <a
          href="mailto:rafaapelomundo@gmail.com"
          className="text-brand-primary transition-colors hover:text-brand-accent"
        >
          rafaapelomundo@gmail.com
        </a>
      </p>
    </footer>
  );
}
