import Image from 'next/image';
import type { ReactNode } from 'react';

import { CardLinkButton } from '@/components/ui/CardButton';
import { BRAND_SERVICES_SPECIALISTS_IMAGE } from '@/lib/site-branding';

type Props = {
  className?: string;
  layout?: 'sidebar' | 'footer' | 'modal';
  showFloatingCta?: boolean;
  floatingCta?: ReactNode;
};

function ServicesLearnMoreButton({ className = '' }: { className?: string }) {
  return (
    <CardLinkButton
      href="/servicos"
      variant="secondary"
      className={`min-w-[12rem] px-8 sm:min-w-[14rem] ${className}`.trim()}
    >
      Saber mais
    </CardLinkButton>
  );
}

export function ServicesSpecialistsImage({
  className = '',
  layout = 'sidebar',
  showFloatingCta = false,
  floatingCta,
}: Props) {
  const isSidebar = layout === 'sidebar';
  const isModal = layout === 'modal';

  return (
    <div
      className={`relative min-w-0 ${
        isModal
          ? ''
          : isSidebar
            ? 'h-full self-stretch p-2 sm:p-3 md:p-4'
            : '-mx-4 px-0'
      } ${className}`.trim()}
    >
      <div
        className={`relative w-full overflow-hidden ${
          isSidebar
            ? 'h-full min-h-[18rem] sm:min-h-[20rem]'
            : isModal
              ? 'min-h-[20rem] sm:min-h-[24rem]'
              : 'min-h-[19rem]'
        }`}
      >
        <div className="absolute inset-0 origin-top scale-[0.92] sm:scale-[0.94]">
          <Image
            src={BRAND_SERVICES_SPECIALISTS_IMAGE}
            alt="Especialistas Move Casa"
            fill
            sizes={
              isModal
                ? '(max-width: 640px) 100vw, 32rem'
                : isSidebar
                  ? '(max-width: 768px) 50vw, 50vw'
                  : '100vw'
            }
            className="object-cover object-top"
            priority={isModal}
          />
        </div>
        <div className="dashboard-services-specialists-fade" aria-hidden />

        {floatingCta || showFloatingCta ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 md:bottom-5">
            {floatingCta ? (
              <div className="pointer-events-auto">{floatingCta}</div>
            ) : (
              <ServicesLearnMoreButton className="pointer-events-auto w-[min(100%,18rem)] shadow-sm md:w-[min(100%,16rem)]" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
