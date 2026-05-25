'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type LeadRow = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  comment: string | null;
  outcomeKey: string | null;
  docsSentAt: string | null;
  submissionsCount: number;
  createdAt: string;
};

/** Apenas dígitos — para construir links wa.me. */
function digitsOnly(value: string): string {
  return String(value ?? '').replace(/\D+/g, '');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.partner.leads.list();
        setLeads(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar leads.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const totalCount = useMemo(() => leads.length, [leads]);

  if (!user) return null;

  if (user.role !== 'PARTNER') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Meus leads</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta página é exclusiva para parceiros de financiamento.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Meus leads
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Leads encaminhados a partir do questionário público de financiamento.
          </p>
        </div>
        {!loading && totalCount > 0 ? (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
            {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
          </span>
        ) : null}
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-zinc-700">
            Ainda não recebeste nenhum lead. Assim que um utilizador concluir o questionário
            público de financiamento, o sistema atribuirá automaticamente o próximo lead ao
            parceiro com menos leads no total — pode ser para ti.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => {
            const wa = digitsOnly(lead.whatsapp);
            const isOpen = expandedId === lead.id;
            return (
              <li
                key={lead.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-base font-semibold text-zinc-900">
                        {lead.name}
                      </h2>
                      <span className="text-xs text-zinc-500">
                        {formatDate(lead.createdAt)}
                      </span>
                      {lead.docsSentAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          ✓ Docs enviados
                          {lead.submissionsCount > 1
                            ? ` (${lead.submissionsCount} envios)`
                            : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                          A aguardar docs
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {wa ? (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          +{wa}
                        </a>
                      ) : null}
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="break-all font-medium text-blue-700 hover:underline"
                        >
                          {lead.email}
                        </a>
                      ) : null}
                    </div>
                    {lead.docsSentAt ? (
                      <p className="text-xs text-zinc-500">
                        Primeiro envio em {formatDate(lead.docsSentAt)}. Verifica o teu email
                        para os documentos.
                      </p>
                    ) : null}
                  </div>
                  {lead.comment ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((prev) => (prev === lead.id ? null : lead.id))
                      }
                      className="self-start rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      {isOpen ? 'Ocultar detalhes' : 'Ver respostas do quiz'}
                    </button>
                  ) : null}
                </div>
                {isOpen && lead.comment ? (
                  <pre className="m-4 mt-0 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-800">
                    {lead.comment}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
