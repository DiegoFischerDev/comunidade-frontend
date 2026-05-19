"use client";

import { useState } from "react";
import { CardButton } from "@/components/ui/CardButton";
import { formatAdvertisingBalanceEur } from "@/components/house/HousePublicationStatusBadge";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";

const PUBLICATION_COST_CENTS = 500;

type HousePreview = {
  id: string;
  title: string;
  imageUrls: string[];
  coverImageUrl?: string | null;
  videoPosterUrl?: string | null;
  publicationStatus: "PUBLISHED" | "HIDDEN";
  publishedUntil?: string | null;
};

type Props = {
  open: boolean;
  house: HousePreview | null;
  balanceEurCents: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function PublishHouseConfirmModal({
  open,
  house,
  balanceEurCents,
  onClose,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !house) return null;

  const ordered = orderHouseImagesWithCoverFirst(house.imageUrls ?? [], house.coverImageUrl);
  const thumb =
    ordered[0] != null
      ? resolveUploadsUrl(ordered[0])
      : house.videoPosterUrl
        ? resolveUploadsUrl(house.videoPosterUrl)
        : null;

  const alreadyPublished =
    house.publicationStatus === "PUBLISHED" &&
    house.publishedUntil &&
    new Date(house.publishedUntil) > new Date();

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível publicar.");
      setLoading(false);
    }
  }

  const insufficient = balanceEurCents < PUBLICATION_COST_CENTS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Publicar imóvel</h2>
        <p className="mt-2 text-sm text-zinc-600">
          {alreadyPublished
            ? "Este imóvel será reenviado aos grupos WhatsApp e a publicação no site será prolongada por mais 7 dias."
            : "Este imóvel será publicado no nosso site e nos grupos do WhatsApp por 1 semana."}
        </p>

        <div className="mt-4 flex gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                Sem foto
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-zinc-900">{house.title}</p>
        </div>

        <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
            Custo da publicidade
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-950">
            {formatAdvertisingBalanceEur(PUBLICATION_COST_CENTS)}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            Saldo atual: {formatAdvertisingBalanceEur(balanceEurCents)}
          </p>
        </div>

        {insufficient && (
          <p className="mt-3 text-sm text-red-700">
            Saldo insuficiente. Adiciona saldo para continuar.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <CardButton type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </CardButton>
          <CardButton
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || insufficient}
          >
            {loading ? "A processar…" : "Pagar e enviar"}
          </CardButton>
        </div>
      </div>
    </div>
  );
}
