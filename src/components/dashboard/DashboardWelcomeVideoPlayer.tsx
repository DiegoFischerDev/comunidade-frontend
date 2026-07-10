import {
  dashboardWelcomeYoutubeThumbnailSrc,
} from '@/lib/dashboard-welcome-video';
import { SITE_NAME_FULL } from '@/lib/site-branding';

type Props = {
  className?: string;
  /** Título acessível do preview. */
  title?: string;
};

export function DashboardWelcomeVideoPlayer({
  className = '',
  title = `Vídeo de boas-vindas — ${SITE_NAME_FULL}`,
}: Props) {
  return (
    <div
      className={`relative mx-auto aspect-video w-full max-h-[500px] max-w-[min(100%,calc(500px*16/9))] overflow-hidden bg-black ${className}`.trim()}
      role="img"
      aria-label={`${title} — em breve`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dashboardWelcomeYoutubeThumbnailSrc('maxres')}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      <div className="absolute inset-0 bg-black/35" aria-hidden />

      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-1/2 w-[125%] -translate-x-1/2 -translate-y-1/2 -rotate-6 bg-brand-accent py-2.5 text-center shadow-lg sm:py-3">
          <span className="text-base font-bold uppercase tracking-[0.25em] text-white sm:text-lg">
            Em breve
          </span>
        </div>
      </div>
    </div>
  );
}
