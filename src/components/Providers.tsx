'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

const REFERRAL_STORAGE_KEY = 'comunidade_ref_affiliate';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (current) return;
    const params = new URLSearchParams(window.location.search);
    const aff = (params.get('aff') ?? '').trim().toLowerCase();
    if (aff) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, aff);
    } else {
      // Lock de descoberta orgânica: evita atribuição futura indevida
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, 'nenhum');
    }
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
