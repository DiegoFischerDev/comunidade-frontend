'use client';

import { dashboardWelcomeYoutubeEmbedSrc } from '@/lib/dashboard-welcome-video';
import { SITE_NAME_FULL } from '@/lib/site-branding';

type Props = {
  className?: string;
  /** Título acessível do iframe. */
  title?: string;
  autoplay?: boolean;
};

export function DashboardWelcomeVideoPlayer({
  className = '',
  title = `Vídeo de boas-vindas — ${SITE_NAME_FULL}`,
  autoplay = false,
}: Props) {
  return (
    <div
      className={`relative mx-auto aspect-video w-full max-h-[500px] max-w-[min(100%,calc(500px*16/9))] overflow-hidden bg-black ${className}`.trim()}
    >
      <iframe
        src={dashboardWelcomeYoutubeEmbedSrc({ autoplay })}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
