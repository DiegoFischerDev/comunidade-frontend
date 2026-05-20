const STORAGE_KEY = 'rpm_partner_device_id_v1';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuidV4(s: string): boolean {
  return s.length <= 64 && UUID_V4.test(s.trim());
}

/**
 * Identificador opaco por browser para comentários/reações de visitante.
 * Deve ser enviado no cabeçalho `X-Partner-Device-Id` nas rotas públicas de parceiro.
 */
export function getOrCreatePartnerDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    const existing = localStorage.getItem(STORAGE_KEY)?.trim().toLowerCase();
    if (existing && isValidUuidV4(existing)) {
      return existing;
    }
    const id = crypto.randomUUID().toLowerCase();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return '';
  }
}
