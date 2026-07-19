"use client";

import { useState } from "react";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";

export type BarItem = {
  key: string;
  label: string;
  sublabel?: string | null;
  count: number;
  /** Cor da barra — default brand. */
  barClassName?: string;
  /** Emoji (ex. bandeira) ou URL de imagem. */
  leadingEmoji?: string | null;
  leadingImageUrl?: string | null;
};

type HorizontalBarChartProps = {
  title: string;
  description?: string;
  items: BarItem[];
  emptyMessage?: string;
  /** Total do filtro (para %); se omitido usa soma das barras. */
  totalForPercent?: number;
  /** Mostra avatar (emoji/imagem) à esquerda de cada barra. */
  withLeading?: boolean;
};

function BarLeadingVisual({
  emoji,
  imageUrl,
  label,
}: {
  emoji?: string | null;
  imageUrl?: string | null;
  label: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src =
    !imgFailed && imageUrl ? resolveUploadsUrl(imageUrl) : "";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URLs R2/uploads dinâmicas no admin
      <img
        src={src}
        alt=""
        title={label}
        className="h-9 w-9 shrink-0 rounded-md border border-border object-cover bg-page"
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (emoji) {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-page text-xl leading-none"
        aria-hidden
        title={label}
      >
        {emoji}
      </span>
    );
  }

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-page text-xs text-muted"
      aria-hidden
    >
      —
    </span>
  );
}

/**
 * Gráfico de barras horizontais só com CSS (largura relativa ao máximo da série).
 */
export function HorizontalBarChart({
  title,
  description,
  items,
  emptyMessage = "Sem dados para este filtro.",
  totalForPercent,
  withLeading = false,
}: HorizontalBarChartProps) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0);
  const sum =
    totalForPercent != null && totalForPercent > 0
      ? totalForPercent
      : items.reduce((s, i) => s + i.count, 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs text-muted">{description}</p>
      ) : null}

      {items.length === 0 || max === 0 ? (
        <p className="mt-6 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {items.map((item) => {
            const widthPct = max > 0 ? (item.count / max) * 100 : 0;
            const sharePct = sum > 0 ? (item.count / sum) * 100 : 0;
            return (
              <li key={item.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {withLeading ? (
                      <BarLeadingVisual
                        emoji={item.leadingEmoji}
                        imageUrl={item.leadingImageUrl}
                        label={item.label}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {item.label}
                      </div>
                      {item.sublabel ? (
                        <div className="truncate text-xs text-muted">
                          {item.sublabel}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <span className="text-sm font-semibold text-foreground">
                      {item.count}
                    </span>
                    <span className="ml-1.5 text-xs text-muted">
                      {sharePct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-page"
                  role="presentation"
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                      item.barClassName ?? "bg-brand-primary"
                    }`}
                    style={{
                      width: `${Math.max(widthPct, item.count > 0 ? 2 : 0)}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
