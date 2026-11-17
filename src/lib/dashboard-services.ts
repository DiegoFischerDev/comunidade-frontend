export const EUR_TO_BRL_RATE = 6;

export type RelocationPackage = {
  location: string;
  priceEur: number;
};

export type DashboardServiceItem = {
  name: string;
  priceEur?: number;
  included?: boolean;
  /** Quando true, mostra “a consultar” em vez de um valor fixo. */
  priceOnRequest?: boolean;
  /** Sufixo no valor (ex.: `*` em notas de rodapé). */
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
  { location: "São Pedro do Sul", priceEur: 550 },
  { location: "Viseu", priceEur: 650 },
  { location: "Porto", priceEur: 850 },
  { location: "Aveiro", priceEur: 850 },
  { location: "Braga", priceEur: 950 },
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
  { name: "Recebimento de compras online", priceEur: 80 },
  { name: "Primeiras compras de supermercado", priceEur: 80 },
  {
    name: "Transfer com as malas do aeroporto até a nova casa",
    priceOnRequest: true,
  },
  {
    name: "Assessoria para a compra do primeiro carro",
    priceOnRequest: true,
  },
];
