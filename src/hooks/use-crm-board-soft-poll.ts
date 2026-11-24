'use client';

import { useEffect, useRef } from 'react';
import { CRM_BOARD_SOFT_POLL_MS } from '@/lib/rafacall-crm';

/**
 * Soft poll do kanban CRM: intervalo fixo + refetch ao voltar ao tab.
 * Não corre com tab escondido nem enquanto `paused` for true (ex.: drag).
 */
export function useCrmBoardSoftPoll(options: {
  enabled: boolean;
  paused: boolean;
  onPoll: () => void | Promise<void>;
  intervalMs?: number;
}) {
  const { enabled, paused, onPoll, intervalMs = CRM_BOARD_SOFT_POLL_MS } = options;
  const onPollRef = useRef(onPoll);
  const pausedRef = useRef(paused);
  const inFlightRef = useRef(false);

  onPollRef.current = onPoll;
  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (pausedRef.current) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      void Promise.resolve(onPollRef.current()).finally(() => {
        inFlightRef.current = false;
      });
    };

    const timerId = window.setInterval(run, intervalMs);

    const onVisibility = () => {
      if (!document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);
}
