"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import type { BarItem } from "@/components/admin/HorizontalBarChart";

type VerticalBarChartProps = {
  title: string;
  description?: string;
  items: BarItem[];
  emptyMessage?: string;
  /** Mostra thumbnail/emoji acima de cada barra. */
  withLeading?: boolean;
  /** Controlos acima das barras (ex.: seletor de período). */
  toolbar?: ReactNode;
};

function VerticalLeading({
  emoji,
  imageUrl,
  label,
}: {
  emoji?: string | null;
  imageUrl?: string | null;
  label: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = !imgFailed && imageUrl ? resolveUploadsUrl(imageUrl) : "";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        title={label}
        className="mb-1.5 h-8 w-8 rounded-md border border-border object-cover bg-page"
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (emoji) {
    return (
      <span
        className="mb-1.5 flex h-8 w-8 items-center justify-center text-lg leading-none"
        aria-hidden
        title={label}
      >
        {emoji}
      </span>
    );
  }

  return <span className="mb-1.5 block h-8 w-8" aria-hidden />;
}

/**
 * Gráfico de barras verticais (CSS). Altura relativa ao máximo da série.
 */
export function VerticalBarChart({
  title,
  description,
  items,
  emptyMessage = "Sem dados para este filtro.",
  withLeading = false,
  toolbar,
}: VerticalBarChartProps) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0);
  const allZero = max === 0;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs text-muted">{description}</p>
      ) : null}
      {toolbar ? <div className="mt-4">{toolbar}</div> : null}

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-5 flex items-end gap-1 overflow-x-auto pb-1 sm:gap-1.5">
          {items.map((item) => {
            const heightPct = allZero
              ? 0
              : Math.max((item.count / max) * 100, item.count > 0 ? 4 : 0);
            return (
              <div
                key={item.key}
                className="flex min-w-[1.65rem] flex-1 flex-col items-center sm:min-w-[2.25rem]"
                title={`${item.label}${item.sublabel ? ` — ${item.sublabel}` : ""}: ${item.count}`}
              >
                {withLeading ? (
                  <VerticalLeading
                    emoji={item.leadingEmoji}
                    imageUrl={item.leadingImageUrl}
                    label={item.label}
                  />
                ) : null}
                <span className="mb-1 text-[10px] font-semibold tabular-nums text-foreground sm:text-[11px]">
                  {item.count}
                </span>
                <div className="flex h-36 w-full items-end justify-center">
                  <div
                    className={`w-full max-w-[2.25rem] rounded-t-md transition-[height] duration-500 ease-out ${
                      item.barClassName ?? "bg-brand-primary"
                    }`}
                    style={{ height: `${heightPct}%` }}
                    role="presentation"
                  />
                </div>
                <div className="mt-2 w-full truncate text-center text-[10px] leading-tight text-muted sm:text-xs">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
