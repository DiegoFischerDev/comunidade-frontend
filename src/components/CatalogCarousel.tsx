'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const STORY_ASPECT = 9 / 16;
const AUTO_ADVANCE_MS = 5000;

type CatalogCarouselProps = {
  images: string[];
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
  const [progress, setProgress] = useState(0);
  const total = images.length;
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastClickAtRef = useRef(0);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, [total]);

  // Auto-avanço contínuo; toque/click (mobile) apenas avança — sem pausa nem reset por “segurar”
  useEffect(() => {
    if (total <= 1) return;
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - (startTimeRef.current ?? 0);
      const p = Math.min(elapsed / AUTO_ADVANCE_MS, 1);
      setProgress(p);
      if (p >= 1) {
        goNext();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [index, total, goNext]);

  const handleMobileClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickAtRef.current < 200) return;
    lastClickAtRef.current = now;
    goNext();
  }, [goNext]);

  if (total === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop: ao passar o rato, a imagem fica absolute e cresce (scale) para ter espaço e destaque */}
      <div className="hidden md:flex w-full gap-2 sm:gap-3 overflow-visible pb-4 items-end">
        {images.map((url, i) => (
          <div
            key={i}
            className="flex-1 min-w-0 max-w-[25%] relative overflow-visible"
            style={{ aspectRatio: String(STORY_ASPECT) }}
          >
            <div
              className="absolute inset-0 rounded-xl border border-zinc-200 bg-zinc-100 overflow-hidden shadow-sm transition-transform duration-300 ease-out origin-center hover:z-10 hover:shadow-md hover:scale-105"
            >
              <img
                src={resolveSrc(url, apiBaseUrl)}
                alt={`Catálogo ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: uma imagem, auto-avanço; toque = próximo slide (sem pausa / sem “segurar para resetar”) */}
      <div className="md:hidden">
        <div
          role="button"
          tabIndex={0}
          aria-label="Ver imagem seguinte do catálogo"
          onClick={handleMobileClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              goNext();
            }
          }}
          className="relative w-full mx-auto rounded-2xl overflow-hidden bg-black cursor-pointer touch-manipulation"
          style={{ maxWidth: 'min(100%, 420px)', aspectRatio: String(STORY_ASPECT) }}
        >
          {/* Barras de progresso no topo (estilo stories) */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2 pointer-events-none">
            {images.map((_, i) => (
              <div
                key={i}
                className="h-0.5 flex-1 rounded-full bg-white/40 overflow-hidden"
              >
                <div
                  className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                  style={{
                    width:
                      i < index
                        ? '100%'
                        : i === index
                          ? `${progress * 100}%`
                          : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <img
            src={resolveSrc(images[index], apiBaseUrl)}
            alt={`Catálogo ${index + 1}`}
            className="absolute inset-0 h-full w-full object-contain bg-black"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
