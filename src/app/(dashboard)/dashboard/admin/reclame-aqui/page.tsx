'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type Payload = Awaited<ReturnType<typeof api.admin.support.tickets>>;

function prettyDtPt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function waDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

function preview100(text: string): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= 100) return t;
  return `${t.slice(0, 100)}…`;
}

function statusLabel(s: Payload['items'][number]['status']): string {
  if (s === 'IN_REVIEW') return 'Em análise';
  if (s === 'DONE') return 'Concluído';
  return 'Registrado';
}

function statusClass(s: Payload['items'][number]['status']): string {
  if (s === 'IN_REVIEW') return 'bg-amber-50 text-amber-800';
  if (s === 'DONE') return 'bg-emerald-50 text-emerald-800';
  return 'bg-zinc-100 text-zinc-800';
}

export default function AdminReclameAquiPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<Payload['items'][number] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Payload['items'][number] | null>(null);
  const [editStatus, setEditStatus] = useState<'REGISTERED' | 'IN_REVIEW' | 'DONE'>('REGISTERED');
  const [editReply, setEditReply] = useState('');
  const [saving, setSaving] = useState(false);

  const canSee = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.support.tickets(300);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  if (!user) return null;
  if (!canSee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Reclame aqui</h1>
        <p className="mt-2 text-sm text-zinc-600">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Reclame aqui</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Tickets enviados por membros/visitantes (elogios, reclamações de parceiros e bugs).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">Nenhum ticket encontrado.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Quem abriu</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mensagem</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((t) => (
                <tr key={t.id} className="align-top text-zinc-800">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                    {prettyDtPt(t.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{t.user.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(t.status)}`}>
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-800">{preview100(t.message)}</div>
                    {t.adminReply ? (
                      <div className="mt-1 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-600">Resposta:</span>{' '}
                        {preview100(t.adminReply)}
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(t)}
                        className="cursor-pointer rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-200"
                      >
                        Ver mensagem
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(t);
                          setEditStatus(t.status);
                          setEditReply(t.adminReply ?? '');
                          setError('');
                        }}
                        className="cursor-pointer rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Responder
                      </button>
                      <a
                        className="inline-flex cursor-pointer items-center justify-center rounded bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                        href={`https://wa.me/${waDigits(t.user.whatsapp)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        disabled={deletingId === t.id}
                        onClick={async () => {
                          const ok = window.confirm('Excluir este ticket? Esta ação não pode ser desfeita.');
                          if (!ok) return;
                          setDeletingId(t.id);
                          setError('');
                          try {
                            await api.admin.support.deleteTicket(t.id);
                            await load();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Não foi possível excluir.');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === t.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Mensagem do ticket</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {viewing.user.name} · {prettyDtPt(viewing.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="whitespace-pre-wrap text-sm text-zinc-800">{viewing.message}</div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="cursor-pointer rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200"
              >
                Fechar
              </button>
              <a
                className="inline-flex cursor-pointer items-center justify-center rounded bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                href={`https://wa.me/${waDigits(viewing.user.whatsapp)}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Responder ticket</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {editing.user.name} · {prettyDtPt(editing.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="whitespace-pre-wrap text-sm text-zinc-800">{editing.message}</div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  disabled={saving}
                >
                  <option value="REGISTERED">Registrado</option>
                  <option value="IN_REVIEW">Em análise</option>
                  <option value="DONE">Concluído</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700">Resposta do admin</label>
                <textarea
                  value={editReply}
                  onChange={(e) => setEditReply(e.target.value)}
                  rows={6}
                  disabled={saving}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  placeholder="Escreve aqui…"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="cursor-pointer rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setError('');
                  try {
                    await api.admin.support.updateTicket(editing.id, {
                      status: editStatus,
                      adminReply: editReply.trim() ? editReply : null,
                    });
                    setEditing(null);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
                  } finally {
                    setSaving(false);
                  }
                }}
                className="cursor-pointer rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

