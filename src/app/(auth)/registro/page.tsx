'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/lib/auth-ui-events';
import { DASHBOARD_HOME_PATH } from '@/lib/dashboard-home';

/** Registo apenas via pagamento no modal Membro VIP. */
export default function RegistroPage() {
  const router = useRouter();

  useEffect(() => {
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
    router.replace(DASHBOARD_HOME_PATH);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <p className="text-sm text-muted">A redirecionar para ativação de membro…</p>
    </div>
  );
}
