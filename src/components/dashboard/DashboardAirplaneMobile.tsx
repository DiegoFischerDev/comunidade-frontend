"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

import {
  getAirplaneCursorRotationDeg,
  lerpAngle,
} from "@/lib/airplane-cursor";
import {
  BRAND_HERO_AIRPLANE_CURSOR,
  BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X,
  BRAND_HERO_AIRPLANE_CURSOR_SIZE,
} from "@/lib/site-branding";

/** Oscilação suave em torno do centro da secção (fração da largura). */
const SWING_AMPLITUDE = 0.07;
const SWING_SPEED = 0.55;

type MobileAirplaneState = {
  x: number;
  rotation: number;
};

type Props = {
  sectionRef: RefObject<HTMLElement | null>;
};

export function DashboardAirplaneMobile({ sectionRef }: Props) {
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [airplane, setAirplane] = useState<MobileAirplaneState>({
    x: 0,
    rotation: 0,
  });

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    const animate = (time: number) => {
      if (!mobileQuery.matches) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const section = sectionRef.current;
      if (!section) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (startTimeRef.current === null) startTimeRef.current = time;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const elapsed = (time - startTimeRef.current) / 1000;
      const sectionWidth = section.offsetWidth;
      const normalizedX = reduceMotion
        ? 0.5
        : 0.5 + SWING_AMPLITUDE * Math.sin(elapsed * SWING_SPEED);
      const x = normalizedX * sectionWidth;
      const targetRotation = getAirplaneCursorRotationDeg(x, sectionWidth);
      const rotation = reduceMotion
        ? targetRotation
        : lerpAngle(rotationRef.current, targetRotation, 0.14);

      rotationRef.current = rotation;
      setAirplane({ x, rotation });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    };
  }, [sectionRef]);

  return (
    <img
      src={BRAND_HERO_AIRPLANE_CURSOR}
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute bottom-0 z-[20] select-none will-change-transform md:hidden"
      style={{
        left: airplane.x - BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X,
        width: BRAND_HERO_AIRPLANE_CURSOR_SIZE,
        height: BRAND_HERO_AIRPLANE_CURSOR_SIZE,
        transform: `rotate(${airplane.rotation}deg)`,
        transformOrigin: `${BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X}px ${BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X}px`,
      }}
    />
  );
}
