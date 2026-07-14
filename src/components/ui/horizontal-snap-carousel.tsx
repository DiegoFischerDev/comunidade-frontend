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

import { BRAND_CAROUSEL_NAV_BASE } from "@/lib/brand-ui";

const CAROUSEL_NAV_BTN_BASE = BRAND_CAROUSEL_NAV_BASE;

/** Setas discretas (dashboard): opacidade reduzida até hover. */
export const HORIZONTAL_CAROUSEL_NAV_BTN =
  `${CAROUSEL_NAV_BTN_BASE} opacity-50 sm:opacity-0 sm:group-hover:opacity-50 sm:group-focus-within:opacity-50 hover:opacity-100 focus-visible:opacity-100`;

/** Setas sempre visíveis (sem depender de hover no contentor). */
export const HORIZONTAL_CAROUSEL_NAV_BTN_VISIBLE =
  `${CAROUSEL_NAV_BTN_BASE} opacity-100`;

/** Mobile semitransparentes; desktop opacas (ofertas de trabalho). */
export const HORIZONTAL_CAROUSEL_NAV_BTN_FADE_MOBILE =
  `${CAROUSEL_NAV_BTN_BASE} opacity-50 max-md:opacity-50 md:opacity-100 hover:opacity-100 max-md:hover:opacity-100 focus-visible:opacity-100`;

/** Setas sempre visíveis e em destaque (ex.: fotos de imóveis). */
export const HORIZONTAL_CAROUSEL_NAV_BTN_PROMINENT =
  `${CAROUSEL_NAV_BTN_BASE} opacity-100`;

export const HORIZONTAL_CAROUSEL_TRACK =
  "flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth pb-0 pt-0 [-webkit-overflow-scrolling:touch] overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/**
 * Mobile: cartão centrado (~76vw) com ~12vw de “peek” do cartão anterior/seguinte.
 * Alinhado ao carrossel do dashboard principal.
 */
export const CENTERED_PEEK_CAROUSEL_ITEM =
  "flex-none max-md:snap-center md:snap-start max-md:w-[76vw] max-md:max-w-[288px]";

export const CENTERED_PEEK_CAROUSEL_TRACK =
  "gap-3 pb-3 pt-1 max-md:pl-[12vw] max-md:pr-[12vw] md:justify-center md:gap-5 md:px-0";

const CENTERED_PEEK_EDGE_BTN =
  "pointer-events-auto absolute bottom-[8%] top-[8%] z-[18] m-0 hidden w-[12vw] min-w-[44px] cursor-pointer border-0 bg-transparent p-0 outline-none max-md:block md:hidden touch-manipulation disabled:pointer-events-none disabled:opacity-0 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2";

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
  /**
   * `subtle`: discretas, aparecem sobretudo em hover (dashboard).
   * `visible`: sempre visíveis com opacidade estável.
   * `prominent`: sempre opacas a 100%.
   */
  navStyle?: "subtle" | "visible" | "prominent" | "fadeMobile";
  /** Chamado quando o utilizador usa as setas (ex.: pausar auto-avanço). */
  onNavInteract?: () => void;
  /** Na última volta à primeira (e vice-versa); setas sempre ativas. */
  loop?: boolean;
  /**
   * `inset`: setas sobre a faixa de scroll (predefinido).
   * `outset`: em `md+` as setas ficam fora, à esquerda/direita, sem tapar os slides.
   */
  navPlacement?: "inset" | "outset";
  /** Dashboard mobile: peek 12vw + zonas de toque nas laterais para avançar. */
  centeredPeek?: boolean;
  /** Oculta setas em ecrãs mobile (navegação por swipe). */
  hideNavOnMobile?: boolean;
  prevAriaLabel?: string;
  nextAriaLabel?: string;
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
  navPlacement = "inset",
  centeredPeek = false,
  hideNavOnMobile = false,
  prevAriaLabel = "Anterior",
  nextAriaLabel = "Seguinte",
}: HorizontalSnapCarouselProps) {
  const navPosPrev = centeredPeek
    ? navPlacement === "outset"
      ? "left-0 md:-left-14 lg:-left-16"
      : "left-0 md:left-2"
    : navPlacement === "outset"
      ? "left-2 md:-left-14 lg:-left-16"
      : "left-2 md:left-3";
  const navPosNext = centeredPeek
    ? navPlacement === "outset"
      ? "right-0 md:-right-14 lg:-right-16"
      : "right-0 md:right-2"
    : navPlacement === "outset"
      ? "right-2 md:-right-14 lg:-right-16"
      : "right-2 md:right-3";
  const navBtnClass =
    navStyle === "prominent"
      ? HORIZONTAL_CAROUSEL_NAV_BTN_PROMINENT
      : navStyle === "visible"
        ? HORIZONTAL_CAROUSEL_NAV_BTN_VISIBLE
        : navStyle === "fadeMobile"
          ? HORIZONTAL_CAROUSEL_NAV_BTN_FADE_MOBILE
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
  const hideNavMobileClass = hideNavOnMobile ? "max-md:hidden" : "";

  return (
    <div
      className={`group relative ${
        navPlacement === "outset" ? "overflow-visible" : ""
      } ${className}`.trim()}
    >
      {showNav ? (
        <>
          <button
            type="button"
            aria-label={prevAriaLabel}
            aria-disabled={!canPrev}
            disabled={!canPrev}
            onClick={() => scrollByDir(-1)}
            className={`${navBtnClass} ${navPosPrev} ${hideNavMobileClass}`}
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
            aria-label={nextAriaLabel}
            aria-disabled={!canNext}
            disabled={!canNext}
            onClick={() => scrollByDir(1)}
            className={`${navBtnClass} ${navPosNext} ${hideNavMobileClass}`}
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
      {centeredPeek && showNav ? (
        <>
          <button
            type="button"
            aria-label={`${prevAriaLabel} — toque na zona lateral`}
            disabled={!canPrev}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollByDir(-1);
            }}
            className={`${CENTERED_PEEK_EDGE_BTN} left-0`}
          />
          <button
            type="button"
            aria-label={`${nextAriaLabel} — toque na zona lateral`}
            disabled={!canNext}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollByDir(1);
            }}
            className={`${CENTERED_PEEK_EDGE_BTN} right-0`}
          />
        </>
      ) : null}
    </div>
  );
}
