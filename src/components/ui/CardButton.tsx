import Link from 'next/link';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variantClass: Record<Variant, string> = {
  primary: 'bg-[#efc2c1] text-zinc-900 hover:bg-[#e3afaf]',
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

