/** Texto curto para cartões e listagens. */
export function formatHouseEntradaShort(caucoes: number, rendas: number): string {
  const c = caucoes === 1 ? "1 caução" : `${caucoes} cauções`;
  const r = rendas === 1 ? "1 renda antecipada" : `${rendas} rendas antecipadas`;
  return `${c} · ${r}`;
}
