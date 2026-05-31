"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { isActiveMember } from "@/lib/membership-access";
import { COMMUNITY_WHATSAPP_GROUPS_URL } from "@/lib/community-whatsapp-groups";
import { AffiliateEnrollModal } from "@/components/affiliate/AffiliateEnrollModal";
import { DashboardImmigrationPlanSection } from "@/components/dashboard/DashboardImmigrationPlanSection";
import { DashboardWelcomeVideoPlayer } from "@/components/dashboard/DashboardWelcomeVideoPlayer";
type AffiliateMe = NonNullable<Awaited<ReturnType<typeof api.affiliate.me>>>;

/** Desktop: snap ao início; mobile: cartão centrado (~76vw) com ~12vw de “peek” de cada lado. */
const DASHBOARD_CARD_CAROUSEL_ITEM =
  'flex-none max-md:snap-center md:snap-start max-md:w-[76vw] max-md:max-w-[288px] w-[min(288px,calc(100vw-2.75rem))] sm:w-[272px] md:w-[288px]';

const DASHBOARD_CAROUSEL_IMAGE_SIZES = '(max-width: 767px) 76vw, 288px';

function getDashboardCarouselScrollStep(el: HTMLDivElement): number {
  const first = el.firstElementChild as HTMLElement | null;
  if (!first) return 300;
  const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 16;
  return first.getBoundingClientRect().width + gap;
}

const CAROUSEL_NAV_BTN =
  "absolute z-[26] top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border-0 bg-gradient-to-r from-[#d58901] to-[#f0b23a] p-0 text-white shadow-sm outline-none transition-all duration-300 ease-in-out md:h-12 md:w-12 " +
  "opacity-50 sm:opacity-0 sm:group-hover:opacity-50 sm:group-focus-within:opacity-50 " +
  "hover:bg-none hover:bg-[#d58901] hover:opacity-100 focus-visible:bg-none focus-visible:bg-[#d58901] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-30";

