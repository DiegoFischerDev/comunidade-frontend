'use client';

import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';
import { OPEN_AUTH_LOGIN_EVENT } from '@/lib/auth-ui-events';
import { CardButton } from '@/components/ui/CardButton';
import ChecklistPage from '@/app/(dashboard)/dashboard/checklist/checklist-page';

function canAccessPlanoImigracao(user: ReturnType<typeof useAuth>['user']) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.tier === 'MEMBER';
}

export default function PlanoDeImigracaoPage() {
  const { user, loading } = useAuth();

  const allowed = useMemo(() => canAccessPlanoImigracao(user), [user]);

  function handleCta() {
    if (typeof window === 'undefined') return;
    if (!user) {
      window.dispatchEvent(new Event(OPEN_AUTH_LOGIN_EVENT));
      return;
    }
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-600">A carregar…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Plano de imigração</h1>
        <p className="text-sm leading-relaxed text-zinc-600">
          O plano interativo de imigração é exclusivo para membros VIP da Comunidade Rafa Portugal.
          Inicia sessão e associa a tua assinatura para desbloquear checklists, estimativas e impressão.
        </p>
        <CardButton type="button" variant="primary" onClick={handleCta}>
          {user ? 'Tornar-me membro VIP' : 'Entrar ou criar conta'}
        </CardButton>
      </div>
    );
  }

  return <ChecklistPage />;
}
