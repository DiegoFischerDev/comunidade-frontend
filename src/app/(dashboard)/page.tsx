"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { DashboardAirplaneMobile } from "@/components/dashboard/DashboardAirplaneMobile";
import { DashboardFaqSection } from "@/components/dashboard/DashboardFaqSection";
import { DashboardTestimonialsSection } from "@/components/dashboard/DashboardTestimonialsSection";
import { DashboardFeaturedHousesCarousel } from "@/components/dashboard/DashboardFeaturedHousesCarousel";
import { DashboardHomeHero } from "@/components/dashboard/DashboardHomeHero";
import { DashboardServicesSection } from "@/components/dashboard/DashboardServicesSection";
import { DashboardWelcomeVideoPlayer } from "@/components/dashboard/DashboardWelcomeVideoPlayer";
import { RetroGrid } from "@/components/ui/retro-grid";
import {
  getAirplaneRotationTowardPoint,
  lerpAngle,
} from "@/lib/airplane-cursor";
import {
  BRAND_HERO_AIRPLANE_CURSOR,
  BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X,
  BRAND_HERO_AIRPLANE_CURSOR_SIZE,
  BRAND_LOGO_HORIZONTAL_COLORIDA,
  SITE_FOUNDERS_WHATSAPP_URL,
  SITE_NAME_FULL,
} from "@/lib/site-branding";

type AirplaneCursorState = {
  x: number;
  y: number;
  visible: boolean;
  rotation: number;
};

export default function DashboardPage() {
  const immigrationCtaSectionRef = useRef<HTMLElement | null>(null);
  const immigrationCtaTargetRef = useRef<HTMLDivElement | null>(null);
  const airplaneTargetRotationRef = useRef(0);
  const airplaneRotationRef = useRef(0);
  const airplaneRafRef = useRef<number | null>(null);
  const [airplaneCursor, setAirplaneCursor] = useState<AirplaneCursorState>({
    x: 0,
    y: 0,
    visible: false,
    rotation: 0,
  });

  const syncAirplaneRotation = useCallback(() => {
    const next = lerpAngle(
      airplaneRotationRef.current,
      airplaneTargetRotationRef.current,
    );

    airplaneRotationRef.current = next;
    setAirplaneCursor((prev) =>
      prev.rotation === next ? prev : { ...prev, rotation: next },
    );

    if (Math.abs(next - airplaneTargetRotationRef.current) > 0.05) {
      airplaneRafRef.current = requestAnimationFrame(syncAirplaneRotation);
      return;
    }

    airplaneRafRef.current = null;
  }, []);

  const queueAirplaneRotation = useCallback(
    (rotation: number) => {
      airplaneTargetRotationRef.current = rotation;
      if (airplaneRafRef.current !== null) return;
      airplaneRafRef.current = requestAnimationFrame(syncAirplaneRotation);
    },
    [syncAirplaneRotation],
  );

  useEffect(() => {
    return () => {
      if (airplaneRafRef.current !== null) {
        cancelAnimationFrame(airplaneRafRef.current);
      }
    };
  }, []);

  const handleImmigrationCtaMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement;
      const isInteractive = Boolean(target.closest("a, button"));
      const ctaTarget = immigrationCtaTargetRef.current;
      const targetRect = ctaTarget?.getBoundingClientRect();
      const targetCenterX = targetRect
        ? targetRect.left + targetRect.width / 2
        : event.clientX;
      const targetCenterY = targetRect
        ? targetRect.top + targetRect.height / 2
        : event.clientY;
      const rotation = getAirplaneRotationTowardPoint(
        event.clientX,
        event.clientY,
        targetCenterX,
        targetCenterY,
      );

      queueAirplaneRotation(rotation);
      setAirplaneCursor((prev) => ({
        x: event.clientX,
        y: event.clientY,
        visible: !isInteractive,
        rotation: prev.rotation,
      }));
    },
    [queueAirplaneRotation],
  );

  const handleImmigrationCtaMouseLeave = useCallback(() => {
    setAirplaneCursor((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="space-y-0">
      <DashboardHomeHero />

      <section
        className="mx-auto w-full max-w-3xl px-4 py-8 md:px-0 md:py-10"
        aria-label="Vídeo de boas-vindas"
      >
        <h2 className="mb-4 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:mb-6">
          Sejam bem vindos
        </h2>
        <DashboardWelcomeVideoPlayer className="shadow-sm ring-1 ring-border md:rounded-xl" />
      </section>

      <DashboardServicesSection />

      <DashboardFeaturedHousesCarousel />

      <DashboardTestimonialsSection />

      <DashboardFaqSection />

      <section
        ref={immigrationCtaSectionRef}
        className="dashboard-immigration-cta-section group relative isolate w-full px-4 py-16 md:px-2 md:py-20"
        aria-label="Começar imigração com a Move Casa"
        onMouseMove={handleImmigrationCtaMouseMove}
        onMouseLeave={handleImmigrationCtaMouseLeave}
      >
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <RetroGrid maskTopHalf angle={60} withFade={false} />
        </div>

        <div
          ref={immigrationCtaTargetRef}
          className="relative z-10 flex min-h-[200px] -translate-y-4 items-center justify-center md:min-h-[280px] md:-translate-y-8"
        >
          <Link
            href={SITE_FOUNDERS_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-block origin-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 focus-visible:ring-offset-2 md:scale-[0.88] md:transition-transform md:duration-500 md:ease-out md:hover:scale-100"
            aria-label={`quero imigrar com a ${SITE_NAME_FULL} — WhatsApp`}
          >
            <Image
              src={BRAND_LOGO_HORIZONTAL_COLORIDA}
              alt=""
              width={1200}
              height={600}
              className="h-auto w-[min(100%,18rem)] sm:w-80"
              sizes="(max-width: 640px) 18rem, 20rem"
              aria-hidden
            />
            <span className="absolute left-1/2 top-[7%] z-10 w-full -translate-x-1/2 text-center text-xl tracking-tight text-brand-accent transition-colors group-hover:text-brand-accent-dark sm:text-2xl">
              quero imigrar com a
            </span>
          </Link>
        </div>

        <DashboardAirplaneMobile sectionRef={immigrationCtaSectionRef} />
      </section>

      {airplaneCursor.visible
        ? createPortal(
            <img
              src={BRAND_HERO_AIRPLANE_CURSOR}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none fixed z-[200] hidden select-none will-change-transform md:block"
              style={{
                left: airplaneCursor.x,
                top: airplaneCursor.y,
                width: BRAND_HERO_AIRPLANE_CURSOR_SIZE,
                height: BRAND_HERO_AIRPLANE_CURSOR_SIZE,
                marginLeft: -BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X,
                marginTop: -BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X,
                transform: `rotate(${airplaneCursor.rotation}deg)`,
                transformOrigin: `${BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X}px ${BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X}px`,
              }}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
