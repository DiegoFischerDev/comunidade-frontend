"use client";

import Link from "next/link";
import { PublishHouseRowButton } from "@/components/house/PublishHouseRowButton";
import { formatHouseEurFieldDisplay } from "@/lib/format-eur-pt";
import { formatHouseEntradaWithTotal, orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { api } from "@/lib/api";

export type PartnerHouseRow = Awaited<ReturnType<typeof api.partner.houses.list>>[number];

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
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap compartilhado",
};

const BUSINESS_TYPE_LABELS: Record<"RENT" | "SALE", string> = {
  RENT: "Arrendamento",
  SALE: "Venda",
};

function HouseBusinessTypeBadge({
  businessType,
  className = "mt-1",
}: {
  businessType: "RENT" | "SALE";
  className?: string;
}) {
  const base =
    `inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${className}`.trim();
  if (businessType === "SALE") {
    return (
      <span className={`${base} bg-violet-100 text-violet-900 ring-violet-200/90`}>Venda</span>
    );
  }
  return (
    <span className={`${base} bg-emerald-100 text-emerald-900 ring-emerald-200/90`}>
      Arrenda
    </span>
  );
}

function HouseVideoBadge() {
  return (
    <span className="pointer-events-none absolute bottom-0.5 left-0.5 z-10 rounded bg-zinc-900/80 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
      Vídeo
    </span>
  );
}

type Props = {
  rows: PartnerHouseRow[];
  publishingById: Record<string, boolean>;
  deletingById: Record<string, boolean>;
  onPublish: (house: PartnerHouseRow) => void;
  onEdit: (houseId: string) => void;
  onDelete: (houseId: string) => void;
};

function formatDatePt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-PT");
}

function getHouseWhatsAppSendDates(h: {
  whatsappSends?: { sentAt: string }[];
  whatsappSentAt: string | null;
}): string[] {
  const fromArray = (h.whatsappSends ?? [])
    .map((x) => x.sentAt)
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((iso) => new Date(iso).toLocaleDateString("pt-PT"));
  if (fromArray.length > 0) return fromArray.reverse();
  if (h.whatsappSentAt) {
    return [new Date(h.whatsappSentAt).toLocaleDateString("pt-PT")];
  }
  return [];
}

function houseWhatsAppSendDatesLabel(h: {
  whatsappSends?: { sentAt: string }[];
  whatsappSentAt: string | null;
}): string {
  const dates = getHouseWhatsAppSendDates(h);
  if (dates.length > 0) return dates.join("\n");
  return "—";
}

function getHouseListThumbSrc(h: {
  imageUrls: string[];
  coverImageUrl?: string | null;
  videoUrl: string | null;
  videoPosterUrl?: string | null;
}): { imageSrc: string | null; videoSrc: string | null } {
  const ordered = orderHouseImagesWithCoverFirst(h.imageUrls ?? [], h.coverImageUrl);
  const imageSrc = ordered[0] ? resolveUploadsUrl(ordered[0]) : null;
  const videoSrc = h.videoUrl ? resolveUploadsUrl(h.videoUrl) : null;
  const fallbackThumb =
    !imageSrc && h.videoPosterUrl ? resolveUploadsUrl(h.videoPosterUrl) : null;
  return { imageSrc: imageSrc ?? fallbackThumb, videoSrc: imageSrc ? null : videoSrc };
}

function HouseThumb({
  house,
  className = "h-10 w-14",
}: {
  house: PartnerHouseRow;
  className?: string;
}) {
  const { imageSrc, videoSrc } = getHouseListThumbSrc(house);
  const hasVideo = Boolean(house.videoUrl?.trim());
  return (
    <Link
      href={`/dashboard/casas/${house.houseId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver anúncio ${house.title}`}
      className={`relative block shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 ${className}`}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : videoSrc ? (
        <video
          src={videoSrc}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
          —
        </div>
      )}
      {hasVideo ? <HouseVideoBadge /> : null}
    </Link>
  );
}

