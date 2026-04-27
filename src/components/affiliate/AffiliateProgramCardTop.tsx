"use client";

import Image from "next/image";

const ALT =
  "Programa de afiliados — é uma honra ter você na equipe, vamos crescer juntos";

/**
 * Faixa visual do programa de afiliados (my-referrals): arte distinta em mobile vs desktop.
 */
export function AffiliateProgramCardTop() {
  return (
    <>
      <div className="relative mb-4 w-full overflow-hidden rounded-xl">
        <Image
          src="/rafa_cards/dashboard_afiliados_mobile.png"
          alt={ALT}
          width={1250}
          height={1875}
          className="h-auto w-full md:hidden"
          sizes="100vw"
          unoptimized
        />
        <Image
          src="/rafa_cards/dashboard_afiliados.png"
          alt={ALT}
          width={5000}
          height={2188}
          className="hidden h-auto w-full md:block"
          sizes="(max-width: 1280px) 100vw, 42rem"
          unoptimized
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
