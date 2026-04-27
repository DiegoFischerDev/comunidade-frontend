import { api } from "@/lib/api";
import { orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { isOurImageHostname } from "@/lib/site-url";

export type RelocationHouseRow = Awaited<ReturnType<typeof api.marketplace.relocationHouses>>[number];

export const RELOCATION_CITY_LABELS: Record<string, string> = {
  INTERIOR: "Interior",
  LISBOA: "Lisboa",
  PORTO: "Porto",
  BRAGA: "Braga",
  COIMBRA: "Coimbra",
  AVEIRO: "Aveiro",
  FARO: "Faro",
  ALGARVE: "Algarve",
  EVORA: "Évora",
  VISEU: "Viseu",
};

export const RELOCATION_TYPOLOGY_LABELS: Record<string, string> = {
  T1: "T1",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap compartilhado",
};

export const RELOCATION_CITY_OPTIONS = Object.keys(RELOCATION_CITY_LABELS) as string[];
export const RELOCATION_TYPOLOGY_OPTIONS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "QUARTO_AP_COMPARTILHADO",
] as const;

export function resolveRelocationMediaUrl(url: string) {
  return resolveUploadsUrl(url);
}

export function relocationNextImageUnoptimized(resolvedUrl: string) {
  if (!resolvedUrl.startsWith("http")) return false;
  try {
    const h = new URL(resolvedUrl).hostname;
    if (isOurImageHostname(h)) return false;
    return true;
  } catch {
    return true;
  }
}

export function formatRelocationRentPerMonth(priceEur: string): string {
  const t = priceEur
    .trim()
    .replace(/\s*€\s*$/i, "")
    .replace(/\s*\/\s*m[eê]s?\s*$/i, "")
    .trim();
  return `${t} € / mês`;
}

export function formatRelocationFeeEur(raw: string): string {
  const t = raw.trim().replace(/\s*€\s*$/i, "").trim();
  return `${t} €`;
}

function buildRelocationWhatsAppText(h: RelocationHouseRow): string {
  const cityLabel = RELOCATION_CITY_LABELS[h.city] ?? h.city;
  const typologyLabel = RELOCATION_TYPOLOGY_LABELS[h.typology] ?? h.typology;
  const mobilado = h.furnished ? "mobilado" : "não mobilado";
  return `Olá, gostaria de mais informações sobre o imóvel ${typologyLabel} (${mobilado}) por ${h.priceEur} em ${cityLabel} com título ${h.title}.`;
}

export function openRelocationPartnerWhatsApp(h: RelocationHouseRow): void {
  const digits = (h.partner.whatsapp ?? "").replace(/\D/g, "");
  if (!digits) {
    window.alert("Não foi possível obter o WhatsApp deste parceiro.");
    return;
  }
  void api.marketplace.registerLead(h.partnerId).catch(() => {
    /* não bloqueia o contacto */
  });
  const text = buildRelocationWhatsAppText(h);
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened == null) {
    window.location.assign(url);
  }
}

export function relocationAvailabilityLabel(availableFromIso: string): string {
  const day = availableFromIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const d = new Date(availableFromIso);
    if (Number.isNaN(d.getTime())) return "Data indisponível";
    return `Disponível a partir de ${d.toLocaleDateString("pt-PT")}`;
  }
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (day <= todayStr) return "Atualmente disponível";
  const [y, m, dd] = day.split("-").map(Number);
  const d = new Date(y, m - 1, dd);
  return `Disponível a partir de ${d.toLocaleDateString("pt-PT")}`;
}

export function getRelocationHouseMedia(h: RelocationHouseRow) {
  const videoSrc = h.videoUrl ? resolveRelocationMediaUrl(h.videoUrl) : null;
  const orderedUrls = orderHouseImagesWithCoverFirst(h.imageUrls ?? [], h.coverImageUrl);
  const primaryImageSrc = orderedUrls[0] ? resolveRelocationMediaUrl(orderedUrls[0]) : null;
  return { videoSrc, primaryImageSrc };
}
