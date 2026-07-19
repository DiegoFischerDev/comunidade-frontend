import { SITE_FOUNDERS_WHATSAPP_URL } from "@/lib/site-branding";

/** Convite «dúvidas em geral» / comunidade. */
export const WHATSAPP_GROUP_DUVIDAS_GERAL_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_DUVIDAS_GERAL_URL?.trim() ||
  process.env.NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUPS_URL?.trim() ||
  "https://chat.whatsapp.com/FA0bFhdIMD6BeMYRceFrCv";

/** Grupão relocation — arrendamento. */
export const WHATSAPP_GROUP_RELOCACAO_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_RELOCACAO_URL?.trim() ||
  process.env.NEXT_PUBLIC_RELOCATION_HOUSES_WHATSAPP_GROUP_URL?.trim() ||
  "https://chat.whatsapp.com/Kt4ylOIU0qMBbtfHKlyvVt?mode=gi_t";

/** Imóveis para venda. */
export const WHATSAPP_GROUP_IMOVEIS_VENDA_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_IMOVEIS_VENDA_URL?.trim() ||
  "https://chat.whatsapp.com/EneiignxdnuHVy17rh5MTX";

/** Convite WhatsApp — ofertas de emprego (Portugal). */
export const WHATSAPP_GROUP_OFERTAS_EMPREGO_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_OFERTAS_EMPREGO_URL?.trim() ||
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_OFERTAS_NORTE_URL?.trim() ||
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_OFERTAS_TRABALHO_URL?.trim() ||
  "https://chat.whatsapp.com/EONaquXnkDx6NmdAdCIouM";

/** @deprecated Use `WHATSAPP_GROUP_OFERTAS_EMPREGO_URL`. */
export const WHATSAPP_GROUP_OFERTAS_NORTE_URL =
  WHATSAPP_GROUP_OFERTAS_EMPREGO_URL;

/** @deprecated Use `WHATSAPP_GROUP_OFERTAS_EMPREGO_URL`. */
export const WHATSAPP_GROUP_OFERTAS_TRABALHO_URL =
  WHATSAPP_GROUP_OFERTAS_EMPREGO_URL;

export type JobOfferWhatsappInviteGroup = {
  id: string;
  label: string;
  href: string;
};

/** Convite público único para o grupo de ofertas. */
export const JOB_OFFER_WHATSAPP_INVITE_GROUP: JobOfferWhatsappInviteGroup = {
  id: "ofertas-emprego-portugal",
  label: "Ofertas de emprego Portugal",
  href: WHATSAPP_GROUP_OFERTAS_EMPREGO_URL,
};

/** @deprecated Use `JOB_OFFER_WHATSAPP_INVITE_GROUP`. */
export const JOB_OFFER_WHATSAPP_INVITE_GROUPS: JobOfferWhatsappInviteGroup[] = [
  JOB_OFFER_WHATSAPP_INVITE_GROUP,
];

/** @deprecated Use `WHATSAPP_GROUP_DUVIDAS_GERAL_URL`. */
export const COMMUNITY_WHATSAPP_GROUPS_URL = WHATSAPP_GROUP_DUVIDAS_GERAL_URL;

/** @deprecated Use `WHATSAPP_GROUP_RELOCACAO_URL`. */
export const RELOCATION_HOUSES_WHATSAPP_GROUP_URL = WHATSAPP_GROUP_RELOCACAO_URL;

export type CommunityWhatsAppNavGroup = {
  id: string;
  label: string;
  href: string;
};

export const COMMUNITY_WHATSAPP_NAV_GROUPS: CommunityWhatsAppNavGroup[] = [
  {
    id: "duvidas-geral",
    label: "Grupão de ajuda",
    href: WHATSAPP_GROUP_DUVIDAS_GERAL_URL,
  },
  {
    id: "grupao-relocation",
    label: "Grupão relocation",
    href: WHATSAPP_GROUP_RELOCACAO_URL,
  },
  {
    id: "imoveis-venda",
    label: "Grupão de compra de imóveis",
    href: WHATSAPP_GROUP_IMOVEIS_VENDA_URL,
  },
];

export type CommunityWhatsappInviteGroup = {
  id: string;
  label: string;
  href: string;
  sublabel?: string;
};

export const COMMUNITY_WHATSAPP_INVITE_GROUPS: CommunityWhatsappInviteGroup[] = [
  {
    id: "atendimento-fundadoras",
    label: "Falar diretamente com Rafa & Carol",
    href: SITE_FOUNDERS_WHATSAPP_URL,
    sublabel: "WhatsApp de atendimento",
  },
  {
    id: "duvidas-geral",
    label: "Grupão de ajuda e dúvidas",
    href: WHATSAPP_GROUP_DUVIDAS_GERAL_URL,
  },
  {
    id: "grupao-relocation",
    label: "Grupão relocation",
    href: WHATSAPP_GROUP_RELOCACAO_URL,
  },
  {
    id: "imoveis-venda",
    label: "Grupão de compra de imóveis",
    href: WHATSAPP_GROUP_IMOVEIS_VENDA_URL,
  },
];
