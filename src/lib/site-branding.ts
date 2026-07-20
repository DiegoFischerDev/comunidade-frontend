/** Identidade pública do site (metadata, OG, favicon, logos). */

/** Ficheiros-fonte do design: `frontend/move-casa-brand/`. Runtime: `public/brand/`. */

export const SITE_NAME = "Move Casa";
export const SITE_NAME_FULL = "Move Casa Relocation";
export const SITE_CONTACT_EMAIL = "atendimento@movecasa.pt";
export const SITE_FOUNDERS = "Rafa e Carol";
/** WhatsApp das fundadoras (hero CTA «Quero falar com as meninas»). */
export const SITE_FOUNDERS_WHATSAPP_DIGITS = "351926977469";
/** Mensagem pré-preenchida nos links de atendimento (wa.me) do site. */
export const SITE_ATENDIMENTO_WHATSAPP_MESSAGE =
  "Oi meninas, vim pelo site e gostaria de mais informaçoes sobre o serviço de vocês";
export const SITE_FOUNDERS_WHATSAPP_URL = `https://wa.me/${SITE_FOUNDERS_WHATSAPP_DIGITS}?text=${encodeURIComponent(SITE_ATENDIMENTO_WHATSAPP_MESSAGE)}`;

export const SITE_TAGLINE =
  "Mude para Portugal com ajuda de quem já viveu esse processo.";

export const SITE_DESCRIPTION =
  "Acompanhamento completo para brasileiros que querem imigrar para Portugal com tranquilidade. Fundado por Rafa e Carol.";

/** Prefixo `/brand/` — URLs novas para não reutilizar cache de assets antigos. */
export const BRAND_ASSET_BASE = "/brand";

/** Áudio de boas-vindas (nota de voz PTT) — runtime em `public/brand/audios/`. */
export const BRAND_WELCOME_AUDIO = `${BRAND_ASSET_BASE}/audios/wellcome-carol.ogg`;

/** Incrementar quando favicons/assets em `/brand/` forem substituídos (cache bust). */
export const BRAND_ASSET_VERSION = "7";

function withBrandVersion(path: string): string {
  return `${path}?v=${BRAND_ASSET_VERSION}`;
}

/** JPEG 1200×630 — tamanho recomendado para WhatsApp / Facebook (evita timeout com PNG >2MB). */
export const BRAND_OG_IMAGE = `${BRAND_ASSET_BASE}/og-image.jpg`;
export const BRAND_OG_IMAGE_WIDTH = 1200;
export const BRAND_OG_IMAGE_HEIGHT = 630;
export const BRAND_OG_IMAGE_TYPE = "image/jpeg";

export const BRAND_LOGO_HORIZONTAL = `${BRAND_ASSET_BASE}/logo-horizontal.png`;
export const BRAND_LOGO_HORIZONTAL_GREEN = `${BRAND_ASSET_BASE}/logo-horizontal-green.png`;
/** Logo horizontal sem fundo — fonte: `move-casa-brand/logo/logo-horizontal-sem-fundo.png`. */
export const BRAND_LOGO_HORIZONTAL_TRANSPARENT = `${BRAND_ASSET_BASE}/logo-horizontal-sem-fundo.png`;
/** Logo horizontal colorida — fonte: `move-casa-brand/logo/logo-horizontal-colorida.png`. */
export const BRAND_LOGO_HORIZONTAL_COLORIDA = `${BRAND_ASSET_BASE}/logo-horizontal-colorida.png`;
/** Logo horizontal colorida para fundos escuros (topbar) — fonte: `move-casa-brand/logo/logo-horizontal-colorido-fundo-escuro.png`. */
export const BRAND_LOGO_HORIZONTAL_COLORIDA_DARK_BG = `${BRAND_ASSET_BASE}/logo-horizontal-colorido-fundo-escuro.png`;
export const BRAND_LOGO_SQUARE = `${BRAND_ASSET_BASE}/logo-square.png`;
/** Logo quadrada sem fundo — fonte: `move-casa-brand/logo/logo-quadrada-sem-fundo.png`. */
export const BRAND_LOGO_SQUARE_TRANSPARENT = `${BRAND_ASSET_BASE}/logo-quadrada-sem-fundo.png`;
export const BRAND_ICON = `${BRAND_ASSET_BASE}/icon.png`;
/** Ícone para fundos claros (ex.: atalho flutuante mobile no topo). */
export const BRAND_ICON_LIGHT = `${BRAND_ASSET_BASE}/logo-bg-claro-sem-fundo.png`;

