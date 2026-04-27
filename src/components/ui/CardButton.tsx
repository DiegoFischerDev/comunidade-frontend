import Link from 'next/link';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'tertiary' | 'danger' | 'navGold';
type Size = 'sm' | 'md';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50';

/** Cor primária padrão da app (alinhada ao CTA “Contactar” dos cartões de imóveis). */
export const cardButtonPrimaryClass =
  'bg-gradient-to-r from-[#055700] to-[#0a7a0a] text-white font-semibold shadow-sm hover:from-[#044400] hover:to-[#055700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#055700]/80 focus-visible:ring-offset-2';

/**
 * Secundário = mesmo gradiente dourado dos itens principais activos do menu (Início, Plano, etc.).
 */
export const cardButtonSecondaryClass =
  'bg-gradient-to-r from-[#d58901] to-[#f0b23a] font-semibold text-white shadow-sm hover:from-[#c07c01] hover:to-[#e7a01f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/75 focus-visible:ring-offset-2';

/** Contorno claro (antigo “secondary” branco) — ações secundárias discretas. */
export const cardButtonOutlineClass =
  'font-semibold border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2';

/** Terciário = vermelho (cancelar, recusar, destaque de alerta). */
export const cardButtonTertiaryClass =
  'bg-gradient-to-r from-red-800 to-red-600 font-semibold text-white shadow-sm hover:from-red-900 hover:to-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 focus-visible:ring-offset-2';

/** Badge / etiqueta dourada (alinhada ao secundário e ao menu activo). */
export const cardBadgeGoldClass =
  'inline-flex items-center rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-2.5 py-1 text-[10px] font-bold tracking-widest text-white shadow-sm ring-1 ring-amber-200/90 ring-inset';

/** Dourado — alias de {@link cardButtonSecondaryClass} (CTA em cartões como Contactar). */
const cardButtonNavGoldClass = cardButtonSecondaryClass;

const variantClass: Record<Variant, string> = {
  primary: cardButtonPrimaryClass,
  secondary: cardButtonSecondaryClass,
  outline: cardButtonOutlineClass,
  tertiary: cardButtonTertiaryClass,
  danger: 'font-medium bg-red-600 text-white hover:bg-red-700',
  navGold: cardButtonNavGoldClass,
};

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2',
};

export const CardButton = forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
    className?: string;
    loading?: boolean;
  }
>(function CardButton(
  { variant = 'primary', size = 'md', fullWidth, className, loading, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={Boolean(disabled || loading)}
      className={cx(base, variantClass[variant], sizeClass[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </button>
  );
});

export function CardLinkButton({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, 'className'> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(base, variantClass[variant], sizeClass[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

