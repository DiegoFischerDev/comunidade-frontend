import type { Metadata } from "next";
import { RedirectToApiWithVisitor } from "@/components/redirect/RedirectToApiWithVisitor";
import { generatePartnerShareLinkRedirectMetadata } from "@/lib/partner-share-redirect-metadata";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(
  props: PageProps,
): Promise<Metadata> {
  return generatePartnerShareLinkRedirectMetadata(
    "/whatsapp",
    props.searchParams,
  );
}

/**
 * Entrada pública: /whatsapp?t=<slug> ou ?imovel= (legado).
 * Cliente envia `rd_vid` estável na query para deduplicação de cliques no API.
 */
export default function WhatsappRedirectEntryPage() {
  return <RedirectToApiWithVisitor variant="share" />;
}
