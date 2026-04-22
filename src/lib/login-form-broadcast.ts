const CHANNEL_NAME = 'comunidade:login-form-v1';

function localDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Id por contexto de separador (cada aba tem o seu). Usado para ignorar
 * eco e para o `storage` que no iOS nem sequer chega à outra aba.
 */
export const loginFormTabId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type LoginFormBroadcastMsg =
  | {
      v: 1;
      tabId: string;
      t: 'phone';
      dial: string;
      local: string;
    }
  | { v: 1; tabId: string; t: 'password'; password: string };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export function broadcastLoginFormPhone(dial: string, localRaw: string): void {
  const c = getChannel();
  if (!c) return;
  const msg: LoginFormBroadcastMsg = {
    v: 1,
    tabId: loginFormTabId,
    t: 'phone',
    dial,
    local: localDigits(localRaw),
  };
  c.postMessage(msg);
}

export function broadcastLoginFormPassword(password: string): void {
  const c = getChannel();
  if (!c) return;
  const msg: LoginFormBroadcastMsg = {
    v: 1,
    tabId: loginFormTabId,
    t: 'password',
    password,
  };
  c.postMessage(msg);
}

export function subscribeLoginFormSync(
  handler: (msg: LoginFormBroadcastMsg) => void,
): () => void {
  const c = getChannel();
  if (!c) {
    return () => {};
  }
  const fn = (ev: MessageEvent<LoginFormBroadcastMsg>) => {
    const d = ev.data;
    if (!d || d.v !== 1) return;
    if (d.tabId === loginFormTabId) return;
    handler(d);
  };
  c.addEventListener('message', fn);
  return () => c.removeEventListener('message', fn);
}
