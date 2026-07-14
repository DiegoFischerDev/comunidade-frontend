'use client';

import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  dismissToast,
  getToastSnapshot,
  getToasts,
  subscribeToasts,
  type ToastRecord,
  type ToastVariant,
} from '@/lib/toast';

const VARIANT_STYLES: Record<
  ToastVariant,
  { shell: string; icon: string; title: string; message: string }
> = {
  success: {
    shell: 'border-emerald-200/90 bg-emerald-50/95 shadow-emerald-900/10',
    icon: 'bg-emerald-100 text-emerald-700',
    title: 'text-emerald-950',
    message: 'text-emerald-900/90',
  },
  error: {
    shell: 'border-red-200/90 bg-red-50/95 shadow-red-900/10',
    icon: 'bg-red-100 text-red-700',
    title: 'text-red-950',
    message: 'text-red-900/90',
  },
  warning: {
    shell: 'border-amber-200/90 bg-amber-50/95 shadow-amber-900/10',
    icon: 'bg-amber-100 text-amber-800',
    title: 'text-amber-950',
    message: 'text-amber-900/90',
  },
  info: {
    shell: 'border-brand-primary/20 bg-card/95 shadow-brand-primary/10',
    icon: 'bg-brand-primary/10 text-brand-primary',
    title: 'text-foreground',
    message: 'text-foreground/85',
  },
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (variant === 'error') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 8v5M12 16h.01" />
      </svg>
    );
  }
  if (variant === 'warning') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 10v6M12 8h.01" />
    </svg>
  );
}

function ToastCard({ toast }: { toast: ToastRecord }) {
  const styles = VARIANT_STYLES[toast.variant];

  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg backdrop-blur-sm ${styles.shell}`}
    >
      <span
        className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        aria-hidden
      >
        <ToastIcon variant={toast.variant} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {toast.title ? (
          <p className={`text-sm font-semibold leading-snug ${styles.title}`}>{toast.title}</p>
        ) : null}
        <p className={`text-sm leading-snug ${toast.title ? 'mt-0.5' : ''} ${styles.message}`}>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="mt-0.5 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-black/5 hover:text-foreground/80"
        aria-label="Fechar notificação"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </motion.div>
  );
}

export function Toaster() {
  useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);
  const toasts = getToasts();

  return (
    <div
      aria-label="Notificações"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[120] flex flex-col items-center gap-3 px-4"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