function HouseEditDeleteActions({
  houseId,
  deleting,
  onEdit,
  onDelete,
  className = "justify-end",
}: {
  houseId: string;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={onEdit}
        title="Editar anúncio"
        aria-label="Editar anúncio"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
          />
        </svg>
      </button>
      <button
        type="button"
        title="Eliminar anúncio"
        aria-label="Eliminar anúncio"
        disabled={deleting}
        onClick={onDelete}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.008 0L9.22 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

function PartnerHouseMobileCard({
  house,
  publishing,
  publishDisabled,
  deleting,
  onPublish,
  onEdit,
  onDelete,
}: {
  house: PartnerHouseRow;
  publishing: boolean;
  publishDisabled: boolean;
  deleting: boolean;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const clicks = house._count?.redirectClicks ?? 0;
  const whatsAppDates = getHouseWhatsAppSendDates(house);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <HouseThumb house={house} className="h-[72px] w-[96px] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-3 text-base leading-snug text-zinc-900">
            <span className="mr-1.5 inline-flex flex-wrap items-center gap-1.5 font-mono text-xs font-medium tabular-nums text-zinc-500">
              {house.houseId}
              <HouseBusinessTypeBadge businessType={house.businessType} className="" />
            </span>
            <span className="font-semibold">{house.title}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {BUSINESS_TYPE_LABELS[house.businessType] ?? "Preço"}:{" "}
            <span className="font-semibold tabular-nums text-zinc-900">
              {formatHouseEurFieldDisplay(house.priceEur)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Publicado em</p>
        {whatsAppDates.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-sm text-zinc-700">
            {whatsAppDates.map((date, index) => (
              <li key={`${date}-${index}`} className="tabular-nums">
                {date}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">—</p>
        )}
        {house.whatsappError?.trim() ? (
          <p className="mt-1 text-xs text-red-600">Falha no envio</p>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <HouseEditDeleteActions
          houseId={house.id}
          deleting={deleting}
          onEdit={onEdit}
          onDelete={onDelete}
          className="shrink-0 justify-start"
        />
        <p className="shrink-0 text-right text-sm text-zinc-600">
          <span className="font-semibold tabular-nums text-zinc-900">{clicks}</span>{" "}
          {clicks === 1 ? "click" : "clicks"}
        </p>
      </div>

      <div className="mt-3">
        <PublishHouseRowButton
          publicationStatus={house.publicationStatus}
          publishedUntil={house.publishedUntil}
          loading={publishing}
          disabled={publishDisabled}
          onClick={onPublish}
        />
      </div>
    </article>
  );
}

export function PartnerHousesList({
  rows,
  publishingById,
  deletingById,
  onPublish,
  onEdit,
  onDelete,
}: Props) {
  const isPublishingAny = Object.values(publishingById).some(Boolean);

  return (
    <>
      <div className="mt-4 space-y-3 md:hidden">
        {rows.map((r) => (
          <PartnerHouseMobileCard
            key={r.id}
            house={r}
            publishing={Boolean(publishingById[r.id])}
            publishDisabled={isPublishingAny && !publishingById[r.id]}
            deleting={Boolean(deletingById[r.id])}
            onPublish={() => onPublish(r)}
            onEdit={() => onEdit(r.id)}
            onDelete={() => onDelete(r.id)}
          />
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Id</th>
              <th className="w-[76px] px-4 py-3 text-left font-medium">Thumb</th>
              <th className="min-w-[132px] px-3 py-3 text-left font-medium">Status atual</th>
              <th className="px-4 py-3 text-left font-medium">Publicado em</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                Clicks
              </th>
              <th className="px-4 py-3 text-left font-medium">Título</th>
              <th className="px-4 py-3 text-left font-medium">Cidade</th>
              <th className="px-4 py-3 text-left font-medium">Tipologia</th>
              <th className="px-4 py-3 text-left font-medium">Disponível em</th>
              <th className="px-4 py-3 text-left font-medium">Preço</th>
              <th className="px-4 py-3 text-left font-medium">Entrada</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs tabular-nums text-zinc-600">
                  <div>{r.houseId}</div>
                  <HouseBusinessTypeBadge businessType={r.businessType} />
                </td>
                <td className="px-4 py-3">
                  <HouseThumb house={r} />
                </td>
                <td className="px-3 py-3 align-top">
                  <PublishHouseRowButton
                    publicationStatus={r.publicationStatus}
                    publishedUntil={r.publishedUntil}
                    loading={publishingById[r.id]}
                    disabled={isPublishingAny && !publishingById[r.id]}
                    fullWidth
                    onClick={() => onPublish(r)}
                    className="min-w-[132px]"
                  />
                </td>
                <td
                  className="whitespace-pre-line px-4 py-3 align-top text-xs text-zinc-700"
                  title={r.whatsappError?.trim() ? r.whatsappError : undefined}
                >
                  {houseWhatsAppSendDatesLabel(r)}
                  {r.whatsappError?.trim() ? (
                    <span className="mt-1 block text-red-600">Falha no envio</span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                  {r._count?.redirectClicks ?? 0}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-zinc-900">{r.title}</p>
                </td>
                <td className="px-4 py-3 text-zinc-700">{CITY_LABELS[r.city] ?? r.city}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {TYPOLOGY_LABELS[r.typology] ?? r.typology}
                </td>
                <td className="px-4 py-3 text-zinc-700">{formatDatePt(r.availableFrom)}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatHouseEurFieldDisplay(r.priceEur)}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  <div className="text-xs text-zinc-500">
                    Taxa: {formatHouseEurFieldDisplay(r.relocationFeeEur)}
                  </div>
                  <div>
                    {formatHouseEntradaWithTotal(
                      r.caucoesCount,
                      r.rendasEntradaCount,
                      r.priceEur,
                      { wholeEuros: true },
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <HouseEditDeleteActions
                    houseId={r.id}
                    deleting={Boolean(deletingById[r.id])}
                    onEdit={() => onEdit(r.id)}
                    onDelete={() => onDelete(r.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
