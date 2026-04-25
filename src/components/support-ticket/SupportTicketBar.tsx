'use client';

import Link from 'next/link';

const RECLAME_AQUI_HREF = '/dashboard/reclame-aqui';

/**
 * Faixa mínima de acesso a tickets — leva à área "Reclame aqui" do dashboard.
 */
export function SupportTicketBar() {
  return (
    <aside className="border-t border-zinc-200/80 bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] justify-center px-4 pb-1 pt-3 text-xs md:px-6">
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
