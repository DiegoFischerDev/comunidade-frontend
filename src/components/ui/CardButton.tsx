import Link from 'next/link';
import { forwardRef } from 'react';
import { BRAND_BUTTON_BASE } from '@/lib/brand-ui';

type Variant = 'primary' | 'secondary' | 'outline' | 'tertiary' | 'danger' | 'navGold';
type Size = 'sm' | 'md';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** CTA primário — fundo verde com texto claro. */
export const cardButtonPrimaryClass = 'brand-cta-primary';

/** Secundário — destaque dourado. */
export const cardButtonSecondaryClass = 'brand-cta-accent';

/** Contorno claro — ações secundárias discretas. */
export const cardButtonOutlineClass =
  'border border-border bg-card font-semibold text-foreground/90 hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 focus-visible:ring-offset-2';

/** Terciário — vermelho (cancelar, recusar). */
export const cardButtonTertiaryClass =
  'bg-red-800 font-semibold text-white hover:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:ring-offset-2';

/** Badge com estilo da marca. */
export const cardBadgeGoldClass = 'brand-badge-accent';

const cardButtonNavGoldClass = cardButtonSecondaryClass;

const variantClass: Record<Variant, string> = {
  primary: cardButtonPrimaryClass,
  secondary: cardButtonSecondaryClass,
  outline: cardButtonOutlineClass,
  tertiary: cardButtonTertiaryClass,
  danger: 'bg-red-700 font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40',
  navGold: cardButtonNavGoldClass,
};

const sizeClass: Record<Size, string> = {
  sm: 'min-h-[40px] px-4 text-sm',
  md: 'px-5',
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
      className={cx(BRAND_BUTTON_BASE, variantClass[variant], sizeClass[size], fullWidth && 'w-full', className)}
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
      className={cx(BRAND_BUTTON_BASE, variantClass[variant], sizeClass[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
