import Link from 'next/link';
import {
  forwardRef,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
  type Ref,
} from 'react';
import { BRAND_BUTTON_BASE } from '@/lib/brand-ui';

type Variant = 'primary' | 'secondary' | 'outline' | 'tertiary' | 'danger' | 'navGold';
type Size = 'sm' | 'md';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/** CTA primário — fundo verde com texto claro. */
export const cardButtonPrimaryClass = 'brand-cta-primary';

/** Secundário — contorno dourado, preenche no hover. */
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
  danger:
    'bg-red-700 font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40',
  navGold: cardButtonNavGoldClass,
};

const sizeClass: Record<Size, string> = {
  sm: 'min-h-[40px] px-4 text-sm',
  md: 'px-5',
};

type CardButtonOwnProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  loading?: boolean;
};

export function getCardButtonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: Pick<CardButtonOwnProps, 'variant' | 'size' | 'fullWidth' | 'className'>) {
  return cx(BRAND_BUTTON_BASE, variantClass[variant], sizeClass[size], fullWidth && 'w-full', className);
}

type CardButtonProps<T extends ElementType = 'button'> = CardButtonOwnProps & {
  as?: T;
  href?: ComponentProps<typeof Link>['href'];
} & Omit<ComponentPropsWithoutRef<T>, keyof CardButtonOwnProps | 'as' | 'href'>;

type CardButtonComponent = <T extends ElementType = 'button'>(
  props: CardButtonProps<T> & { ref?: Ref<Element> },
) => ReactElement | null;

function renderCardButton<T extends ElementType = 'button'>(
  {
    as,
    href,
    variant = 'primary',
    size = 'md',
    fullWidth,
    className,
    loading,
    disabled,
    children,
    ...rest
  }: CardButtonProps<T>,
  ref: Ref<Element>,
) {
  const classes = getCardButtonClassName({ variant, size, fullWidth, className });
  const isDisabled = Boolean(disabled || loading);

  if (href !== undefined) {
    const linkRest = rest as Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>;
    return (
      <Link
        href={href}
        ref={ref as Ref<HTMLAnchorElement>}
        className={cx(classes, isDisabled && 'pointer-events-none opacity-50')}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : linkRest.tabIndex}
        {...linkRest}
      >
        {children}
      </Link>
    );
  }

  const Component = (as || 'button') as ElementType;
  const componentRest = rest as ComponentPropsWithoutRef<typeof Component>;

  return (
    <Component
      ref={ref}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={Component !== 'button' && isDisabled ? true : undefined}
      className={classes}
      {...componentRest}
    >
      {children}
    </Component>
  );
}

/** Botão polimórfico — `button` por defeito, `href` para Link, ou `as` para outro elemento. */
export const CardButton = forwardRef(renderCardButton) as CardButtonComponent;

/** Atalho para links internos — equivalente a `<CardButton href={...} />`. */
export function CardLinkButton({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  loading,
  children,
  ...rest
}: Omit<ComponentProps<typeof Link>, 'className' | 'as'> &
  CardButtonOwnProps & {
    href: ComponentProps<typeof Link>['href'];
  }) {
  const isDisabled = Boolean(loading);

  return (
    <Link
      href={href}
      className={cx(
        getCardButtonClassName({ variant, size, fullWidth, className }),
        isDisabled && 'pointer-events-none opacity-50',
      )}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : rest.tabIndex}
      {...rest}
    >
      {children}
    </Link>
  );
}
