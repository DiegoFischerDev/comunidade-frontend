import Link from 'next/link';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

/** Cor primária padrão da app (usada por CardButton e onde se referencia o CTA verde). */
export const cardButtonPrimaryClass =
  'bg-gradient-to-r from-[#055700] to-[#0a7a0a] text-white hover:from-[#044400] hover:to-[#055700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#055700]/80 focus-visible:ring-offset-2';

const variantClass: Record<Variant, string> = {
  primary: cardButtonPrimaryClass,
  secondary: 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
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

