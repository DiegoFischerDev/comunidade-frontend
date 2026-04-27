type Status = "AVAILABLE" | "RESERVED" | "UNAVAILABLE";

type Props = {
  status: Status;
  /** `overlay`: contraste para foto de capa / thumbnails. */
  variant?: "default" | "overlay";
  className?: string;
};

const base = "inline-flex items-center rounded-full font-semibold tracking-tight";

const LABEL: Record<Status, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  UNAVAILABLE: "Indisponível",
};

export function HouseStatusBadge({ status, variant = "default", className = "" }: Props) {
  if (variant === "overlay") {
    const overlayBase =
      "pointer-events-none inline-flex max-w-[min(92%,24rem)] items-center justify-center text-balance rounded-xl border border-white/15 px-2.5 py-1.5 text-lg font-extrabold leading-tight tracking-tight shadow-sm backdrop-blur-md sm:px-4 sm:py-2 sm:text-xl sm:leading-tight md:px-5 md:py-2.5 md:text-2xl md:leading-tight";
    const overlayClass =
      status === "AVAILABLE"
        ? "bg-emerald-600/30 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_24px_rgba(0,0,0,0.35)]"
        : status === "RESERVED"
          ? "bg-amber-600/30 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_24px_rgba(0,0,0,0.35)]"
          : "bg-zinc-900/35 text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.65),0_0_24px_rgba(0,0,0,0.4)]";
    return (
      <span
        className={`${overlayBase} ${overlayClass} ${className}`.trim()}
      >
        {LABEL[status]}
      </span>
    );
  }

  const defaultClass =
    status === "AVAILABLE"
      ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
      : status === "RESERVED"
        ? "bg-amber-100 text-amber-950 ring-amber-200"
        : "bg-zinc-200 text-zinc-800 ring-zinc-300";

  return (
    <span
      className={`${base} px-2.5 py-0.5 text-xs ring-1 ring-inset sm:px-3 sm:py-1 sm:text-[13px] ${defaultClass} ${className}`.trim()}
    >
      {LABEL[status]}
    </span>
  );
}
