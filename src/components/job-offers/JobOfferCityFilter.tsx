"use client";

import type { JobOfferCityOption } from "@/lib/job-offer-cities";

type Props = {
  cities: JobOfferCityOption[];
  totalCount: number;
  value: string;
  onChange: (value: string) => void;
};

export function JobOfferCityFilter({
  cities,
  totalCount,
  value,
  onChange,
}: Props) {
  if (cities.length === 0) return null;

  const options: Array<{ value: string; label: string; count: number }> = [
    { value: "", label: "Todas", count: totalCount },
    ...cities.map((c) => ({
      value: c.city,
      label: c.city,
      count: c.count,
    })),
  ];

  return (
    <div>
      <p
        id="job-offers-city-label"
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        <svg
          className="h-3.5 w-3.5 text-brand-primary/90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        Cidade
      </p>
      <div
        role="group"
        aria-labelledby="job-offers-city-label"
        className="flex flex-wrap gap-2"
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value || "all"}
              type="button"
              aria-pressed={selected}
              aria-label={`${opt.label}, ${opt.count} ${opt.count === 1 ? "vaga" : "vagas"}`}
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25/40 ${
                selected
                  ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                  : "border-border bg-card text-foreground/90 hover:border-brand-accent/50 hover:bg-page"
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`text-[11px] font-semibold tabular-nums ${
                  selected ? "text-white/80" : "text-muted"
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
