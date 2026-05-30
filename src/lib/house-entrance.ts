/** Texto curto para cartões e listagens. */
export function formatHouseEntradaShort(caucoes: number, rendas: number): string {
  if ((caucoes ?? 0) <= 0 && (rendas ?? 0) <= 0) return "Não informado";
  const c = caucoes === 1 ? "1 caução" : `${caucoes} cauções`;
  const r = rendas === 1 ? "1 renda" : `${rendas} rendas`;
  return `${c} · ${r}`;
}

/**
 * Extrai o valor numérico da renda mensal a partir do texto guardado (ex. "450 €", "1.234,50").
 */
export function parseHouseMonthlyRentEurNumeric(priceEur: string): number | null {
  const raw = priceEur
    .trim()
    .replace(/\s*€\s*$/i, "")
    .replace(/\s*\/\s*m[eê]s?\s*$/i, "")
    .trim();
  if (!raw) return null;
  let s = raw.replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1] && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Entrada com total: (cauções + rendas) × renda mensal.
 * Ex.: "2 cauções · 1 renda = Total 1.350,00 €"
 */
export function formatHouseEntradaWithTotal(
  caucoes: number,
  rendas: number,
  priceEur: string,
  options?: { wholeEuros?: boolean },
): string {
  const parts = formatHouseEntradaShort(caucoes, rendas);
  const rent = parseHouseMonthlyRentEurNumeric(priceEur);
  const units = caucoes + rendas;
  if (rent == null || units <= 0) {
    return parts;
  }
  const total = units * rent;
  const totalStr = total.toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: options?.wholeEuros ? 0 : 2,
  });
  return `${parts} = Total ${totalStr} €`;
}

/** Capa primeiro (OG / cartões); depois as restantes na ordem original. */
export function orderHouseImagesWithCoverFirst(
  imageUrls: string[],
  coverImageUrl: string | null | undefined,
): string[] {
  const u = [...imageUrls];
  if (u.length === 0) return [];
  const cover =
    coverImageUrl != null && coverImageUrl !== "" && u.includes(coverImageUrl) ? coverImageUrl : u[0]!;
  return [cover, ...u.filter((x) => x !== cover)];
}
