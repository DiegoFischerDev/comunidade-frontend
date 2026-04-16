'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RafaCallPaymentSuccessPage() {
  const { refreshUser } = useAuth();

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Pagamento confirmado</h1>
      <p className="text-sm text-zinc-600">
        O teu pagamento do agendamento foi confirmado. Agora é só escolher data e hora.
      </p>
      <Link
        href="/dashboard?openRafaCall=1"
        className="inline-flex rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
      >
        Agendar agora
      </Link>
    </div>
  );
}
