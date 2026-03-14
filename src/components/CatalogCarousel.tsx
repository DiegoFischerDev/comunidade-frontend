'use client';

import { useState } from 'react';

const STORY_ASPECT = 9 / 16; // vertical, tipo stories Instagram

type CatalogCarouselProps = {
  images: string[];
  /** URL base da API para imagens em /uploads/ (ex: http://localhost:3001) */
  apiBaseUrl?: string;
  className?: string;
};

function resolveSrc(url: string, apiBaseUrl?: string): string {
  if (!url) return '';
  if (url.startsWith('/uploads/') && apiBaseUrl) {
    return `${apiBaseUrl}${url}`;
  }
  return url;
}

export function CatalogCarousel({
  images,
  apiBaseUrl = '',
  className = '',
}: CatalogCarouselProps) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  if (total === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  // Mostrar 3: anterior, atual (centro, em cima), próximo
  const prevIdx = (index - 1 + total) % total;
  const nextIdx = (index + 1) % total;
  const triple = total >= 3 ? [prevIdx, index, nextIdx] : images.map((_, i) => i);
  const isCenterPos = (pos: number) =>
    total >= 3 ? pos === 1 : total === 1 ? pos === 0 : pos === 0;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative flex items-end justify-center gap-2 sm:gap-4">
        {triple.map((imgIdx, pos) => {
          const isCenter = isCenterPos(pos);
          const src = resolveSrc(images[imgIdx], apiBaseUrl);
          return (
            <div
              key={`${imgIdx}-${pos}`}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-md"
              style={{
                width: isCenter ? 160 : 120,
                aspectRatio: String(STORY_ASPECT),
                transform: isCenter ? 'translateY(-12px)' : undefined,
                zIndex: isCenter ? 10 : 1,
              }}
            >
              <img
                src={src}
                alt={`Catálogo ${imgIdx + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          );
        })}
      </div>
      {total > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
            aria-label="Anterior"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-zinc-600">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={next}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
            aria-label="Próximo"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
