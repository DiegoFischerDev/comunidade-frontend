"use client";

import { useEffect, useState } from "react";
import { CardButton } from "@/components/ui/CardButton";
import { HousePublicationStatusBadge } from "@/components/house/HousePublicationStatusBadge";
import {
  type HousePublishPreview,
} from "@/components/house/PublishHouseConfirmModal";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { formatHouseEurFieldDisplay } from "@/lib/format-eur-pt";
import {
  HOUSE_PUBLICATION_COST_EUR_CENTS,
  HOUSE_PUBLICATION_DURATION_DAYS,
  formatPublicationCostEur,
} from "@/lib/house-publication";

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

type Props = {
  open: boolean;
  houses: HousePublishPreview[];
  balanceEurCents: number;
  publishDelayMs: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function houseThumb(house: HousePublishPreview): string | null {
  const ordered = orderHouseImagesWithCoverFirst(house.imageUrls ?? [], house.coverImageUrl);
  if (ordered[0]) return resolveUploadsUrl(ordered[0]);
  if (house.videoPosterUrl) return resolveUploadsUrl(house.videoPosterUrl);
  return null;
}

export function PublishHousesBulkConfirmModal({
  open,
  houses,
  balanceEurCents,
  publishDelayMs,
  onClose,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError("");
    }
  }, [open]);

  if (!open || houses.length === 0) return null;

  const count = houses.length;
  const costCents = count * HOUSE_PUBLICATION_COST_EUR_CENTS;
  const costLabel = formatPublicationCostEur(costCents);
  const perLabel = formatPublicationCostEur(HOUSE_PUBLICATION_COST_EUR_CENTS);
  const insufficient = balanceEurCents < costCents;
  const estMin =
    count > 1 ? Math.ceil(((count - 1) * publishDelayMs) / 60_000) : 0;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-houses-bulk-title"
    >
      <div className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="shrink-0 p-6 pb-4">
          <h2 id="publish-houses-bulk-title" className="text-lg font-semibold text-zinc-900">
            Publicar {count} imóvel{count === 1 ? "" : "s"}
          </h2>
          <p className="mt-2 text-sm font-medium text-zinc-700">
            {perLabel} por publicação · {HOUSE_PUBLICATION_DURATION_DAYS} dias no site e WhatsApp
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Custo total: <span className="font-semibold text-zinc-900">{costLabel}</span>
            {count > 1 ? (
              <>
                {" "}
                · publicação em sequência com pelo menos {publishDelayMs / 1000} segundos entre
                cada
                {estMin > 0 ? ` (cerca de ${estMin} min no total)` : ""}
              </>
            ) : (
              ". Os imóveis serão publicados no site e nos grupos do WhatsApp."
            )}
          </p>
          {count > 1 ? (
            <p className="mt-2 text-xs text-zinc-500">
              Podes cancelar a fila na página enquanto publica; o imóvel em curso termina primeiro.
            </p>
          ) : null}
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto border-y border-zinc-200 px-6 py-3">
          {houses.map((house) => {
            const thumb = houseThumb(house);
            return (
              <li
                key={house.id}
                className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                      Sem foto
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-zinc-500">Id {house.houseId}</p>
                  <p className="truncate text-sm font-semibold text-zinc-900">{house.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {CITY_LABELS[house.city] ?? house.city} ·{" "}
                    {TYPOLOGY_LABELS[house.typology] ?? house.typology} ·{" "}
                    {formatHouseEurFieldDisplay(house.priceEur)}
                  </p>
                  <div className="mt-1.5">
                    <HousePublicationStatusBadge
                      publicationStatus={house.publicationStatus}
                      publishedUntil={house.publishedUntil}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 p-6 pt-4">
          {insufficient ? (
            <p className="text-sm text-red-700">
              Saldo insuficiente. São necessários {costLabel}; adiciona saldo para continuar.
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <CardButton type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </CardButton>
            <CardButton
              type="button"
              variant="primary"
              onClick={() => void handleConfirm()}
              disabled={loading || insufficient}
            >
              {loading ? "A iniciar…" : `Enviar ${costLabel}`}
            </CardButton>
          </div>
        </div>
      </div>
    </div>
  );
}
