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

/** Convite WhatsApp — ofertas de trabalho por região. */
export const WHATSAPP_GROUP_OFERTAS_NORTE_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_OFERTAS_NORTE_URL?.trim() ||
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_OFERTAS_TRABALHO_URL?.trim() ||
  "https://chat.whatsapp.com/EONaquXnkDx6NmdAdCIouM";

export const WHATSAPP_GROUP_OFERTAS_CENTRO_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_OFERTAS_CENTRO_URL?.trim() ||
  "https://chat.whatsapp.com/LRTOsPySDTdAD5AEY7lvmP";

export const WHATSAPP_GROUP_OFERTAS_SUL_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_OFERTAS_SUL_URL?.trim() ||
  "https://chat.whatsapp.com/DLGVjkVEdlr7u44BwEHOeJ";

/** @deprecated Use `WHATSAPP_GROUP_OFERTAS_NORTE_URL`. */
export const WHATSAPP_GROUP_OFERTAS_TRABALHO_URL =
  WHATSAPP_GROUP_OFERTAS_NORTE_URL;

export type JobOfferWhatsappInviteGroup = {
  region: "NORTE" | "CENTRO" | "SUL";
  label: string;
  href: string;
};

export const JOB_OFFER_WHATSAPP_INVITE_GROUPS: JobOfferWhatsappInviteGroup[] = [
  {
    region: "NORTE",
    label: "Norte",
    href: WHATSAPP_GROUP_OFERTAS_NORTE_URL,
  },
  {
    region: "CENTRO",
    label: "Centro",
    href: WHATSAPP_GROUP_OFERTAS_CENTRO_URL,
  },
  {
    region: "SUL",
    label: "Sul",
    href: WHATSAPP_GROUP_OFERTAS_SUL_URL,
  },
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
    label: "Imóveis a venda",
    href: WHATSAPP_GROUP_IMOVEIS_VENDA_URL,
  },
];

export type CommunityWhatsappInviteGroup = {
  id: string;
  label: string;
  href: string;
};

export const COMMUNITY_WHATSAPP_INVITE_GROUPS: CommunityWhatsappInviteGroup[] = [
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
    label: "Imóveis a venda",
    href: WHATSAPP_GROUP_IMOVEIS_VENDA_URL,
  },
];
