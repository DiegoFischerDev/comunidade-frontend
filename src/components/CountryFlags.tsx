import type { ImgHTMLAttributes } from 'react';

type Base = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>;

function baseProps(code: 'br' | 'pt', title: string) {
  const src = code === 'br' ? '/flags/brasil_apple.png' : '/flags/portugal_apple.png';
  return { src, alt: title, title } as const;
}

/** Bandeiras em PNG (ícones redondos padronizados). */
export function FlagBr({ className, ...rest }: Base) {
  return <img {...baseProps('br', 'Brasil')} className={className} loading="eager" {...rest} />;
}

export function FlagPt({ className, ...rest }: Base) {
  return <img {...baseProps('pt', 'Portugal')} className={className} loading="eager" {...rest} />;
}

/** Brazil + Portugal lado a lado (ex.: barra de menu, hero). */
export function BrPtFlagsRow({
  className = '',
  size = 'md',
  gapClassName = 'gap-1.5',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  gapClassName?: string;
}) {
  const sizeClass =
    size === 'sm'
      ? 'h-4 w-auto'
      : size === 'lg'
        ? 'h-7 w-auto sm:h-8'
        : size === 'hero'
          ? 'h-8 w-auto sm:h-10 md:h-12'
          : 'h-5 w-auto sm:h-6';
  return (
    <span
      className={`inline-flex items-center justify-center ${gapClassName} ${className}`.trim()}
      role="img"
      aria-label="Brasil e Portugal"
    >
      <FlagBr
        className={`${sizeClass} shrink-0 object-contain [aspect-ratio:1/1]`}
        alt=""
        title="Brasil"
      />
      <FlagPt
        className={`${sizeClass} shrink-0 object-contain [aspect-ratio:1/1]`}
        alt=""
        title="Portugal"
      />
    </span>
  );
}

/** Texto “Brasil → Portugal” com seta e bandeiras em todo o SO. */
export function ImmigrationRouteLabel({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
      <FlagBr
        className="h-[1.1em] w-auto shrink-0 object-contain [aspect-ratio:1/1] align-[-0.1em] sm:h-[1.15em]"
        title="Brasil"
      />
      <span aria-hidden className="text-zinc-500">→</span>
      <FlagPt
        className="h-[1.1em] w-auto shrink-0 object-contain [aspect-ratio:1/1] align-[-0.1em] sm:h-[1.15em]"
        title="Portugal"
      />
    </span>
  );
}
