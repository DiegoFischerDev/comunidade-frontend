/** Texto curto para cartões e listagens. */
export function formatHouseEntradaShort(caucoes: number, rendas: number): string {
  const c = caucoes === 1 ? "1 caução" : `${caucoes} cauções`;
  const r = rendas === 1 ? "1 renda antecipada" : `${rendas} rendas antecipadas`;
  return `${c} · ${r}`;
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
