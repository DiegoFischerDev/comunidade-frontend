/** Chaves para lembrar país e dígitos do número local (sem senha). */
export const LOGIN_PHONE_STORAGE_DIAL = 'comunidade_login_whatsapp_dial';
export const LOGIN_PHONE_STORAGE_LOCAL = 'comunidade_login_whatsapp_local';

/**
 * Lembrar senha do formulário de login (localStorage, partilhado entre abas do mesmo site).
 * Mesmo padrão que o número; quem partilha o dispositivo deve usar perfil de browser ou não gravar.
 */
export const LOGIN_PASSWORD_STORAGE_KEY = 'comunidade_login_password';

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
 * Hidratação: `value` (WhatsApp com dígitos) + localStorage (país e dígitos locais).
 * Útil no mount e ao voltar à aba (mobile).
 */
export function readDialAndLocalFromStorageAndValue(valueProp: string): {
  dial: string;
  local: string;
} {
  const defaultDial = LOGIN_COUNTRY_DIALS[0]!.dial;
  try {
    const sv = loginPhoneDigitsOnly(valueProp);
    const sd = localStorage.getItem(LOGIN_PHONE_STORAGE_DIAL) ?? defaultDial;
    const sl = localStorage.getItem(LOGIN_PHONE_STORAGE_LOCAL) ?? '';
    if (sv) {
      return parseFullDigitsToDialLocal(sv, sd, sd);
    }
    return { dial: sd, local: loginPhoneDigitsOnly(sl) };
  } catch {
    const sv = loginPhoneDigitsOnly(valueProp);
    if (sv) return parseFullDigitsToDialLocal(sv, defaultDial, defaultDial);
    return { dial: defaultDial, local: '' };
  }
}

/**
 * Grava no mesmo tique do `onChange` — no Mobile Safari a aba pode ser suspensa
 * antes do `useEffect`, perdendo o último carácter.
 */
export function persistLoginPhonePartsToStorage(
  dial: string,
  localRaw: string,
): void {
  try {
    localStorage.setItem(LOGIN_PHONE_STORAGE_DIAL, dial);
    localStorage.setItem(
      LOGIN_PHONE_STORAGE_LOCAL,
      loginPhoneDigitsOnly(localRaw),
    );
  } catch {
    /* ignore */
  }
}

export function persistLoginPasswordToStorage(password: string): void {
  try {
    if (password) {
      localStorage.setItem(LOGIN_PASSWORD_STORAGE_KEY, password);
    } else {
      localStorage.removeItem(LOGIN_PASSWORD_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Número completo (só dígitos) a partir de dial + local gravados — para repor o estado
 * do pai ao voltar à aba no mobile (o `storage` não dispara na mesma aba).
 */
export function readLoginWhatsappFullFromStorage(): string {
  try {
    const defaultDial = LOGIN_COUNTRY_DIALS[0]!.dial;
    const dialRaw = localStorage.getItem(LOGIN_PHONE_STORAGE_DIAL) ?? defaultDial;
    const dial = loginPhoneDigitsOnly(dialRaw) || defaultDial;
    const local = loginPhoneDigitsOnly(
      localStorage.getItem(LOGIN_PHONE_STORAGE_LOCAL) ?? '',
    );
    return dial + local;
  } catch {
    return '';
  }
}

/**
 * Devolve código e resto a partir de um número só com dígitos (ex.: 351912345678).
 * Se nenhum prefixo da lista coincidir, usa `preferredDialIfNoPreset` (ex.: DDI manual).
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
