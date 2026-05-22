"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from "react";

const CAROUSEL_NAV_BTN_BASE =
  "absolute z-[26] top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border-0 bg-gradient-to-r from-[#d58901] to-[#f0b23a] p-0 text-white shadow-md outline-none transition-all duration-200 ease-in-out md:h-12 md:w-12 " +
  "hover:brightness-110 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40";

/** Setas discretas (dashboard): opacidade reduzida até hover. */
export const HORIZONTAL_CAROUSEL_NAV_BTN =
  `${CAROUSEL_NAV_BTN_BASE} opacity-50 sm:opacity-0 sm:group-hover:opacity-50 sm:group-focus-within:opacity-50 hover:opacity-100 focus-visible:opacity-100`;

/** Setas sempre visíveis e em destaque (ex.: fotos de imóveis). */
export const HORIZONTAL_CAROUSEL_NAV_BTN_PROMINENT =
  `${CAROUSEL_NAV_BTN_BASE} opacity-100`;

export const HORIZONTAL_CAROUSEL_TRACK =
  "flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth pb-0 pt-0 [-webkit-overflow-scrolling:touch] overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

function getCarouselScrollStep(el: HTMLDivElement): number {
  const first = el.firstElementChild as HTMLElement | null;
  if (!first) return el.clientWidth || 300;
  const gap =
    parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 0;
  return first.getBoundingClientRect().width + gap;
}

type HorizontalSnapCarouselProps = {
  children: ReactNode;
  /** Número de slides (para setas e acessibilidade). */
  slideCount: number;
  ariaLabel: string;
  className?: string;
  trackClassName?: string;
  /** Oculta setas quando só há um slide. */
  hideNavWhenSingle?: boolean;
  /** Ref opcional no contentor com scroll (ex.: contador de slides). */
  trackRef?: Ref<HTMLDivElement>;
  /** `prominent`: setas sempre opacas e coloridas; `subtle`: estilo do dashboard. */
  navStyle?: "subtle" | "prominent";
  /** Chamado quando o utilizador usa as setas (ex.: pausar auto-avanço). */
  onNavInteract?: () => void;
  /** Na última volta à primeira (e vice-versa); setas sempre ativas. */
  loop?: boolean;
};

export function HorizontalSnapCarousel({
  children,
  slideCount,
  ariaLabel,
  className = "",
  trackClassName = "",
  hideNavWhenSingle = true,
  trackRef: externalTrackRef,
  navStyle = "subtle",
  onNavInteract,
  loop = false,
}: HorizontalSnapCarouselProps) {
  const navBtnClass =
    navStyle === "prominent"
      ? HORIZONTAL_CAROUSEL_NAV_BTN_PROMINENT
      : HORIZONTAL_CAROUSEL_NAV_BTN;
  const internalTrackRef = useRef<HTMLDivElement | null>(null);
  const setTrackRef = useCallback(
    (el: HTMLDivElement | null) => {
      internalTrackRef.current = el;
      if (typeof externalTrackRef === "function") {
        externalTrackRef(el);
      } else if (externalTrackRef && "current" in externalTrackRef) {
        (externalTrackRef as MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [externalTrackRef],
  );
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(slideCount > 1);

  const updateArrows = useCallback(() => {
    if (loop && slideCount > 1) {
      setCanPrev(true);
      setCanNext(true);
      return;
    }
    const el = internalTrackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const epsilon = 8;
    setCanPrev(scrollLeft > epsilon);
    setCanNext(scrollLeft < scrollWidth - clientWidth - epsilon);
  }, [loop, slideCount]);

  useEffect(() => {
    const el = internalTrackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, slideCount]);

  const scrollByDir = useCallback(
    (dir: 1 | -1) => {
      onNavInteract?.();
      const el = internalTrackRef.current;
      if (!el) return;
      const step = getCarouselScrollStep(el);
      if (loop && slideCount > 1) {
        const current = Math.round(el.scrollLeft / step);
        const nextIndex = (current + dir + slideCount) % slideCount;
        const wraps =
          (dir === 1 && current >= slideCount - 1) ||
          (dir === -1 && current <= 0);
        el.scrollTo({
          left: nextIndex * step,
          behavior: wraps ? "auto" : "smooth",
        });
        return;
      }
      el.scrollBy({ left: dir * step, behavior: "smooth" });
    },
    [loop, slideCount, onNavInteract],
  );

  const showNav = slideCount > 1 || !hideNavWhenSingle;

  return (
    <div className={`group relative ${className}`.trim()}>
      {showNav ? (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            aria-disabled={!canPrev}
            disabled={!canPrev}
            onClick={() => scrollByDir(-1)}
            className={`${navBtnClass} left-2 md:left-3`}
          >
            <svg
              aria-hidden
              className="h-5 w-5 md:h-8 md:w-8"
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M9.78 4.22a.75.75 0 0 0-1.06 0L5.47 7.47a.75.75 0 0 0 0 1.06l3.25 3.25a.75.75 0 1 0 1.06-1.06L7.06 8l2.72-2.72a.75.75 0 0 0 0-1.06"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Imagem seguinte"
            aria-disabled={!canNext}
            disabled={!canNext}
            onClick={() => scrollByDir(1)}
            className={`${navBtnClass} right-2 md:right-3`}
          >
            <svg
              aria-hidden
              className="h-5 w-5 md:h-8 md:w-8"
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </>
      ) : null}
      <div
        ref={setTrackRef}
        className={`${HORIZONTAL_CAROUSEL_TRACK} ${trackClassName}`.trim()}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}
