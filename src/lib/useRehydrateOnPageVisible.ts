import { useEffect, useRef } from 'react';

/**
 * Reexecuta a callback quando a página fica visível (outra aba ou app) ou
 * repõe a partir de bfcache (`pageshow` + `persisted`). Ajudam inputs em
 * mobile a resincronizar com `localStorage` se o motor estiver a “perder”
 * o estado do React.
 */
export function useRehydrateOnPageVisible(apply: () => void) {
  const ref = useRef(apply);
  ref.current = apply;
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      try {
        ref.current();
      } catch {
        /* ignore */
      }
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) run();
    };
    document.addEventListener('visibilitychange', run);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
}
