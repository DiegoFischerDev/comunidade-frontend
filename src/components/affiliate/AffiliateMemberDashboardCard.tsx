"use client";

import { AffiliateProgramCardTop } from "@/components/affiliate/AffiliateProgramCardTop";

type AffiliateMemberDashboardCardProps = {
  affiliateCode: string;
  inviteLink: string;
  pendingTotal: number;
  paidTotal: number;
  className?: string;
};

export function AffiliateMemberDashboardCard({
  affiliateCode,
  inviteLink,
  pendingTotal,
  paidTotal,
  className = "",
}: AffiliateMemberDashboardCardProps) {
  return (
    <div
      className={`space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm ${className}`}
    >
      <AffiliateProgramCardTop imageHeightClass="h-56" />
      <p className="text-sm text-zinc-700">
        É um prazer ter você no time de afiliados da Comunidade RPM! Agora é só compartilhar, com a sua
        audiência, como a comunidade te ajudou no processo de imigração e convidar outras pessoas usando o
        seu link exclusivo.
      </p>
      <p className="text-sm text-zinc-700">
        Crie stories e conteúdos nas redes sociais para que mais imigrantes conheçam a comunidade. Assim,
        além de ajudar outras pessoas nesse caminho, você também pode receber uma renda extra no fim do
        mês. 🙂
      </p>
      <p>
        <span className="font-semibold">Código:</span> {affiliateCode || "—"}
      </p>
      <p className="break-all">
        <span className="font-semibold">Link:</span>{" "}
        {affiliateCode ? inviteLink : "—"}
      </p>
      <p>
        <span className="font-semibold">Comissões pendentes:</span> {pendingTotal.toFixed(2)}
      </p>
      <p>
        <span className="font-semibold">Comissões pagas:</span> {paidTotal.toFixed(2)}
      </p>
    </div>
  );
}
