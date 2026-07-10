/**
 * Rodapé global do dashboard.
 */
import Link from 'next/link';

import {
  SITE_CONTACT_EMAIL,
  SITE_FOUNDERS_WHATSAPP_DIGITS,
  SITE_NAME,
} from '@/lib/site-branding';

const RECLAME_AQUI_HREF = '/dashboard/reclame-aqui';
const PRIVACIDADE_HREF = '/privacidade';

const FOOTER_LINKS = [
  {
    href: PRIVACIDADE_HREF,
    label: 'Política de privacidade',
    Icon: ShieldIcon,
  },
  {
    href: RECLAME_AQUI_HREF,
    label: 'Dúvidas e reclamações',
    Icon: SupportTicketIcon,
  },
] as const;

const footerInteractiveClassName =
  'inline-flex items-center gap-1.5 no-underline transition-colors hover:text-brand-primary';

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SupportTicketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M13 8H7" />
      <path d="M17 12H7" />
    </svg>
  );
}

function formatContactPhone(digits: string): string {
  const normalized = digits.replace(/\D/g, '');
  if (normalized.length >= 12 && normalized.startsWith('351')) {
    const rest = normalized.slice(3);
    return `+351 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim();
  }
  return normalized ? `+${normalized}` : '';
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const contactPhone = formatContactPhone(SITE_FOUNDERS_WHATSAPP_DIGITS);

  return (
    <footer className="border-t border-border/60 px-4 py-5 text-xs text-muted md:px-6">
      <div className="mx-auto flex w-full flex-col items-center gap-3">
        <nav aria-label="Links e contactos do rodapé" className="w-full sm:w-auto">
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href} className="flex justify-center">
                <Link href={link.href} className={footerInteractiveClassName}>
                  <link.Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-snug">{link.label}</span>
                </Link>
              </li>
            ))}
            <li className="flex justify-center">
              <a
                href={`mailto:${SITE_CONTACT_EMAIL}`}
                className={footerInteractiveClassName}
              >
                <MailIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="break-all leading-snug sm:whitespace-nowrap sm:break-normal">
                  {SITE_CONTACT_EMAIL}
                </span>
              </a>
            </li>
            <li className="flex justify-center">
              <a
                href={`tel:+${SITE_FOUNDERS_WHATSAPP_DIGITS}`}
                className={footerInteractiveClassName}
              >
                <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap leading-snug">{contactPhone}</span>
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-center">
          {SITE_NAME} © {year} Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
