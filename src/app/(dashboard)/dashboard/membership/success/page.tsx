'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function MembershipSuccessPage() {
  const { refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-900">Pagamento concluído</h1>
        <p className="mt-2 text-zinc-700">
          Obrigado! Já és membro da Comunidade RPM. Tens acesso a todos os benefícios durante um ano.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
        >
          Ir para o dashboard
        </Link>
      </div>
    </div>
  );
}
