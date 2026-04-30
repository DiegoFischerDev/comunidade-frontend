'use client';

import Link from 'next/link';

const RECLAME_AQUI_HREF = '/dashboard/reclame-aqui';
const PRIVACIDADE_HREF = '/privacidade';

/**
 * Faixa mínima de acesso a tickets — leva à área "Reclame aqui" do dashboard.
 */
export function SupportTicketBar() {
  return (
    <aside className="border-t border-zinc-200/80 bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-1 pt-3 text-xs md:px-6">
        <Link
          href={PRIVACIDADE_HREF}
          className="text-zinc-500 transition hover:text-zinc-800"
        >
          Política de privacidade
        </Link>
        <span className="select-none text-zinc-300" aria-hidden>
          ·
        </span>
        <Link
          href={RECLAME_AQUI_HREF}
          className="text-zinc-500 transition hover:text-zinc-800"
        >
          Suporte e reclamações aqui
        </Link>
      </div>
    </aside>
  );
}
