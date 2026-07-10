import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type RetroGridProps = {
  className?: string;
  angle?: number;
  /** Fade inferior (estilo demo original). */
  withFade?: boolean;
  /** Cobre a metade superior com fade para o fundo da página. */
  maskTopHalf?: boolean;
};

export function RetroGrid({
  className,
  angle = 65,
  withFade = true,
  maskTopHalf = false,
}: RetroGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [perspective:200px]",
        className,
      )}
      style={{ "--grid-angle": `${angle}deg` } as CSSProperties}
      aria-hidden
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          className={cn(
            "retro-grid-scroll absolute [inset:0_0_auto_0] [margin-left:-50%] [transform-origin:100%_0_0]",
            "[background-repeat:repeat] [background-size:60px_60px] [height:300vh] [width:600vw]",
            "[background-image:linear-gradient(to_right,color-mix(in_srgb,var(--color-brand-primary)_38%,transparent)_1px,transparent_0),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-brand-primary)_38%,transparent)_1px,transparent_0)]",
          )}
        />
      </div>

      {withFade ? (
        <div className="absolute inset-0 bg-gradient-to-t from-page via-page/20 to-transparent to-55%" />
      ) : null}

      {maskTopHalf ? (
        <div className="absolute inset-0 bg-gradient-to-b from-page from-0% via-page via-50% to-transparent to-60%" />
      ) : null}
    </div>
  );
}
