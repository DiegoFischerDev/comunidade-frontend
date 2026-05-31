"use client";

import { useEffect, useState } from "react";
import { CardButton } from "@/components/ui/CardButton";
import {
  HousePublicationStatusBadge,
  isActivePublished,
} from "@/components/house/HousePublicationStatusBadge";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { formatHouseEurFieldDisplay } from "@/lib/format-eur-pt";
import {
  HOUSE_PUBLICATION_COST_EUR_CENTS,
  HOUSE_PUBLICATION_DURATION_DAYS,
  formatPublicationCostEur,
} from "@/lib/house-publication";
import { formatRelocationFeeEur } from "@/components/relocation/relocation-house-shared";
import {
  type HousePublishPreview,
  type PublishMissingField,
  type PublishMissingFieldKey,
  type PublishQuickDraft,
  PUBLISH_MISSING_FIELD_LABELS,
  buildQuickPatch,
  draftFromHouse,
  getMissingPublishFields,
  mergeHouseWithDraft,
} from "@/components/house/publish-house-quick-fields";

export type { HousePublishPreview } from "@/components/house/publish-house-quick-fields";

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

type Props = {
  open: boolean;
  house: HousePublishPreview | null;
  balanceEurCents: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onPatchQuickFields?: (
    patch: {
      title?: string;
      priceEur?: string;
      relocationFeeEur?: string;
      availableFrom?: string;
    },
  ) => Promise<void>;
  onUnpublish?: () => Promise<void>;
  onEdit?: () => void;
};

function formatDatePt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-PT");
}

const MAX_PREVIEW_PHOTOS = 6;

