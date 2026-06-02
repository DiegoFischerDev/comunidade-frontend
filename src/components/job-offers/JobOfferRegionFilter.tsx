"use client";

import {
  JOB_OFFER_REGION_FILTER_OPTIONS,
  type JobOfferRegion,
} from "@/lib/job-offer-regions";

type Props = {
  value: JobOfferRegion | "";
  onChange: (value: JobOfferRegion | "") => void;
};

export function JobOfferRegionFilter({ value, onChange }: Props) {
  return (
    <div>
      <p
        id="job-offers-region-label"
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600"
      >
        <svg
          className="h-3.5 w-3.5 text-amber-700/90"
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
        Região
      </p>
      <div
        role="group"
        aria-labelledby="job-offers-region-label"
        className="flex flex-wrap gap-2"
      >
        {JOB_OFFER_REGION_FILTER_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value || "all"}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${
                selected
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-amber-300 hover:bg-amber-50/80"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
