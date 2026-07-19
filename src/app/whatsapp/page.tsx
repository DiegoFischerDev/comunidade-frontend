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
 * O API regista o hit sem ID de visitante persistente.
 */
export default function WhatsappRedirectEntryPage() {
  return <RedirectToApiWithVisitor variant="share" />;
}
