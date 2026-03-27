"use client";

import { AffiliateProgramCardTop } from "@/components/affiliate/AffiliateProgramCardTop";

type AffiliatePromoCardProps = {
  onAction: () => void;
  actionLabel?: string;
  className?: string;
};

export function AffiliatePromoCard({
  onAction,
  actionLabel = "Quero participar",
  className = "w-full max-w-2xl",
}: AffiliatePromoCardProps) {
  return (
    <section className={`${className} rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm`}>
      <AffiliateProgramCardTop imageHeightClass="h-56" />
      <p className="mt-2 text-sm text-zinc-600">
        Ajude a nossa comunidade a crescer e seja recompensado por isso.
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        Convide pessoas com o seu link exclusivo. Quando alguém se tornar membro ativo da
        Comunidade RPM, você recebe comissão por indicação.
      </p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        {actionLabel}
      </button>
    </section>
  );
}
