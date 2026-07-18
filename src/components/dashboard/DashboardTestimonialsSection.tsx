import {
  DASHBOARD_TESTIMONIAL_VIDEOS,
  dashboardTestimonialTitle,
  dashboardTestimonialYoutubeEmbedSrc,
  type DashboardTestimonialVideo,
} from '@/lib/dashboard-testimonials';
import { formatEurAmount } from '@/lib/dashboard-services';

const PLACEHOLDER_SLOTS = 3;

function QuoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="h-8 w-8 text-brand-primary/10"
    >
      <path d="M4.5 12.5c0-3.2 2.1-5.8 5.3-6.8.4-.1.8.2.8.6v2.4c0 .4-.3.7-.7.8-1.4.3-2.4 1.5-2.4 3 0 .6.5 1.1 1.1 1.1h2.4c.6 0 1.1.5 1.1 1.1v2.4c0 .6-.5 1.1-1.1 1.1H7.8c-1.8 0-3.3-1.5-3.3-3.3V12.5Zm10 0c0-3.2 2.1-5.8 5.3-6.8.4-.1.8.2.8.6v2.4c0 .4-.3.7-.7.8-1.4.3-2.4 1.5-2.4 3 0 .6.5 1.1 1.1 1.1h2.4c.6 0 1.1.5 1.1 1.1v2.4c0 .6-.5 1.1-1.1 1.1h-2.4c-1.8 0-3.3-1.5-3.3-3.3V12.5Z" />
    </svg>
  );
}

function TestimonialMetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 last:border-b-0">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function TestimonialVideoCard({ video }: { video: DashboardTestimonialVideo }) {
  const title = dashboardTestimonialTitle(video);

  return (
    <figure className="mx-auto flex w-full max-w-[280px] flex-col">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[18px] border border-border bg-black shadow-sm">
        <iframe
          src={dashboardTestimonialYoutubeEmbedSrc(video.youtubeId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <figcaption className="mt-3 px-0.5">
        <p className="text-base font-semibold tracking-tight text-foreground">
          {video.names}
        </p>
        <dl className="mt-2">
          <TestimonialMetaRow label="Origem" value={video.origin} />
          <TestimonialMetaRow label="Destino" value={video.destination} />
          <TestimonialMetaRow label="Tipologia" value={video.typology} />
          <TestimonialMetaRow
            label="Arrendamento"
            value={`€${formatEurAmount(video.rentEur)} / mês`}
          />
        </dl>
      </figcaption>
    </figure>
  );
}

function TestimonialPlaceholderCard({ index }: { index: number }) {
  return (
    <figure
      className="mx-auto flex aspect-[9/16] w-full max-w-[280px] flex-col items-center justify-center rounded-[18px] border border-dashed border-border bg-card p-6 text-center shadow-sm"
      aria-label={`Depoimento ${index + 1} — em breve`}
    >
      <QuoteIcon />
      <p className="mt-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        Em breve
      </p>
      <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-muted">
        Mais histórias de quem imigrou com a Move Casa.
      </p>
    </figure>
  );
}

type Props = {
  className?: string;
};

export function DashboardTestimonialsSection({ className = "" }: Props) {
  const videos = DASHBOARD_TESTIMONIAL_VIDEOS;
  const placeholderCount = Math.max(0, PLACEHOLDER_SLOTS - videos.length);

  return (
    <section
      className={`relative mx-auto w-full max-w-5xl px-4 py-10 md:px-2 md:py-14 ${className}`.trim()}
      aria-label="Depoimentos"
    >
      <div className="mb-6 text-center md:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Quem já imigrou
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Depoimentos
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-muted sm:text-base">
          Histórias de brasileiros que imigraram e se instalaram em Viseu ou São
          Pedro do Sul com a Move Casa.
        </p>
      </div>

      <div className="grid justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {videos.map((video) => (
          <TestimonialVideoCard key={video.youtubeId} video={video} />
        ))}
        {Array.from({ length: placeholderCount }, (_, index) => (
          <TestimonialPlaceholderCard
            key={`placeholder-${index}`}
            index={videos.length + index}
          />
        ))}
      </div>
    </section>
  );
}
