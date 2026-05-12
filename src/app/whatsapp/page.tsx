import { RedirectToApiWithVisitor } from "@/components/redirect/RedirectToApiWithVisitor";

/**
 * Entrada pública: /whatsapp?t=<slug> ou ?imovel= (legado).
 * Cliente envia `rd_vid` estável na query para deduplicação de cliques no API.
 */
export default function WhatsappRedirectEntryPage() {
  return <RedirectToApiWithVisitor variant="share" />;
}
