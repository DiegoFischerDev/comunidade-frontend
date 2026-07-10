import { youtubeEmbedSrc } from '@/lib/youtube-embed';

const CASOS_REAIS_VIDEOS = [
  {
    id: 'nSuXTX0z9Vk',
    title:
      '🏡 EP 8 | VALEU A PENA? VALOR E FINANCIAMENTO DA NOSSA CASA NUMA VILA NO INTERIOR DE PORTUGAL 🇵🇹',
    href: 'https://www.youtube.com/watch?v=nSuXTX0z9Vk',
  },
  {
    id: 'jgZy0endLm0',
    startSeconds: 14,
    title: '🏡 EP 12 | DEPOIS DE 1 ANO ESPERANDO… COMPRARAM A CASA EM 2 MESES! 😱',
    href: 'https://www.youtube.com/watch?v=jgZy0endLm0&t=14s',
  },
  {
    id: 'v04RVqeT9aQ',
    startSeconds: 19,
    title: '🏡 EP 13 | TIRANDO DÚVIDAS DOS INSCRITOS SOBRE CRÉDITO HABITAÇÃO 🇵🇹',
    href: 'https://www.youtube.com/watch?v=v04RVqeT9aQ&t=19s',
  },
] as const;

export function CasosReaisSection() {
  return (
    <section className="px-1 py-2 sm:px-0">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
          Casos reais
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Histórias de quem já financiou casa em Portugal
        </h2>
      </header>

      <ul className="mt-6 space-y-8">
        {CASOS_REAIS_VIDEOS.map((video) => (
          <li key={video.id}>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-sm">
              <iframe
                src={youtubeEmbedSrc(video.id, {
                  startSeconds: 'startSeconds' in video ? video.startSeconds : undefined,
                })}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
            <a
              href={video.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-base font-semibold leading-snug text-foreground underline-offset-2 hover:text-brand-primary hover:underline sm:text-lg"
            >
              {video.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
