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

/** Vídeo opcional do perfil do parceiro (antes do carrossel de imagens).
 *  Coluna centrada (~largura de telefone / story) para vídeos verticais não ocuparem toda a página em horizontal.
 */
export function PartnerCatalogVideo({
  videoUrl,
  apiBaseUrl = '',
  className = '',
}: PartnerCatalogVideoProps) {
  const src = resolveVideoSrc(videoUrl ?? '', apiBaseUrl);
  if (!src) return null;

  return (
    <section className={`flex flex-col items-center ${className}`.trim()}>
      <div className="w-full max-w-[min(100%,26rem)] sm:max-w-[min(100%,28rem)]">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-sm">
          <video
            src={src}
            controls
            playsInline
            preload="metadata"
            className="mx-auto block max-h-[min(92vh,780px)] w-full bg-black object-contain"
          >
            O teu navegador não suporta reprodução de vídeo.
          </video>
        </div>
      </div>
    </section>
  );
}
