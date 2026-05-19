"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import { CardButton } from "@/components/ui/CardButton";

function isPublishedActive(
  publicationStatus: "PUBLISHED" | "HIDDEN",
  publishedUntil: string | null,
): boolean {
  return (
    publicationStatus === "PUBLISHED" &&
    !!publishedUntil &&
    new Date(publishedUntil) > new Date()
  );
}

type Props = {
  houseId: string;
  partnerId: string;
  publicationStatus: "PUBLISHED" | "HIDDEN";
  publishedUntil: string | null;
};

export function HouseContactSection({
  houseId,
  partnerId,
  publicationStatus,
  publishedUntil,
}: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const openWhatsApp = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api.marketplace.houseContact(houseId);
      if (data.partnerId !== partnerId) {
        setError("Este anúncio não corresponde ao parceiro indicado.");
        setBusy(false);
        return;
      }
      if (
        !isPublishedActive(data.publicationStatus, data.publishedUntil)
      ) {
        setError("Este imóvel já não está disponível.");
        setBusy(false);
        return;
      }
      window.location.assign(`/imovel?id=${encodeURIComponent(String(data.houseId))}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível abrir o contacto.",
      );
      setBusy(false);
    }
  }, [houseId, partnerId]);

  if (!isPublishedActive(publicationStatus, publishedUntil)) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        Este anúncio não está disponível no momento. Explora outros imóveis na{" "}
        <Link href="/relocation/imoveis" className="font-medium text-amber-800 underline">
          listagem Relocation
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <CardButton
        type="button"
        variant="primary"
        disabled={busy}
        onClick={() => {
          void openWhatsApp();
        }}
        className="w-full rounded-xl px-5 py-3.5 sm:w-auto"
      >
        {busy ? "A abrir…" : "Contactar no WhatsApp"}
      </CardButton>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
