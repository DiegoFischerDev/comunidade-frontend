export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export type ToastRecord = {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  createdAt: number;
};

const TOAST_AUTO_DISMISS_MS = 5000;

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: TOAST_AUTO_DISMISS_MS,
  error: TOAST_AUTO_DISMISS_MS,
  info: TOAST_AUTO_DISMISS_MS,
  warning: TOAST_AUTO_DISMISS_MS,
};

const MAX_TOASTS = 5;

let items: ToastRecord[] = [];
let version = 0;
const listeners = new Set<() => void>();
const dismissTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToastSnapshot() {
  return version;
}

export function getToasts(): readonly ToastRecord[] {
  return items;
}

export function dismissToast(id: string) {
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
  const next = items.filter((toast) => toast.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function enqueue(
  variant: ToastVariant,
  message: string,
  opts?: { title?: string; durationMs?: number },
) {
  const trimmed = message.trim();
  if (!trimmed) return undefined;

  const id = createId();
  const record: ToastRecord = {
    id,
    variant,
    title: opts?.title?.trim() || undefined,
    message: trimmed,
    createdAt: Date.now(),
  };

  items = [...items.slice(-(MAX_TOASTS - 1)), record];
  emit();

  const duration = opts?.durationMs ?? DEFAULT_DURATIONS[variant];
  if (duration > 0 && typeof window !== 'undefined') {
    const timer = globalThis.setTimeout(() => dismissToast(id), duration);
    dismissTimers.set(id, timer);
  }

  return id;
}

export const toast = {
  success: (message: string, opts?: { title?: string; durationMs?: number }) =>
    enqueue('success', message, opts),
  error: (message: string, opts?: { title?: string; durationMs?: number }) =>
    enqueue('error', message, opts),
  info: (message: string, opts?: { title?: string; durationMs?: number }) =>
    enqueue('info', message, opts),
  warning: (message: string, opts?: { title?: string; durationMs?: number }) =>
    enqueue('warning', message, opts),
  dismiss: dismissToast,
};
