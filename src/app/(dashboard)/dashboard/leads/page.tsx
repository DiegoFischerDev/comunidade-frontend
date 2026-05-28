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

function previewOneLine(text: string | null, max = 100): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '—';
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

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
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => {
      const hay = [l.id, l.name, l.email, l.whatsapp, l.comment ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, query]);

  const filteredCount = filtered.length;

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
      <header className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Meus leads
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Leads encaminhados a partir do questionário público de financiamento.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {!loading && totalCount > 0 ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {filteredCount} {filteredCount === 1 ? 'lead' : 'leads'}
            </span>
          ) : null}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, WhatsApp, email…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 sm:w-80"
          />
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-zinc-700">
            {leads.length === 0
              ? 'Ainda não recebeste nenhum lead. Assim que um utilizador concluir o questionário público de financiamento, o sistema atribuirá automaticamente o próximo lead ao parceiro com menos leads no total — pode ser para ti.'
              : 'Nenhum lead encontrado com esse filtro.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: mantém cards */}
          <ul className="space-y-3 sm:hidden">
            {filtered.map((lead) => {
              const wa = digitsOnly(lead.whatsapp);
              const isOpen = expandedId === lead.id;
              return (
                <li
                  key={lead.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-3 p-4">
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
                          Primeiro envio em {formatDate(lead.docsSentAt)}. Verifica o teu
                          email para os documentos.
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
                        {isOpen ? 'Ocultar detalhes' : 'Ver resumo'}
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

          {/* Desktop: tabela (igual estilo do admin) */}
          <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 bg-white sm:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Docs</th>
                  <th className="px-4 py-3">Resumo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((lead) => {
                  const wa = digitsOnly(lead.whatsapp);
                  const isOpen = expandedId === lead.id;
                  return (
                    <tr key={lead.id} className="hover:bg-zinc-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900">{lead.name}</div>
                        <div className="text-xs text-zinc-600">
                          {lead.email} · +{wa}
                        </div>
                        <div className="text-[11px] text-zinc-400">ID: {lead.id}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                        {lead.docsSentAt ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                            ✓ enviados ({lead.submissionsCount})
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                            a aguardar
                          </span>
                        )}
                      </td>
                      <td className="max-w-[420px] px-4 py-3 text-zinc-700">
                        {previewOneLine(lead.comment)}
                        {isOpen && lead.comment ? (
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-800">
                            {lead.comment}
                          </pre>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {wa ? (
                          <a
                            href={`https://wa.me/${wa}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                        {lead.comment ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId((prev) => (prev === lead.id ? null : lead.id))
                            }
                            className="ml-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                          >
                            {isOpen ? 'Ocultar' : 'Ver'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
