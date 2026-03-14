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
  const [paused, setPaused] = useState(false);
  const total = images.length;
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownAtRef = useRef<number>(0);
  const pointerXRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
    setProgress(0);
    startTimeRef.current = Date.now();
  }, [total]);

  // Auto-advance no mobile (quando paused = false)
  useEffect(() => {
    if (total <= 1 || paused) return;
    startTimeRef.current = Date.now();

    const tick = () => {
      if (paused) return;
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
  }, [index, paused, total, goNext]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pointerDownAtRef.current = Date.now();
    pointerXRef.current = e.clientX;
    setPaused(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    const holdDuration = Date.now() - pointerDownAtRef.current;
    const isTap = holdDuration <= 300;
    if (isTap && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = pointerXRef.current - rect.left;
      if (x > rect.width / 2) goNext();
      else goPrev();
    }
    pauseTimeoutRef.current = setTimeout(() => {
      setPaused(false);
      startTimeRef.current = Date.now();
      setProgress(0);
    }, 100);
  }, [goNext, goPrev]);


  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

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

      {/* Mobile: carrossel estilo stories — uma imagem, auto-avanço, segurar para pausar */}
      <div className="md:hidden">
        <div
          ref={containerRef}
          className="relative w-full mx-auto rounded-2xl overflow-hidden bg-black touch-none cursor-pointer"
          style={{ maxWidth: 'min(100%, 420px)', aspectRatio: String(STORY_ASPECT) }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Barras de progresso no topo (estilo Instagram) */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
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
            style={{ touchAction: 'none' }}
          />

        </div>
      </div>
    </div>
  );
}