export default function DashboardPage() {
  const dashboardCarouselRef = useRef<HTMLDivElement | null>(null);
  const [carouselCanPrev, setCarouselCanPrev] = useState(false);
  const [carouselCanNext, setCarouselCanNext] = useState(true);

  const updateCarouselArrows = useCallback(() => {
    const el = dashboardCarouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const epsilon = 8;
    setCarouselCanPrev(scrollLeft > epsilon);
    setCarouselCanNext(scrollLeft < scrollWidth - clientWidth - epsilon);
  }, []);

  useEffect(() => {
    const el = dashboardCarouselRef.current;
    if (!el) return;
    updateCarouselArrows();
    el.addEventListener("scroll", updateCarouselArrows, { passive: true });
    const ro = new ResizeObserver(() => updateCarouselArrows());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateCarouselArrows);
      ro.disconnect();
    };
  }, [updateCarouselArrows]);

  const scrollDashboardCarousel = useCallback((dir: 1 | -1) => {
    const el = dashboardCarouselRef.current;
    if (!el) return;
    const step = getDashboardCarouselScrollStep(el);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  const { user } = useAuth();
  const isMember = isActiveMember(user);
  const canSeeAffiliateCard =
    isMember || user?.role === "PARTNER" || user?.role === "ADMIN";

  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateSaving, setAffiliateSaving] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const [affiliateTerms, setAffiliateTerms] = useState(false);
  const [affiliateInstagram, setAffiliateInstagram] = useState(
    user?.instagram
      ? user.instagram.startsWith("@")
        ? user.instagram
        : `@${user.instagram}`
      : "",
  );
  const [affiliatePayoutMethod, setAffiliatePayoutMethod] = useState<"MBWAY" | "PIX">("MBWAY");
  const [affiliateMbwayNumber, setAffiliateMbwayNumber] = useState("");
  const [affiliateMbwayName, setAffiliateMbwayName] = useState("");
  const [affiliatePixKey, setAffiliatePixKey] = useState("");
  const [affiliatePixName, setAffiliatePixName] = useState("");
  /** undefined = a carregar; null = sem perfil de afiliado */
  const [affiliate, setAffiliate] = useState<AffiliateMe | null | undefined>(undefined);

  useEffect(() => {
    setAffiliateInstagram(
      user?.instagram
        ? user.instagram.startsWith("@")
          ? user.instagram
          : `@${user.instagram}`
        : "",
    );
  }, [user?.instagram]);

  useEffect(() => {
    if (!user?.id || !canSeeAffiliateCard) {
      setAffiliate(undefined);
      return;
    }
    let cancelled = false;
    setAffiliate(undefined);
    (async () => {
      try {
        const data = await api.affiliate.me();
        if (!cancelled) setAffiliate(data ?? null);
      } catch {
        if (!cancelled) setAffiliate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, canSeeAffiliateCard]);

  async function handleAffiliateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAffiliateError("");
    setAffiliateSaving(true);
    try {
      await api.affiliate.enroll({
        instagramHandle: affiliateInstagram,
        termsAccepted: affiliateTerms,
        payoutMethod: affiliatePayoutMethod,
        mbwayNumber: affiliatePayoutMethod === "MBWAY" ? affiliateMbwayNumber : undefined,
        mbwayName: affiliatePayoutMethod === "MBWAY" ? affiliateMbwayName : undefined,
        pixKey: affiliatePayoutMethod === "PIX" ? affiliatePixKey : undefined,
        pixName: affiliatePayoutMethod === "PIX" ? affiliatePixName : undefined,
      });
      const data = await api.affiliate.me();
      setAffiliate(data ?? null);
      setAffiliateModalOpen(false);
    } catch (err) {
      setAffiliateError(
        err instanceof Error ? err.message : "Erro ao ativar programa de afiliados.",
      );
    } finally {
      setAffiliateSaving(false);
    }
  }

  return (
    <div className="space-y-0">
      <section className="w-full -mt-12 py-8 md:-mt-4 md:py-10">
        <h1 className="mb-4 px-4 text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl md:mb-6 md:px-0">
          Bem-vindo à comunidade Rafa Portugal
        </h1>
        <DashboardWelcomeVideoPlayer
          className="shadow-sm ring-1 ring-zinc-900/5 md:rounded-xl"
          title="Vídeo de boas-vindas — Comunidade Rafa Portugal"
        />
      </section>

      <div className="group relative mt-2 w-full px-0 md:mt-4 md:px-2">
        <button
          type="button"
          aria-label="Cartões anteriores"
          aria-disabled={!carouselCanPrev}
          disabled={!carouselCanPrev}
          onClick={() => scrollDashboardCarousel(-1)}
          className={`${CAROUSEL_NAV_BTN} left-0 md:left-2`}
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
          aria-label="Próximos cartões"
          aria-disabled={!carouselCanNext}
          disabled={!carouselCanNext}
          onClick={() => scrollDashboardCarousel(1)}
          className={`${CAROUSEL_NAV_BTN} right-0 md:right-2`}
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
        <div
          ref={dashboardCarouselRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-3 pt-1 [-webkit-overflow-scrolling:touch] overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-md:pl-[12vw] max-md:pr-[12vw] md:justify-center md:gap-5 md:px-0"
          aria-label="Conteúdo da comunidade — use os botões ou deslize para navegar"
        >
          <section
            className={`${DASHBOARD_CARD_CAROUSEL_ITEM} relative h-full min-h-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/80 shadow-sm transition-shadow hover:shadow-md`}
          >
            <Link
              href="/relocation/imoveis"
              className="group relative block min-w-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              aria-label="Imóveis disponíveis em Portugal"
            >
              <Image
                src="/rafa_cards/imoveis2.png"
                alt="Imóveis disponíveis em Portugal — alugar ou comprar"
                width={1250}
                height={1875}
                className="h-auto w-full object-contain transition group-hover:opacity-95"
                sizes={DASHBOARD_CAROUSEL_IMAGE_SIZES}
                priority
              />
            </Link>
          </section>
          <section
            className={`${DASHBOARD_CARD_CAROUSEL_ITEM} relative h-full min-h-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/80 shadow-sm transition-shadow hover:shadow-md`}
          >
            <Link
              href="/servicos"
              className="group relative block min-w-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              aria-label="Serviços que indico"
            >
              <Image
                src="/rafa_cards/services2.png"
                alt="Serviços que uso e indico — parceiros de confiança"
                width={1250}
                height={1875}
                className="h-auto w-full object-contain transition group-hover:opacity-95"
                sizes={DASHBOARD_CAROUSEL_IMAGE_SIZES}
                priority
              />
            </Link>
          </section>
          <section
            className={`${DASHBOARD_CARD_CAROUSEL_ITEM} relative h-full min-h-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/80 shadow-sm transition-shadow hover:shadow-md`}
          >
            <a
              href={COMMUNITY_WHATSAPP_GROUPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block min-w-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              aria-label="Grupos de ajuda WhatsApp — entrar e participar"
            >
              <Image
                src="/rafa_cards/grupos_whatsapp.png"
                alt="Grupos de ajuda WhatsApp — comunidade ativa, entre e participe"
                width={1250}
                height={1875}
                className="h-auto w-full object-contain transition group-hover:opacity-95"
                sizes={DASHBOARD_CAROUSEL_IMAGE_SIZES}
              />
            </a>
          </section>
        </div>

        <button
          type="button"
          aria-label="Cartão anterior no carrossel"
          disabled={!carouselCanPrev}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollDashboardCarousel(-1);
          }}
          className="pointer-events-auto absolute bottom-[8%] left-0 top-[8%] z-[18] m-0 hidden w-[12vw] min-w-[44px] cursor-pointer border-0 bg-transparent p-0 outline-none max-md:block md:hidden touch-manipulation disabled:pointer-events-none disabled:opacity-0 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        />
        <button
          type="button"
          aria-label="Próximo cartão no carrossel"
          disabled={!carouselCanNext}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollDashboardCarousel(1);
          }}
          className="pointer-events-auto absolute bottom-[8%] right-0 top-[8%] z-[18] m-0 hidden w-[12vw] min-w-[44px] cursor-pointer border-0 bg-transparent p-0 outline-none max-md:block md:hidden touch-manipulation disabled:pointer-events-none disabled:opacity-0 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        />
      </div>

      <DashboardImmigrationPlanSection />

      <AffiliateEnrollModal
        open={affiliateModalOpen}
        saving={affiliateSaving}
        error={affiliateError}
        instagram={affiliateInstagram}
        payoutMethod={affiliatePayoutMethod}
        mbwayNumber={affiliateMbwayNumber}
        mbwayName={affiliateMbwayName}
        pixKey={affiliatePixKey}
        pixName={affiliatePixName}
        termsAccepted={affiliateTerms}
        onClose={() => setAffiliateModalOpen(false)}
        onSubmit={handleAffiliateSubmit}
        onInstagramChange={setAffiliateInstagram}
        onPayoutMethodChange={setAffiliatePayoutMethod}
        onMbwayNumberChange={setAffiliateMbwayNumber}
        onMbwayNameChange={setAffiliateMbwayName}
        onPixKeyChange={setAffiliatePixKey}
        onPixNameChange={setAffiliatePixName}
        onTermsAcceptedChange={setAffiliateTerms}
      />
    </div>
  );
}
