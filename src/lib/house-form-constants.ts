export const HOUSE_TYPOLOGIES = [
  { id: 'T0', label: 'T0' },
  { id: 'T1', label: 'T1' },
  { id: 'T2', label: 'T2' },
  { id: 'T3', label: 'T3' },
  { id: 'T4', label: 'T4' },
  { id: 'T5', label: 'T5' },
  { id: 'QUARTO_AP_COMPARTILHADO', label: 'Quarto em Ap compartilhado' },
] as const;

export const HOUSE_BUSINESS_TYPES = [
  { id: 'RENT', label: 'Arrendamento' },
  { id: 'SALE', label: 'Venda' },
] as const;

export const HOUSE_ENTRADA_COUNT_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i));

export function todayLocalDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
