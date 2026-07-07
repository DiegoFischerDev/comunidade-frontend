'use client';

import { CardLinkButton } from '@/components/ui/CardButton';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { MagneticButton } from '@/components/ui/magnetic-button';
import { SITE_FOUNDERS_WHATSAPP_URL } from '@/lib/site-branding';

export function DashboardHomeHeroCta() {
  return (
    <MagneticButton className="block w-full sm:inline-block sm:w-auto" distance={0.55}>
      <CardLinkButton
        href={SITE_FOUNDERS_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        variant="secondary"
        className="w-full sm:w-auto md:min-h-[42px] md:px-4 md:text-sm lg:min-h-[clamp(42px,6cqh,52px)] lg:px-6 lg:text-[clamp(0.875rem,2cqh,1.125rem)]"
      >
        <WhatsappIcon className="h-5 w-5 shrink-0 text-current md:h-4 md:w-4 lg:h-[clamp(1rem,2.5cqh,1.5rem)] lg:w-[clamp(1rem,2.5cqh,1.5rem)]" />
        Quero falar com as meninas
      </CardLinkButton>
    </MagneticButton>
  );
}
