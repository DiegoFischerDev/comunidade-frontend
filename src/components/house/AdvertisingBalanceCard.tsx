"use client";

import { CardButton } from "@/components/ui/CardButton";
import { formatEurWholeFromCents } from "@/lib/format-eur-pt";
import {
  HOUSE_PUBLICATION_COST_EUR_CENTS,
  HOUSE_PUBLICATION_DURATION_DAYS,
  formatPublicationCostEur,
} from "@/lib/house-publication";

type Props = {
  balanceEurCents: number;
  onAddBalance: () => void;
};

export function AdvertisingBalanceCard({ balanceEurCents, onAddBalance }: Props) {
  const canPublish = balanceEurCents >= HOUSE_PUBLICATION_COST_EUR_CENTS;

  return (
    <section
      className="mt-6 flex max-w-[450px] flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-labelledby="advertising-balance-heading"
    >
      <div className="min-w-0">
        <p
          id="advertising-balance-heading"
          className="text-xs font-medium text-zinc-600"
        >
          Saldo de publicidade
        </p>
        <p className="text-2xl font-bold tabular-nums text-zinc-900">
          {formatEurWholeFromCents(balanceEurCents)}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {formatPublicationCostEur()} por publicação · {HOUSE_PUBLICATION_DURATION_DAYS}{" "}
          dias no site e WhatsApp
          {!canPublish ? " · saldo insuficiente para publicar" : ""}
        </p>
      </div>

      <CardButton
        type="button"
        variant="outline"
        size="sm"
        onClick={onAddBalance}
        className="w-full shrink-0 font-medium sm:w-auto"
      >
        Adicionar saldo
      </CardButton>
    </section>
  );
}
