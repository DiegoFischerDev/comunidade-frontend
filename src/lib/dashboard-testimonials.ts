import { youtubeEmbedSrc } from '@/lib/youtube-embed';

export type DashboardTestimonialVideo = {
  youtubeId: string;
  /** Nome(s) das pessoas no depoimento. */
  names: string;
  origin: string;
  destination: string;
  typology: string;
  /** Valor mensal do arrendamento em euros. */
  rentEur: number;
};

/** Depoimentos em vídeo (YouTube / Shorts). */
export const DASHBOARD_TESTIMONIAL_VIDEOS: DashboardTestimonialVideo[] = [
  {
    youtubeId: 'wvNK-rLifOQ',
    names: 'Thais, Fernando e Anita',
    origin: 'Viseu',
    destination: 'São Pedro do Sul',
    typology: 'T1',
    rentEur: 420,
  },
];

export function dashboardTestimonialYoutubeEmbedSrc(youtubeId: string): string {
  return youtubeEmbedSrc(youtubeId);
}

export function dashboardTestimonialTitle(video: DashboardTestimonialVideo): string {
  return `Depoimento de ${video.names}`;
}
