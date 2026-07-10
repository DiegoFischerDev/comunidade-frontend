import {
  BRAND_HERO_AIRPLANE_CURSOR_BASE_ANGLE,
  BRAND_HERO_AIRPLANE_CURSOR_MAX_TILT,
} from "@/lib/site-branding";

/** Rotação em graus para o nariz seguir a posição horizontal do rato. */
export function getAirplaneCursorRotationDeg(
  clientX: number,
  viewportWidth: number,
): number {
  const width = Math.max(viewportWidth, 1);
  const normalizedX = clientX / width;
  const targetAngleFromUp =
    (0.5 - normalizedX) * 2 * BRAND_HERO_AIRPLANE_CURSOR_MAX_TILT;

  return targetAngleFromUp - BRAND_HERO_AIRPLANE_CURSOR_BASE_ANGLE;
}

/** Rotação em graus para o nariz apontar de (fromX, fromY) para (toX, toY). */
export function getAirplaneRotationTowardPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angleFromUpDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return angleFromUpDeg - BRAND_HERO_AIRPLANE_CURSOR_BASE_ANGLE;
}

export function lerpAngle(
  current: number,
  target: number,
  factor = 0.18,
): number {
  if (Math.abs(target - current) < 0.05) return target;
  return current + (target - current) * factor;
}
