"use client";

import Image from "next/image";

type AffiliateProgramCardTopProps = {
  /** Altura da faixa de imagem (ex.: h-56 no card promocional completo) */
  imageHeightClass?: string;
};

export function AffiliateProgramCardTop({
  imageHeightClass = "h-56",
}: AffiliateProgramCardTopProps) {
  return (
    <>
      <div
        className={`relative mb-4 w-full overflow-hidden rounded-xl ${imageHeightClass}`}
      >
        <Image
          src="/afiliados.png"
          alt="Programa de afiliados"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 640px"
        />
      </div>
      <h2 className="text-base font-semibold text-zinc-900">Programa de Afiliados</h2>
      <p className="mt-1 text-sm font-medium text-zinc-700">Comissão por indicação</p>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
        <Image
          src="/euro2.png"
          alt="Comissão por indicação"
          width={18}
          height={18}
        />
        <span>€10 por indicação</span>
      </div>
    </>
  );
}
