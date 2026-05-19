"use client";

import { useState } from "react";
import { CardButton } from "@/components/ui/CardButton";
import {
  formatAdvertisingBalanceEur,
  HousePublicationStatusBadge,
} from "@/components/house/HousePublicationStatusBadge";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";

const PUBLICATION_COST_CENTS = 500;

const CITY_LABELS: Record<string, string> = {
  INTERIOR: "Interior",
  LISBOA: "Lisboa",
  PORTO: "Porto",
  BRAGA: "Braga",
  COIMBRA: "Coimbra",
  AVEIRO: "Aveiro",
  FARO: "Faro",
  ALGARVE: "Algarve",
  EVORA: "Évora",
  VISEU: "Viseu",
};

const TYPOLOGY_LABELS: Record<string, string> = {
  T0: "T0",
  T1: "T1",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap. partilhado",
};

const BUSINESS_TYPE_LABELS: Record<"RENT" | "SALE", string> = {
  RENT: "Arrendamento",
  SALE: "Venda",
};

export type HousePublishPreview = {
  id: string;
  houseId: number;
  title: string;
  description?: string;
  businessType: "RENT" | "SALE";
  typology: string;
  city: string;
  availableFrom: string;
  priceEur: string;
  imageUrls: string[];
  coverImageUrl?: string | null;
  videoPosterUrl?: string | null;
  publicationStatus: "PUBLISHED" | "HIDDEN";
  publishedUntil?: string | null;
};

type Props = {
  open: boolean;
  house: HousePublishPreview | null;
  balanceEurCents: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function formatDatePt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-PT");
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

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

  const descriptionPreview = house.description?.trim();

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
      aria-labelledby="publish-house-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="publish-house-title" className="text-lg font-semibold text-zinc-900">
          Publicar imóvel
        </h2>
        <p className="mt-2 text-sm font-medium text-zinc-700">
          5 € por publicação · 7 dias no site e WhatsApp
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {alreadyPublished
            ? "Este imóvel será reenviado aos grupos WhatsApp e a visibilidade no site será prolongada."
            : "Este imóvel será publicado no nosso site e nos grupos do WhatsApp."}
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          <div className="flex gap-4 p-4">
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  Sem foto
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-zinc-500">Id {house.houseId}</p>
              <p className="mt-0.5 text-base font-semibold leading-snug text-zinc-900">{house.title}</p>
              <div className="mt-2">
                <HousePublicationStatusBadge
                  publicationStatus={house.publicationStatus}
                  publishedUntil={house.publishedUntil}
                />
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-200 bg-white px-4 py-3 sm:grid-cols-3">
            <DetailItem
              label="Cidade"
              value={CITY_LABELS[house.city] ?? house.city}
            />
            <DetailItem
              label="Tipologia"
              value={TYPOLOGY_LABELS[house.typology] ?? house.typology}
            />
            <DetailItem
              label="Negócio"
              value={BUSINESS_TYPE_LABELS[house.businessType] ?? house.businessType}
            />
            <DetailItem label="Preço" value={`${house.priceEur} €`} />
            <DetailItem label="Disponível em" value={formatDatePt(house.availableFrom)} />
            {alreadyPublished && house.publishedUntil ? (
              <DetailItem
                label="Publicado até"
                value={formatDatePt(house.publishedUntil)}
              />
            ) : null}
          </dl>

          {descriptionPreview ? (
            <p className="border-t border-zinc-200 px-4 py-3 text-sm leading-relaxed text-zinc-600 line-clamp-3">
              {descriptionPreview}
            </p>
          ) : null}
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
          <CardButton type="button" variant="outline" onClick={onClose} disabled={loading}>
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
