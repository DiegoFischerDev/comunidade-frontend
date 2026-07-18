/** Vídeo de boas-vindas da Move Casa Relocation (YouTube). */
export const DASHBOARD_WELCOME_YOUTUBE_VIDEO_ID = 'H3d9vOH3lNg';

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
