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
  _publishedUntil?: string | null,
): boolean {
  return publicationStatus === "PUBLISHED";
}

export function HousePublicationStatusBadge({
  publicationStatus,
  className = "",
  displayVariant = "admin",
}: Props) {
  const active = isActivePublished(publicationStatus);
  const isPublic = displayVariant === "public";
  const label = isPublic ? (active ? "Disponível" : "Oculto") : active ? "Publicado" : "Oculto";
  const defaultClass = active
    ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
    : "bg-zinc-200 text-foreground ring-zinc-300";

  return (
    <span
      className={`${base} px-2.5 py-0.5 text-xs ring-1 ring-inset sm:px-3 sm:py-1 sm:text-[13px] ${defaultClass} ${className}`.trim()}
      title={
        isPublic
          ? active
            ? "Imóvel disponível"
            : "Imóvel oculto"
          : active
            ? "Visível no site"
            : undefined
      }
    >
      {label}
    </span>
  );
}
