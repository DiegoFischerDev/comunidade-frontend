"use client";

import { CardButton } from "@/components/ui/CardButton";
import { isActivePublished } from "@/components/house/HousePublicationStatusBadge";

type Props = {
  publicationStatus: "PUBLISHED" | "HIDDEN" | "TRASH";
  publishedUntil?: string | null;
  loading?: boolean;
  /** Texto durante publicação em lote (ex.: «Publicando…»). */
  loadingLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  onClick: () => void;
};

function PublishSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 animate-spin ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function publishedUntilLabel(publishedUntil: string): string {
  const d = new Date(publishedUntil);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-PT");
}

export function PublishHouseRowButton({
  publicationStatus,
  publishedUntil,
  loading,
  loadingLabel,
  disabled,
  fullWidth = true,
  className,
  onClick,
}: Props) {
  const active = isActivePublished(publicationStatus, publishedUntil);
  const showPublishing = loading && loadingLabel;

  if (showPublishing) {
    return (
      <CardButton
        type="button"
        variant="primary"
        size="sm"
        fullWidth={fullWidth}
        loading={false}
        disabled
        className={["shadow-md ring-2 ring-emerald-600/20", className].filter(Boolean).join(" ")}
      >
        <PublishSpinner />
        {loadingLabel}
      </CardButton>
    );
  }

  if (active) {
    const until =
      publishedUntil && !Number.isNaN(new Date(publishedUntil).getTime())
        ? publishedUntilLabel(publishedUntil)
        : null;
    const title = until
      ? `Publicado até ${until}. Clica para republicar.`
      : "Imóvel publicado. Clica para republicar.";

    return (
      <CardButton
        type="button"
        variant="outline"
        size="sm"
        fullWidth={fullWidth}
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        title={title}
        aria-label={title}
        className={[
          "border-emerald-300 bg-emerald-50 font-semibold text-emerald-900 shadow-none ring-0",
          "hover:border-emerald-400 hover:bg-emerald-100",
          "focus-visible:ring-emerald-500/60",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <CheckIcon className="h-4 w-4 shrink-0 text-emerald-700" />
        Imóvel publicado
      </CardButton>
    );
  }

  return (
    <CardButton
      type="button"
      variant="primary"
      size="sm"
      fullWidth={fullWidth}
      loading={loading}
      disabled={disabled}
      onClick={onClick}
      title="Publicar imóvel"
      aria-label="Publicar imóvel"
      className={["shadow-md ring-2 ring-emerald-600/20", className].filter(Boolean).join(" ")}
    >
      <SendIcon className="h-4 w-4 shrink-0" />
      Publicar imóvel
    </CardButton>
  );
}
