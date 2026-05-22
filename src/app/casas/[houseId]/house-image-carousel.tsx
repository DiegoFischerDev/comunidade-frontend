"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { HorizontalSnapCarousel } from "@/components/ui/horizontal-snap-carousel";
import { isOurImageHostname } from "@/lib/site-url";

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
  "relative flex-none w-full shrink-0 snap-center snap-always cursor-pointer";

type Props = {
  photos: string[];
};

export function HouseImageCarousel({ photos }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const updateSlideIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el || photos.length <= 1) return;
    const step = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / step);
    setSlideIndex(Math.min(Math.max(0, idx), photos.length - 1));
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || photos.length <= 1) return;
    updateSlideIndex();
    el.addEventListener("scroll", updateSlideIndex, { passive: true });
    const ro = new ResizeObserver(() => updateSlideIndex());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateSlideIndex);
      ro.disconnect();
    };
  }, [photos.length, updateSlideIndex]);

  if (photos.length === 0) return null;

  const activeSrc = activeIndex !== null ? photos[activeIndex] : null;

  const mediaBlock = (
    <div
      className={
        photos.length > 1
          ? "relative w-full bg-zinc-100"
          : "relative aspect-[16/10] w-full bg-zinc-100 sm:aspect-[2/1]"
      }
    >
      {photos.length === 1 ? (
        <button
          type="button"
          className="relative block aspect-[16/10] w-full sm:aspect-[2/1]"
          onClick={() => setActiveIndex(0)}
          aria-label="Ampliar fotografia"
        >
          <Image
            src={photos[0]}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized={nextImageUnoptimized(photos[0])}
          />
        </button>
      ) : (
        <HorizontalSnapCarousel
          slideCount={photos.length}
          ariaLabel="Fotografias do imóvel — deslize ou use as setas"
          className="w-full"
          trackRef={trackRef}
        >
          {photos.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={`${SLIDE_CLASS} aspect-[16/10] sm:aspect-[2/1]`}
              onClick={() => setActiveIndex(i)}
              aria-label={`Ampliar fotografia ${i + 1} de ${photos.length}`}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                priority={i === 0}
                unoptimized={nextImageUnoptimized(src)}
              />
            </button>
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

  return (
    <>
      {mediaBlock}

      {activeSrc ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setActiveIndex(null)}
          role="presentation"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[4/3] max-h-[90vh] w-full overflow-hidden rounded-2xl bg-black">
              <Image
                src={activeSrc}
                alt=""
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={nextImageUnoptimized(activeSrc)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
