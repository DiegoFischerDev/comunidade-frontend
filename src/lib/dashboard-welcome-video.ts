/** Vídeo de boas-vindas da Comunidade Rafa Portugal (YouTube). */
export const DASHBOARD_WELCOME_YOUTUBE_VIDEO_ID = 'hZi7N6BOLJ4';

export function dashboardWelcomeYoutubeEmbedSrc(options?: {
  autoplay?: boolean;
}): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
  });
  if (options?.autoplay) {
    params.set('autoplay', '1');
  }
  return `https://www.youtube-nocookie.com/embed/${DASHBOARD_WELCOME_YOUTUBE_VIDEO_ID}?${params.toString()}`;
}
