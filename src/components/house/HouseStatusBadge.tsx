type Status = "AVAILABLE" | "RESERVED" | "UNAVAILABLE";

type Props = {
  status: Status;
  className?: string;
};

const base = "inline-flex items-center rounded-full font-semibold tracking-tight";

const LABEL: Record<Status, string> = {
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  UNAVAILABLE: "Indisponível",
};

export function HouseStatusBadge({ status, className = "" }: Props) {
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
