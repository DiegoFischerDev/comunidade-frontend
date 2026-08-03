'use client';

import Image from 'next/image';
import {
  AGENDAMENTO_PAGE_TITLE,
  BRAND_AGENDAMENTO_OG_IMAGE,
  BRAND_AGENDAMENTO_OG_IMAGE_HEIGHT,
  BRAND_AGENDAMENTO_OG_IMAGE_WIDTH,
} from '@/lib/site-branding';

/** Hero visual da página pública `/agendar` (mesma arte do Open Graph). */
export function AgendarHeroImage({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full overflow-hidden ${className}`.trim()}>
      <Image
        src={BRAND_AGENDAMENTO_OG_IMAGE}
        alt={AGENDAMENTO_PAGE_TITLE}
        width={BRAND_AGENDAMENTO_OG_IMAGE_WIDTH}
        height={BRAND_AGENDAMENTO_OG_IMAGE_HEIGHT}
        className="h-auto w-full"
        sizes="(max-width: 640px) 100vw, 32rem"
        priority
      />
    </div>
  );
}
