'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';

const REFERRAL_STORAGE_KEY = 'comunidade_ref_affiliate';

function ReferralFromUrlSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const affParam = searchParams.get('aff');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const aff = (affParam ?? '').trim().toLowerCase();
    if (aff) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, aff);
    }
    // Sem ?aff=: não altera o localStorage — mantém o que já estava gravado
  }, [pathname, affParam]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <ReferralFromUrlSync />
      </Suspense>
      {children}
    </AuthProvider>
  );
}
