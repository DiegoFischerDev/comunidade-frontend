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
  "https://chat.whatsapp.com/L5Lo18rPzut7lF6BFO0i67?mode=gi_t";

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
    label: "Dúvidas em geral",
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