export const BRAND_HERO_BG_DESKTOP = `${BRAND_ASSET_BASE}/hero-background/bg-desktop.webp`;
export const BRAND_HERO_BG_MOBILE = `${BRAND_ASSET_BASE}/hero-background/bg-mobile.webp`;
export const BRAND_HERO_FOUNDERS_IMAGE = `${BRAND_ASSET_BASE}/hero-background/especialista.webp`;
/** Cursor personalizado (avião) — secção carrossel do dashboard. */
export const BRAND_HERO_AIRPLANE_CURSOR = `${BRAND_ASSET_BASE}/hero-background/aviao-cursor.png`;
export const BRAND_HERO_AIRPLANE_CURSOR_SIZE = 84;
export const BRAND_HERO_AIRPLANE_CURSOR_HOTSPOT_X = 16;
/** 0° = nariz para cima. Asset atual (cima-esquerda) ≈ -45°. Usar 0 com PNG apontado para cima. */
export const BRAND_HERO_AIRPLANE_CURSOR_BASE_ANGLE = -45;
export const BRAND_HERO_AIRPLANE_CURSOR_MAX_TILT = 45;
export const BRAND_HERO_BG_DESKTOP_WIDTH = 1672;
export const BRAND_HERO_BG_DESKTOP_HEIGHT = 941;
export const BRAND_HERO_BG_MOBILE_WIDTH = 941;
export const BRAND_HERO_BG_MOBILE_HEIGHT = 1672;
export const BRAND_HERO_FOUNDERS_WIDTH = 1200;
export const BRAND_HERO_FOUNDERS_HEIGHT = 1800;

/** Especialistas — secção de serviços do dashboard. Fonte: `move-casa-brand/especialistas/rafa-carol.webp`. */
export const BRAND_SERVICES_SPECIALISTS_IMAGE = `${BRAND_ASSET_BASE}/especialistas/rafa-carol.webp`;
export const BRAND_SERVICES_SPECIALISTS_IMAGE_WIDTH = 800;
export const BRAND_SERVICES_SPECIALISTS_IMAGE_HEIGHT = 1000;

/** OG da página pública `/agendar`. Fonte: `move-casa-brand/especialistas/og-image-agendamento.jpg` (1200×630). */
export const BRAND_AGENDAMENTO_OG_IMAGE = `${BRAND_ASSET_BASE}/especialistas/og-image-agendamento.jpg`;
export const BRAND_AGENDAMENTO_OG_IMAGE_WIDTH = 1200;
export const BRAND_AGENDAMENTO_OG_IMAGE_HEIGHT = 630;
export const BRAND_AGENDAMENTO_OG_IMAGE_TYPE = "image/jpeg";
export const BRAND_AGENDAMENTO_OG_IMAGE_URL = withBrandVersion(BRAND_AGENDAMENTO_OG_IMAGE);

export const AGENDAMENTO_PAGE_TITLE =
  "Agende uma chamada de 40 minutos com Rafa & Carol";
export const AGENDAMENTO_PAGE_DESCRIPTION =
  "Marque sua videochamada gratuita com a Rafa e a Carol. Relocation para Portugal com acolhimento, confiança e economia — Viseu e São Pedro do Sul.";

export const BRAND_FAVICON_ICO = `${BRAND_ASSET_BASE}/favicon.ico`;
export const BRAND_APPLE_TOUCH_ICON = `${BRAND_ASSET_BASE}/apple-touch-icon.png`;
export const BRAND_MANIFEST = `${BRAND_ASSET_BASE}/site.webmanifest`;

export const BRAND_OG_IMAGE_URL = withBrandVersion(BRAND_OG_IMAGE);

export const BRAND_FAVICON_ICO_URL = withBrandVersion(BRAND_FAVICON_ICO);
export const BRAND_FAVICON_32_URL = withBrandVersion(`${BRAND_ASSET_BASE}/favicon-32x32.png`);
export const BRAND_FAVICON_16_URL = withBrandVersion(`${BRAND_ASSET_BASE}/favicon-16x16.png`);
export const BRAND_APPLE_TOUCH_ICON_URL = withBrandVersion(BRAND_APPLE_TOUCH_ICON);

/** Título de página com sufixo da marca (ex.: «Imóvel X | Move Casa»). */
export function pageTitleWithBrand(pageTitle: string): string {
  return `${pageTitle} | ${SITE_NAME}`;
}
