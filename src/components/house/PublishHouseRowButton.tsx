"use client";

import { CardButton } from "@/components/ui/CardButton";

type Props = {
  publicationStatus: "PUBLISHED" | "HIDDEN";
  publishedUntil?: string | null;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  onClick: () => void;
};

function isActivelyPublished(
  publicationStatus: "PUBLISHED" | "HIDDEN",
  publishedUntil?: string | null,
): boolean {
  if (publicationStatus !== "PUBLISHED") return false;
  if (!publishedUntil) return false;
  return new Date(publishedUntil) > new Date();
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

export function PublishHouseRowButton({
  publicationStatus,
  publishedUntil,
  loading,
  fullWidth = true,
  className,
  onClick,
}: Props) {
  const republish = isActivelyPublished(publicationStatus, publishedUntil);
  const label = republish ? "Republicar" : "Publicar imóvel";

  return (
    <CardButton
      type="button"
      variant="primary"
      size="sm"
      fullWidth={fullWidth}
      loading={loading}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={["shadow-md ring-2 ring-emerald-600/20", className].filter(Boolean).join(" ")}
    >
      <SendIcon className="h-4 w-4 shrink-0" />
      {label}
    </CardButton>
  );
}
