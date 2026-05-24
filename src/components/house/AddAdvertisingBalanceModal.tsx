"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CardButton } from "@/components/ui/CardButton";
import { formatEurWholeFromCents } from "@/lib/format-eur-pt";

const PRESETS_EUR = [10, 25, 50, 100];

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddAdvertisingBalanceModal({ open, onClose, onSuccess }: Props) {
  const [amountEur, setAmountEur] = useState("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setError("");
  }, [open]);

  if (!open) return null;

  async function handlePay() {
    setError("");
    const normalized = amountEur.replace(",", ".").trim();
    const euros = Number(normalized);
    if (!Number.isFinite(euros) || euros < 5) {
      setError("O valor mínimo é 5 €.");
      return;
    }
    if (euros > 500) {
      setError("O valor máximo é 500 €.");
      return;
    }
    const amountEurCents = Math.round(euros * 100);
    setLoading(true);
    try {
      const res = await api.partner.advertising.startTopupCheckout({ amountEurCents });
      onSuccess?.();
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-balance-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="add-balance-title" className="text-lg font-semibold text-zinc-900">
          Adicionar saldo
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Escolhe o valor a carregar (5 € – 500 €). O pagamento é feito por{" "}
          <span className="font-medium text-zinc-800">MB WAY</span>.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS_EUR.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmountEur(String(v))}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                amountEur === String(v)
                  ? "border-amber-600 bg-amber-50 text-amber-900"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {formatEurWholeFromCents(v * 100)}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-medium text-zinc-700">Valor (€)</label>
        <input
          type="text"
          inputMode="decimal"
          value={amountEur}
          onChange={(e) => setAmountEur(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="25"
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <CardButton type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </CardButton>
          <CardButton type="button" variant="primary" onClick={handlePay} disabled={loading}>
            {loading ? "A redirecionar…" : "Pagar com MB WAY"}
          </CardButton>
        </div>
      </div>
    </div>
  );
}
