import { parseHouseMonthlyRentEurNumeric } from "@/lib/house-entrance";

const EUR_WHOLE_OPTS: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

/** Valor em cêntimos → ex. "25 €" (sem casas decimais). */
export function formatEurWholeFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-PT", EUR_WHOLE_OPTS);
}

/** Valor em euros → ex. "1 350 €" (sem casas decimais). */
export function formatEurWholeFromNumber(euros: number): string {
  return euros.toLocaleString("pt-PT", EUR_WHOLE_OPTS);
}

/** Texto guardado (preço, taxa) → moeda pt-PT sem casas decimais. */
export function formatHouseEurFieldDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  const n = parseHouseMonthlyRentEurNumeric(trimmed);
  if (n == null) {
    const withoutSuffix = trimmed.replace(/\s*€\s*$/i, "").trim();
    return withoutSuffix ? `${withoutSuffix} €` : trimmed;
  }
  return formatEurWholeFromNumber(Math.round(n));
}
