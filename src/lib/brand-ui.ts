/** Classes Tailwind / componentes reutilizáveis da identidade visual. */

/** Item activo na navegação lateral (fundo accent sobre sidebar verde). */
export const NAV_LINK_ACTIVE_CLASS = 'brand-nav-active';

/** Item inactivo na navegação lateral. */
export const NAV_LINK_INACTIVE_CLASS = 'brand-nav-inactive';

/** Contentor da barra lateral. */
export const SIDEBAR_SHELL_CLASS = 'brand-sidebar-shell';

/** Área de links dentro da sidebar. */
export const SIDEBAR_NAV_CLASS = 'brand-sidebar-nav';

/** Fundo principal das páginas do dashboard. */
export const PAGE_SHELL_CLASS = 'bg-page text-foreground';

/** CTA com cor de destaque dourada. */
export const BRAND_CTA_ACCENT_CLASS = 'brand-cta-accent';

/** CTA primário sólido (fundo verde). */
export const BRAND_CTA_PRIMARY_CLASS = 'brand-cta-primary';

/** Card padrão da marca. */
export const BRAND_CARD_CLASS = 'brand-card';

/** Input padrão da marca. */
export const BRAND_INPUT_CLASS = 'brand-input';

/** Focus ring verde para inputs customizados. */
export const BRAND_INPUT_FOCUS_CLASS =
  'focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25';

/** Scrim de modal. */
export const BRAND_MODAL_SCRIM_CLASS = 'brand-modal-scrim';

/** Base das setas de carrossel. */
export const BRAND_CAROUSEL_NAV_BASE =
  'absolute z-30 top-1/2 flex h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-[14px] border-0 brand-carousel-nav p-0 outline-none transition-colors duration-200 ease-out md:h-12 md:w-12 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40';

/** Botão base — altura 48px, raio 14px. */
export const BRAND_BUTTON_BASE =
  'inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-base font-semibold transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50';
