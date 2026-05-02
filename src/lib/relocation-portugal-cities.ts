/**
 * Principais cidades de Portugal para imóveis relocation (valor guardado = etiqueta).
 * Manter alinhado com `backend/src/partner/relocation-cities.ts`.
 */
export const RELOCATION_PORTUGAL_CITIES = [
  "Lisboa",
  "Porto",
  "Braga",
  "Coimbra",
  "Faro",
  "Setúbal",
  "Aveiro",
  "Leiria",
  "Viseu",
  "Guimarães",
  "Évora",
  "Santarém",
  "Castelo Branco",
  "Beja",
  "Bragança",
  "Vila Real",
  "Portimão",
  "Cascais",
  "Matosinhos",
  "Funchal",
  "Ponta Delgada",
  "Almada",
  "Amadora",
  "Oeiras",
  "Sintra",
  "Barreiro",
  "Seixal",
  "Loures",
  "Vila Nova de Gaia",
  "Maia",
  "Gondomar",
  "Santa Maria da Feira",
  "Espinho",
  "Ovar",
  "Figueira da Foz",
  "Caldas da Rainha",
  "Torres Vedras",
  "Peniche",
  "Nazaré",
  "Tomar",
  "Abrantes",
  "Covilhã",
  "Guarda",
  "Elvas",
  "Estremoz",
  "Sines",
  "Lagos",
  "Tavira",
  "Albufeira",
  "Vila Franca de Xira",
  "Chaves",
  "Mirandela",
  "Peso da Régua",
  "Lamego",
  "Amarante",
  "Barcelos",
  "Famalicão",
  "Póvoa de Varzim",
  "Vila do Conde",
  "Trofa",
  "Valongo",
  "Oliveira de Azeméis",
  "Águeda",
  "Ílhavo",
  "Anadia",
  "Mealhada",
  "Montemor-o-Velho",
  "Pombal",
  "Ourém",
  "Entroncamento",
  "Almeirim",
  "Cartaxo",
  "Rio Maior",
  "Alcobaça",
  "Marinha Grande",
  "Sesimbra",
  "Palmela",
  "Montijo",
  "Grândola",
  "Odemira",
  "São Pedro do Sul",
] as const;

const CITY_SET = new Set<string>(RELOCATION_PORTUGAL_CITIES);

/** Códigos antigos (enum) → nome canónico na lista. */
const LEGACY_CITY_TO_CANONICAL: Record<string, (typeof RELOCATION_PORTUGAL_CITIES)[number]> = {
  LISBOA: "Lisboa",
  PORTO: "Porto",
  BRAGA: "Braga",
  COIMBRA: "Coimbra",
  AVEIRO: "Aveiro",
  FARO: "Faro",
  EVORA: "Évora",
  VISEU: "Viseu",
};

/** Etiquetas só legadas (região / enum) — não estão na lista de 81. */
const LEGACY_CITY_DISPLAY: Record<string, string> = {
  INTERIOR: "Interior",
  ALGARVE: "Algarve",
  ...Object.fromEntries(
    Object.entries(LEGACY_CITY_TO_CANONICAL).map(([code, name]) => [code, name]),
  ),
};

const CANONICAL_TO_LEGACY: Partial<Record<string, string>> = {};
for (const [legacy, canon] of Object.entries(LEGACY_CITY_TO_CANONICAL)) {
  CANONICAL_TO_LEGACY[canon] = legacy;
}

export const RELOCATION_CITY_OPTIONS: readonly string[] = RELOCATION_PORTUGAL_CITIES;

export function relocationCityDisplayName(city: string): string {
  if (!city) return "";
  if (LEGACY_CITY_DISPLAY[city]) return LEGACY_CITY_DISPLAY[city];
  return city;
}

/** Para formulários: converte valor antigo da API para chave da lista (ou "" se for região / desconhecido). */
export function migrateLegacyHouseCityToCanonical(city: string): string {
  const c = city.trim();
  if (!c) return "";
  if (LEGACY_CITY_TO_CANONICAL[c]) return LEGACY_CITY_TO_CANONICAL[c];
  if (CITY_SET.has(c)) return c;
  return "";
}

export function isRelocationPortugalCity(city: string): boolean {
  return CITY_SET.has(city.trim());
}

export function foldCitySearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function filterRelocationCitiesByQuery(query: string): readonly string[] {
  const q = foldCitySearch(query.trim());
  if (!q) return RELOCATION_PORTUGAL_CITIES;
  return RELOCATION_PORTUGAL_CITIES.filter((c) => foldCitySearch(c).includes(q));
}

/** JSON-LD / schema.org `addressLocality`. */
export function relocationCitySchemaLocality(city: string): string {
  const label = relocationCityDisplayName(city);
  if (!label) return "Portugal";
  return `${label}, Portugal`;
}
