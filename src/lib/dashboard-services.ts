export const EUR_TO_BRL_RATE = 6;

export type RelocationPackage = {
  location: string;
  priceEur: number;
};

export type DashboardServiceItem = {
  name: string;
  priceEur?: number;
  included?: boolean;
  /** Sufixo no valor (ex.: `**` no transfer). */
  priceSuffix?: string;
};

export function formatEurAmount(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(".", ",");
}

export function formatBrlAmount(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

export function eurToBrl(eur: number): number {
  return eur * EUR_TO_BRL_RATE;
}

export const DASHBOARD_RELOCATION_PACKAGES: RelocationPackage[] = [
  { location: "Viseu", priceEur: 750 },
  { location: "São Pedro do Sul", priceEur: 650 },
];

export const DASHBOARD_INCLUDED_SERVICES: DashboardServiceItem[] = [
  { name: "Busca do imóvel ideal", included: true },
  { name: "Até 3 visitas a imóveis em live online", included: true },
  { name: "Ativação de serviços como água e luz", included: true },
  { name: "Cotação de serviços de telemóvel e Wi-Fi", included: true },
  { name: "Primeira limpeza e arrumação", included: true },
  { name: "Apoio para compra de passagem aérea", included: true },
  { name: "Facilitação de abertura de conta bancária", included: true },
];

export const DASHBOARD_EXTRA_SERVICES: DashboardServiceItem[] = [
  { name: "Reunião estratégica/assessoria para visto (40 minutos)", priceEur: 50 },
  { name: "Recebimento e guarda de compras online", priceEur: 30 },
  { name: "Apoio para solicitação de NIF / NISS", priceEur: 70 },
  { name: "Primeiras compras e estoque", priceEur: 80, priceSuffix: "*" },
  { name: "Transfer Aeroporto de Chegada", priceEur: 150, priceSuffix: "**" },
];
