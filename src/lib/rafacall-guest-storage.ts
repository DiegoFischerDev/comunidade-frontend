/**
 * Persistência local (browser) do agendamento guest do RafaCall.
 * Permite que o card do dashboard mostre o agendamento sem o utilizador estar autenticado.
 *
 * Privacidade: armazenamos só dados não sensíveis (id do booking, data/hora, fuso, nome).
 * O WhatsApp é guardado em formato normalizado para que a página de gestão possa pré-preencher,
 * mas o backend continua a exigir confirmação por WhatsApp para qualquer alteração.
 */

const STORAGE_KEY = 'rafacall_guest_booking_v1';
const DEVICE_ID_KEY = 'rafacall_device_id_v1';
const LAST_NAME_KEY = 'rafacall_last_name_v1';

const MAX_STORED_NAME_LENGTH = 80;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidV4(s: string): boolean {
  return s.length <= 64 && UUID_V4.test(s.trim());
}

/** UUID v4 persistente por browser — usado no bloqueio de 1 agendamento ativo por dispositivo. */
export function getOrCreateRafacallDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)?.trim().toLowerCase();
    if (existing && isValidUuidV4(existing)) return existing;
    const id = crypto.randomUUID().toLowerCase();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}

export type RafacallGuestBookingStored = {
  bookingId: string;
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  timezone: string;
  name: string;
  whatsapp: string; // só dígitos
  savedAt: string;
};

function isStored(value: unknown): value is RafacallGuestBookingStored {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.bookingId === 'string' &&
    typeof v.startsAt === 'string' &&
    typeof v.endsAt === 'string' &&
    typeof v.timezone === 'string' &&
    typeof v.name === 'string' &&
    typeof v.whatsapp === 'string'
  );
}

export function saveRafacallGuestBooking(input: Omit<RafacallGuestBookingStored, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: RafacallGuestBookingStored = {
      ...input,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage indisponível — silenciar
  }
}

export function readRafacallGuestBooking(): RafacallGuestBookingStored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isStored(parsed)) return null;
    // Limpa se a chamada já terminou (após o endsAt).
    if (new Date(parsed.endsAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRafacallGuestBooking(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

/** Último nome indicado neste dispositivo no fluxo /agendar. */
export function readRafacallLastName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_NAME_KEY)?.trim() ?? '';
    if (raw.length < 2) return null;
    return raw.slice(0, MAX_STORED_NAME_LENGTH);
  } catch {
    return null;
  }
}

export function saveRafacallLastName(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim().slice(0, MAX_STORED_NAME_LENGTH);
  if (trimmed.length < 2) return;
  try {
    window.localStorage.setItem(LAST_NAME_KEY, trimmed);
  } catch {
    // noop
  }
}

export function rafacallGuestManageUrl(bookingId: string): string {
  return `/agendamento/${bookingId}`;
}
