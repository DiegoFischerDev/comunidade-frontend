import { RedirectToApiWithVisitor } from "@/components/redirect/RedirectToApiWithVisitor";

/**
 * Entrada pública para anúncio → WhatsApp do parceiro (com tracking).
 */
export default function ImovelRedirectEntryPage() {
  return <RedirectToApiWithVisitor variant="imovel" />;
}
