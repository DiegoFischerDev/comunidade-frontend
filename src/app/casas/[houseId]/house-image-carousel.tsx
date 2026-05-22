"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { HorizontalSnapCarousel } from "@/components/ui/horizontal-snap-carousel";
import { isOurImageHostname } from "@/lib/site-url";

const AUTO_ADVANCE_MS = 4000;

function nextImageUnoptimized(resolvedUrl: string) {
  if (!resolvedUrl.startsWith("http")) return false;
  try {
    const h = new URL(resolvedUrl).hostname;
    if (isOurImageHostname(h)) return false;
    return true;
  } catch {
    return true;
  }
}

const SLIDE_CLASS =
  "relative flex-none w-full shrink-0 snap-center snap-always";

type Props = {
  photos: string[];
};

export function HouseImageCarousel({ photos }: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const autoPausedUntilRef = useRef(0);

  const getSlideStep = useCallback(() => {
    const el = trackRef.current;
    return el?.clientWidth || 1;
  }, []);

  const scrollToSlide = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = trackRef.current;
      if (!el || photos.length <= 1) return;
      const step = getSlideStep();
      const clamped = ((index % photos.length) + photos.length) % photos.length;
      el.scrollTo({ left: clamped * step, behavior });
      setSlideIndex(clamped);
    },
    [getSlideStep, photos.length],
  );

  const updateSlideIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el || photos.length <= 1) return;
    const step = getSlideStep();
    const idx = Math.round(el.scrollLeft / step);
    setSlideIndex(Math.min(Math.max(0, idx), photos.length - 1));
  }, [getSlideStep, photos.length]);

  const pauseAutoAdvance = useCallback(() => {
    autoPausedUntilRef.current = Date.now() + AUTO_ADVANCE_MS * 2;
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || photos.length <= 1) return;
    updateSlideIndex();
    const onScroll = () => updateSlideIndex();
    el.addEventListener("scroll", onScroll, { passive: true });
    const onUserScroll = () => pauseAutoAdvance();
    el.addEventListener("touchstart", onUserScroll, { passive: true });
    el.addEventListener("wheel", onUserScroll, { passive: true });
    const ro = new ResizeObserver(() => updateSlideIndex());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("touchstart", onUserScroll);
      el.removeEventListener("wheel", onUserScroll);
      ro.disconnect();
    };
  }, [photos.length, updateSlideIndex, pauseAutoAdvance]);

  useEffect(() => {
    if (photos.length <= 1) return;

    const tick = () => {
      if (Date.now() < autoPausedUntilRef.current) return;
      const el = trackRef.current;
      if (!el) return;
      const step = getSlideStep();
      const current = Math.round(el.scrollLeft / step);
      const wraps = current >= photos.length - 1;
      const next = wraps ? 0 : current + 1;
      scrollToSlide(next, wraps ? "auto" : "smooth");
    };

    const id = window.setInterval(tick, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [photos.length, getSlideStep, scrollToSlide]);

  if (photos.length === 0) return null;

  return (
    <div
      className={
        photos.length > 1
          ? "relative w-full bg-zinc-100"
          : "relative aspect-[16/10] w-full bg-zinc-100 sm:aspect-[2/1]"
      }
    >
      {photos.length === 1 ? (
        <div className="relative aspect-[16/10] w-full sm:aspect-[2/1]">
          <Image
            src={photos[0]}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized={nextImageUnoptimized(photos[0])}
          />
        </div>
      ) : (
        <HorizontalSnapCarousel
          slideCount={photos.length}
          ariaLabel="Fotografias do imóvel — deslize ou use as setas"
          className="w-full"
          trackRef={trackRef}
          navStyle="prominent"
          loop
          onNavInteract={pauseAutoAdvance}
        >
          {photos.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={`${SLIDE_CLASS} aspect-[16/10] sm:aspect-[2/1]`}
              aria-hidden={slideIndex !== i}
            >
              <Image
                src={src}
                alt={`Fotografia ${i + 1} de ${photos.length}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={i === 0}
                unoptimized={nextImageUnoptimized(src)}
              />
            </div>
          ))}
        </HorizontalSnapCarousel>
      )}

      {photos.length > 1 ? (
        <p
          className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium tabular-nums text-white"
          aria-live="polite"
        >
          {slideIndex + 1} / {photos.length}
        </p>
      ) : null}
    </div>
  );
}
