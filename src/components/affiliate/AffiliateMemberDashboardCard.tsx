"use client";

import { useCallback, useState } from "react";
import { AffiliateProgramCardTop } from "@/components/affiliate/AffiliateProgramCardTop";

function CopyLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" fill="none" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" fill="none" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CommissionCurrencyMark({
  payoutMethod,
  variant,
}: {
  payoutMethod: "MBWAY" | "PIX";
  variant: "amber" | "emerald";
}) {
  const textClass = variant === "amber" ? "text-amber-950" : "text-emerald-950";
  const label = payoutMethod === "MBWAY" ? "Euro (€)" : "Real (R$)";

  return (
    <span
      className={`shrink-0 select-none font-semibold leading-none ${textClass}`}
      title={label}
      aria-hidden
    >
      {payoutMethod === "MBWAY" ? (
        <span className="text-xl">€</span>
      ) : (
        <span className="text-lg font-extrabold tracking-tight">R$</span>
      )}
    </span>
  );
}

function formatAmountForPayout(method: "MBWAY" | "PIX", value: number): string {
  return method === "MBWAY"
    ? new Intl.NumberFormat("pt-PT", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    : new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
}

type AffiliateMemberDashboardCardProps = {
  affiliateCode: string;
  inviteLink: string;
  payoutMethod: "MBWAY" | "PIX";
  pendingTotal: number;
  paidTotal: number;
  className?: string;
};

export function AffiliateMemberDashboardCard({
  affiliateCode,
  inviteLink,
  payoutMethod,
  pendingTotal,
  paidTotal,
  className = "",
}: AffiliateMemberDashboardCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "done" | "err">("idle");

  const copyLink = useCallback(async () => {
    if (!affiliateCode || !inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("err");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }, [affiliateCode, inviteLink]);

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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/90 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wide text-blue-900/70 uppercase">Código</p>
          <p className="mt-1 break-all font-mono text-lg font-bold tracking-tight text-blue-950">
            {affiliateCode || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-wide text-sky-900/70 uppercase">Link</p>
            {affiliateCode ? (
              <button
                type="button"
                onClick={() => void copyLink()}
                title={
                  copyState === "done"
                    ? "Copiado!"
                    : copyState === "err"
                      ? "Não foi possível copiar"
                      : "Copiar link"
                }
                aria-label={
                  copyState === "done"
                    ? "Link copiado"
                    : copyState === "err"
                      ? "Erro ao copiar o link"
                      : "Copiar link de afiliado"
                }
                className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-[0.96] ${
                  copyState === "done"
                    ? "border-emerald-300/80 bg-emerald-50 text-emerald-700 focus-visible:ring-emerald-400/60"
                    : copyState === "err"
                      ? "border-rose-300/80 bg-rose-50 text-rose-600 focus-visible:ring-rose-400/50"
                      : "border-sky-200/90 bg-white/90 text-sky-600 shadow-sm hover:border-sky-300 hover:bg-white hover:text-sky-800 focus-visible:ring-sky-400/50"
                }`}
              >
                {copyState === "done" ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <CopyLinkIcon className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>
          <p className="mt-1 break-all text-sm font-semibold leading-snug text-sky-950 sm:text-base">
            {affiliateCode ? inviteLink : "—"}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wide text-amber-900/70 uppercase">
            Comissões pendentes
          </p>
          <p className="mt-1 flex items-center gap-2.5">
            <CommissionCurrencyMark payoutMethod={payoutMethod} variant="amber" />
            <span className="text-2xl font-bold tabular-nums tracking-tight text-amber-950">
              {formatAmountForPayout(payoutMethod, pendingTotal)}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wide text-emerald-900/70 uppercase">
            Comissões pagas
          </p>
          <p className="mt-1 flex items-center gap-2.5">
            <CommissionCurrencyMark payoutMethod={payoutMethod} variant="emerald" />
            <span className="text-2xl font-bold tabular-nums tracking-tight text-emerald-950">
              {formatAmountForPayout(payoutMethod, paidTotal)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
