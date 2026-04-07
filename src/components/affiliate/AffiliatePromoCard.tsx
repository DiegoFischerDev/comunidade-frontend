"use client";

import { AffiliateProgramCardTop } from "@/components/affiliate/AffiliateProgramCardTop";
import { CardButton } from "@/components/ui/CardButton";

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
      <div className="mt-4">
        <CardButton type="button" onClick={onAction} variant="primary">
          {actionLabel}
        </CardButton>
      </div>
    </section>
  );
}
