/** Chaves para lembrar país e dígitos (sem senha). */
export const LOGIN_PHONE_STORAGE_DIAL = 'comunidade_login_whatsapp_dial';
export const LOGIN_PHONE_STORAGE_LOCAL = 'comunidade_login_whatsapp_local';

/**
 * Valor do `<select>` para DDI manual (não colidir com códigos numéricos).
 */
export const LOGIN_COUNTRY_CUSTOM_SELECT = '__other__';

/** Presets no UI: Portugal primeiro (default), Brasil. O parse usa ordenação por comprimento do dial. */
export const LOGIN_COUNTRY_DIALS: { dial: string; label: string; flag: string }[] = [
  { dial: '351', label: 'Portugal (+351)', flag: '🇵🇹' },
  { dial: '55', label: 'Brasil (+55)', flag: '🇧🇷' },
];

const PRESET_DIAL_SET = new Set(LOGIN_COUNTRY_DIALS.map((c) => c.dial));

export function isPresetCountryDial(dial: string): boolean {
  return PRESET_DIAL_SET.has(loginPhoneDigitsOnly(dial));
}

export function loginPhoneDigitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Devolve código e resto a partir de um número só com dígitos (ex.: 351912345678).
 * Se nenhum prefixo da lista coincidir, usa `preferredDialIfNoPreset` (ex.: DDI manual guardado).
 */
export function parseFullDigitsToDialLocal(
  fullDigits: string,
  fallbackDial: string,
  preferredDialIfNoPreset?: string,
): { dial: string; local: string } {
  const d = loginPhoneDigitsOnly(fullDigits);
  if (!d) return { dial: fallbackDial, local: '' };
  const sorted = [...LOGIN_COUNTRY_DIALS].sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  for (const { dial } of sorted) {
    if (d.startsWith(dial)) {
      return { dial, local: d.slice(dial.length) };
    }
  }
  const pref = preferredDialIfNoPreset
    ? loginPhoneDigitsOnly(preferredDialIfNoPreset)
    : '';
  if (pref && d.startsWith(pref)) {
    return { dial: pref, local: d.slice(pref.length) };
  }
  return { dial: fallbackDial, local: d };
}
