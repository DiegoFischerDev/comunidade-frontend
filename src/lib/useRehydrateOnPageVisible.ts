import { useEffect, useRef } from 'react';

/**
 * Reexecuta `apply` quando o separador/app volta a ficar ativo ou a página sai do bfcache.
 * No mobile, `visibilitychange` às vezes chega cedo demais — usamos `requestAnimationFrame` x2,
 * `setTimeout(0)` e `window.focus` (Safari/Chrome iOS).
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
    /** Safari iOS: o DOM/LS pode só estar coerente no frame seguinte. */
    const schedule = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(run, 0);
        });
      });
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) schedule();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    const onWinFocus = () => schedule();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onWinFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onWinFocus);
    };
  }, []);
}
