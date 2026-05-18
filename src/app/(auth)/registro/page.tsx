'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/lib/auth-ui-events';

/** Registo apenas via pagamento no modal Membro VIP. */
export default function RegistroPage() {
  const router = useRouter();

  useEffect(() => {
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <p className="text-sm text-zinc-600">A redirecionar para ativação de membro…</p>
    </div>
  );
}