function HouseMediaPublishPreview({
  imageUrls,
  coverImageUrl,
  videoUrl,
  videoPosterUrl,
}: {
  imageUrls: string[];
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
}) {
  const photos = orderHouseImagesWithCoverFirst(imageUrls ?? [], coverImageUrl).slice(
    0,
    MAX_PREVIEW_PHOTOS,
  );
  const resolvedVideo = videoUrl ? resolveUploadsUrl(videoUrl) : null;
  const resolvedPoster = videoPosterUrl ? resolveUploadsUrl(videoPosterUrl) : null;
  const hasMedia = photos.length > 0 || resolvedVideo || resolvedPoster;

  if (!hasMedia) {
    return (
      <p className="text-sm text-zinc-500">Sem fotos nem vídeo neste imóvel.</p>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {photos.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveUploadsUrl(url)}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ))}
      {resolvedVideo ? (
        <div className="h-[4.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-black">
          <video
            src={resolvedVideo}
            poster={resolvedPoster ?? undefined}
            className="h-full w-full object-cover"
            controls
            muted
            playsInline
            preload="metadata"
            aria-label="Pré-visualização do vídeo"
          />
        </div>
      ) : resolvedPoster ? (
        <div className="relative h-[4.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedPoster}
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
            Vídeo
          </span>
        </div>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

function QuickFieldInput({
  fieldKey,
  draft,
  businessType,
  disabled,
  onDraftChange,
}: {
  fieldKey: PublishMissingFieldKey;
  draft: PublishQuickDraft;
  businessType: "RENT" | "SALE";
  disabled: boolean;
  onDraftChange: (next: PublishQuickDraft) => void;
}) {
  const label = PUBLISH_MISSING_FIELD_LABELS[fieldKey];
  const common =
    "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:bg-zinc-50";

  if (fieldKey === "relocationFeeEur") {
    return (
      <div>
        <label className="text-xs font-medium text-zinc-700">{label}</label>
        <input
          value={draft.relocationFeeEur}
          onChange={(e) =>
            onDraftChange({ ...draft, relocationFeeEur: e.target.value })
          }
          disabled={disabled}
          inputMode="decimal"
          placeholder="Ex.: 500"
          className={common}
        />
      </div>
    );
  }
  if (fieldKey === "priceEur") {
    return (
      <div>
        <label className="text-xs font-medium text-zinc-700">{label}</label>
        <input
          value={draft.priceEur}
          onChange={(e) => onDraftChange({ ...draft, priceEur: e.target.value })}
          disabled={disabled}
          inputMode="decimal"
          placeholder={
            businessType === "SALE" ? "Preço de venda" : "Renda mensal"
          }
          className={common}
        />
      </div>
    );
  }
  if (fieldKey === "title") {
    return (
      <div>
        <label className="text-xs font-medium text-zinc-700">{label}</label>
        <input
          value={draft.title}
          onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
          disabled={disabled}
          placeholder="Título do anúncio"
          className={common}
        />
      </div>
    );
  }
  if (fieldKey === "availableFrom") {
    return (
      <div>
        <label className="text-xs font-medium text-zinc-700">{label}</label>
        <input
          type="date"
          value={draft.availableFrom}
          onChange={(e) =>
            onDraftChange({ ...draft, availableFrom: e.target.value })
          }
          disabled={disabled}
          className={common}
        />
      </div>
    );
  }
  return null;
}

function PublishQuickFieldsSection({
  missing,
  draft,
  businessType,
  disabled,
  onDraftChange,
}: {
  missing: PublishMissingField[];
  draft: PublishQuickDraft;
  businessType: "RENT" | "SALE";
  disabled: boolean;
  onDraftChange: (next: PublishQuickDraft) => void;
}) {
  const quick = missing.filter((m) => m.quickEdit);
  if (quick.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
      <p className="text-sm font-semibold text-amber-950">Completar rapidamente</p>
      <p className="mt-0.5 text-xs text-amber-900/80">
        Preenche os campos em falta antes de publicar.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {quick.map((m) => (
          <QuickFieldInput
            key={m.key}
            fieldKey={m.key}
            draft={draft}
            businessType={businessType}
            disabled={disabled}
            onDraftChange={onDraftChange}
          />
        ))}
      </div>
    </div>
  );
}

function whatsAppGroupPublishDates(house: {
  whatsappSends?: { sentAt: string }[];
  whatsappSentAt: string | null;
}): string[] {
  const fromArray = (house.whatsappSends ?? [])
    .map((x) => x.sentAt)
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((iso) => new Date(iso).toLocaleDateString("pt-PT"));
  if (fromArray.length > 0) return fromArray.reverse();
  if (house.whatsappSentAt) {
    return [new Date(house.whatsappSentAt).toLocaleDateString("pt-PT")];
  }
  return [];
}

export function PublishHouseConfirmModal({
  open,
  house,
  balanceEurCents,
  onClose,
  onConfirm,
  onPatchQuickFields,
  onUnpublish,
  onEdit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"main" | "missing">("main");
  const [draft, setDraft] = useState<PublishQuickDraft>({
    relocationFeeEur: "",
    priceEur: "",
    title: "",
    availableFrom: "",
  });

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setUnpublishing(false);
      setError("");
      setPhase("main");
      return;
    }
    if (house) {
      setDraft(draftFromHouse(house));
      setPhase("main");
    }
  }, [open, house?.id]);

  if (!open || !house) return null;

  const effective = mergeHouseWithDraft(house, draft);
  const missingFields = getMissingPublishFields(effective);
  const activelyPublished = isActivePublished(
    house.publicationStatus,
    house.publishedUntil,
  );
  const canUnpublish = house.publicationStatus === "PUBLISHED" && Boolean(onUnpublish);

  const whatsAppDates = whatsAppGroupPublishDates(house);

  const busy = loading || unpublishing;

  const currentHouse = house;

  async function applyDraftIfNeeded() {
    if (!onPatchQuickFields) return;
    const patch = buildQuickPatch(currentHouse, draft);
    if (Object.keys(patch).length > 0) {
      await onPatchQuickFields(patch);
    }
  }

  async function runPublish() {
    setError("");
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível publicar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    const merged = mergeHouseWithDraft(currentHouse, draft);
    const missing = getMissingPublishFields(merged);
    if (missing.length > 0) {
      setPhase("missing");
      return;
    }
    try {
      await applyDraftIfNeeded();
      await runPublish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível guardar.");
      setLoading(false);
    }
  }

  async function handleSaveAndPublish() {
    const merged = mergeHouseWithDraft(currentHouse, draft);
    const stillMissing = getMissingPublishFields(merged).filter((m) => m.quickEdit);
    if (stillMissing.length > 0) {
      setError(
        `Ainda falta: ${stillMissing.map((m) => m.label.toLowerCase()).join(", ")}.`,
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      await applyDraftIfNeeded();
      await runPublish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível publicar.");
      setLoading(false);
    }
  }

  async function handlePublishAnyway() {
    setError("");
    setLoading(true);
    try {
      await applyDraftIfNeeded();
      await runPublish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível publicar.");
      setLoading(false);
    }
  }

  async function handleUnpublish() {
    if (!onUnpublish) return;
    setError("");
    setUnpublishing(true);
    try {
      await onUnpublish();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível remover a publicação.",
      );
    } finally {
      setUnpublishing(false);
    }
  }

  const publicationCostLabel = formatPublicationCostEur(HOUSE_PUBLICATION_COST_EUR_CENTS);
  const insufficient = balanceEurCents < HOUSE_PUBLICATION_COST_EUR_CENTS;

  const missingForPhase =
    phase === "missing"
      ? getMissingPublishFields(mergeHouseWithDraft(currentHouse, draft))
      : missingFields;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-house-title"
    >
      <div className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="publish-house-title" className="text-lg font-semibold text-zinc-900">
          {phase === "missing" ? "Informações em falta" : "Publicar imóvel"}
        </h2>
        <p className="mt-2 text-sm font-medium text-zinc-700">
          {publicationCostLabel} por publicação · {HOUSE_PUBLICATION_DURATION_DAYS} dias no site e
          WhatsApp
        </p>
        {phase === "main" ? (
          <p className="mt-1 text-sm text-zinc-600">
            {activelyPublished
              ? `Podes republicar (${publicationCostLabel}) ou remover a publicação para ocultar o anúncio no site.`
              : "Este imóvel será publicado no nosso site e nos grupos do WhatsApp."}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            Completa os dados em falta ou envia a publicação mesmo assim.
          </p>
        )}

        {phase === "missing" ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-950">Em falta:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-900/90">
              {missingForPhase.map((m) => (
                <li key={m.key}>{m.label}</li>
              ))}
            </ul>
            {missingForPhase.some((m) => m.key === "media") ? (
              <p className="mt-2 text-xs text-amber-800">
                Para fotos ou vídeo, usa o botão «Editar» no passo anterior.
              </p>
            ) : null}
          </div>
        ) : null}

        {phase === "main" ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          <div className="p-4">
            <p className="font-mono text-xs text-zinc-500">Id {house.houseId}</p>
            <p className="mt-0.5 text-base font-semibold leading-snug text-zinc-900">
              {house.title}
            </p>
            <div className="mt-2">
              <HousePublicationStatusBadge
                publicationStatus={house.publicationStatus}
                publishedUntil={house.publishedUntil}
              />
            </div>
            <div className="mt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Fotos e vídeo
              </p>
              <div className="mt-2">
                <HouseMediaPublishPreview
                  imageUrls={house.imageUrls}
                  coverImageUrl={house.coverImageUrl}
                  videoUrl={house.videoUrl}
                  videoPosterUrl={house.videoPosterUrl}
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
            <DetailItem
              label="Preço"
              value={formatHouseEurFieldDisplay(effective.priceEur)}
            />
            <DetailItem
              label="Taxa de relocation"
              value={formatRelocationFeeEur(effective.relocationFeeEur)}
            />
            <DetailItem
              label="Disponível em"
              value={formatDatePt(effective.availableFrom)}
            />
            {activelyPublished && house.publishedUntil ? (
              <DetailItem
                label="Publicado até"
                value={formatDatePt(house.publishedUntil)}
              />
            ) : null}
          </dl>

          <div className="border-t border-zinc-200 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Publicado nos grupos WhatsApp
            </p>
            {whatsAppDates.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                {whatsAppDates.map((date, index) => (
                  <li key={`${date}-${index}`} className="tabular-nums">
                    {date}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">Ainda sem publicações anteriores.</p>
            )}
          </div>
        </div>
        ) : null}

        <PublishQuickFieldsSection
          missing={missingForPhase}
          draft={draft}
          businessType={house.businessType}
          disabled={busy}
          onDraftChange={setDraft}
        />

        {insufficient && (
          <p className="mt-3 text-sm text-red-700">
            Saldo insuficiente. Adiciona saldo para continuar.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {phase === "missing" ? (
            <>
              <CardButton
                type="button"
                variant="outline"
                onClick={() => {
                  setPhase("main");
                  setError("");
                }}
                disabled={busy}
              >
                Voltar
              </CardButton>
              <CardButton
                type="button"
                variant="outline"
                onClick={() => void handlePublishAnyway()}
                disabled={busy || insufficient}
              >
                {loading ? "A processar…" : "Enviar assim mesmo"}
              </CardButton>
              <CardButton
                type="button"
                variant="primary"
                onClick={() => void handleSaveAndPublish()}
                disabled={busy || insufficient}
              >
                {loading ? "A processar…" : "Guardar e publicar"}
              </CardButton>
            </>
          ) : (
            <>
              <CardButton type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancelar
              </CardButton>
              {onEdit ? (
                <CardButton
                  type="button"
                  variant="outline"
                  onClick={onEdit}
                  disabled={busy}
                >
                  Editar
                </CardButton>
              ) : null}
              {canUnpublish ? (
                <CardButton
                  type="button"
                  variant="outline"
                  onClick={() => void handleUnpublish()}
                  disabled={busy}
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  {unpublishing ? "A remover…" : "Remover publicação"}
                </CardButton>
              ) : null}
              <CardButton
                type="button"
                variant="primary"
                onClick={() => void handleConfirm()}
                disabled={busy || insufficient}
              >
                {loading ? "A processar…" : `Enviar ${publicationCostLabel}`}
              </CardButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
