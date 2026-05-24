'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function RafaCallPaymentSuccessPage() {
  const { refreshUser, loginWithToken, user } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id')?.trim() ?? '';
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (sessionId) {
        const maxAttempts = 12;
        for (let i = 0; i < maxAttempts; i++) {
          if (cancelled) return;
          try {
            const res = await api.stripe.claimGuestRafacall(sessionId);
            if (res.status === 'ready') {
              await loginWithToken(res.token);
              if (!cancelled) setStatus('ready');
              return;
            }
            if (res.status === 'consumed' || res.status === 'expired' || res.status === 'invalid') {
              break;
            }
          } catch {
            // retry
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      try {
        await refreshUser();
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Erro ao confirmar o pagamento.');
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, loginWithToken, refreshUser]);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-zinc-600">A confirmar o pagamento e a preparar o agendamento…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-red-700">{error || 'Não foi possível confirmar o pagamento.'}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-900">Pagamento confirmado</h1>
        <p className="mt-2 text-zinc-700">
          {user
            ? 'Obrigado! Agora podes escolher data e hora da videochamada com a Rafa.'
            : 'Obrigado! O pagamento foi recebido. Entra com o WhatsApp e a senha que definiste.'}
        </p>
        <Link
          href="/dashboard?openRafaCall=1"
          className="mt-6 inline-block rounded-full bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
        >
          Agendar agora
        </Link>
      </div>
    </div>
  );
}
