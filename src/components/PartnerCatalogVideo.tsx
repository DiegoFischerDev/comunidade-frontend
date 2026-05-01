type PartnerCatalogVideoProps = {
  videoUrl: string | null | undefined;
  apiBaseUrl?: string;
  className?: string;
};

function resolveVideoSrc(url: string, apiBaseUrl = ''): string {
  const u = url.trim();
  if (!u) return '';
  if (u.startsWith('/uploads/') && apiBaseUrl) {
    const base = apiBaseUrl.replace(/\/$/, '');
    return `${base}${u}`;
  }
  return u;
}

/** Vídeo opcional do perfil do parceiro (antes do carrossel de imagens). */
export function PartnerCatalogVideo({
  videoUrl,
  apiBaseUrl = '',
  className = '',
}: PartnerCatalogVideoProps) {
  const src = resolveVideoSrc(videoUrl ?? '', apiBaseUrl);
  if (!src) return null;

  return (
    <section className={className}>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-sm">
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="max-h-[min(70vh,540px)] w-full object-contain"
        >
          O teu navegador não suporta reprodução de vídeo.
        </video>
      </div>
    </section>
  );
}
