/**
 * Persistência local (browser) do agendamento guest do RafaCall.
 * Permite que o card do dashboard mostre o agendamento sem o utilizador estar autenticado.
 *
 * Privacidade: armazenamos só dados não sensíveis (id do booking, data/hora, fuso, nome).
 * O WhatsApp é guardado em formato normalizado para que a página de gestão possa pré-preencher,
 * mas o backend continua a exigir confirmação por WhatsApp para qualquer alteração.
 */

const STORAGE_KEY = 'rafacall_guest_booking_v1';

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

export function rafacallGuestManageUrl(bookingId: string): string {
  return `/agendamento/${bookingId}`;
}
