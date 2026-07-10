export function youtubeEmbedSrc(
  videoId: string,
  options?: { startSeconds?: number; autoplay?: boolean },
): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
  });
  if (options?.startSeconds) {
    params.set('start', String(options.startSeconds));
  }
  if (options?.autoplay) {
    params.set('autoplay', '1');
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
