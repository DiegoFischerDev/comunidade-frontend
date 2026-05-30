type PublicationStatus = "PUBLISHED" | "HIDDEN" | "TRASH";

type Props = {
  publicationStatus: PublicationStatus;
  publishedUntil?: string | null;
  className?: string;
  /** Páginas públicas do anúncio: «Disponível» / «Oculto», sem data de publicação. */
  displayVariant?: "admin" | "public";
};

const base =
  "inline-flex items-center rounded-full font-semibold tracking-tight";

export function isActivePublished(
  publicationStatus: PublicationStatus,
  publishedUntil?: string | null,
): boolean {
  if (publicationStatus !== "PUBLISHED") return false;
  if (!publishedUntil) return false;
  return new Date(publishedUntil) > new Date();
}

export function HousePublicationStatusBadge({
  publicationStatus,
  publishedUntil,
  className = "",
  displayVariant = "admin",
}: Props) {
  const active = isActivePublished(publicationStatus, publishedUntil);
  const isPublic = displayVariant === "public";
  const label = isPublic ? (active ? "Disponível" : "Oculto") : active ? "Publicado" : "Oculto";
  const defaultClass = active
    ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
    : "bg-zinc-200 text-zinc-800 ring-zinc-300";

  const untilLabel =
    !isPublic && active && publishedUntil
      ? ` até ${new Date(publishedUntil).toLocaleDateString("pt-PT")}`
      : "";

  return (
    <span
      className={`${base} px-2.5 py-0.5 text-xs ring-1 ring-inset sm:px-3 sm:py-1 sm:text-[13px] ${defaultClass} ${className}`.trim()}
      title={
        isPublic
          ? active
            ? "Imóvel disponível"
            : "Imóvel oculto"
          : untilLabel
            ? `Visível no site${untilLabel}`
            : undefined
      }
    >
      {label}
      {untilLabel ? (
        <span className="ml-1 hidden font-normal opacity-80 sm:inline">{untilLabel}</span>
      ) : null}
    </span>
  );
}

export function formatAdvertisingBalanceEur(cents: number): string {
  return (cents / 100).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}
