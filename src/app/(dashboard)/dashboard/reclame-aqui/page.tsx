'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';
import { CardButton } from '@/components/ui/CardButton';

type Payload = Awaited<ReturnType<typeof api.support.myTickets>>;

function prettyDtPt(iso: string): string {
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

export default function ReclameAquiUserPage() {
  const { user } = useAuth();
  const isMember = user?.tier === 'MEMBER';

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createSending, setCreateSending] = useState(false);

  const [editing, setEditing] = useState<Payload['items'][number] | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isMember) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.support.myTickets();
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [isMember]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  if (!user) return null;
  if (!isMember) {
    return (
      <div className="mx-auto w-full max-w-[820px]">
        <h1 className="text-2xl font-semibold text-zinc-900">Reclame aqui</h1>
        <p className="mt-2 text-zinc-600">Aqui podes abrir um ticket (elogio/reclamação/bug). Se tens qualquer problema, queremos te ouvir.</p>
        <p className="mt-2 text-zinc-600">Essa funcionalidade é exclusiva para membros da Comunidade RPM.</p>
        <div className="mt-4 flex">
          <CardButton
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT))}
            variant="primary"
          >
            Tornar-se membro VIP
          </CardButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Reclame aqui</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Veja os teus tickets e acompanhe o status e a resposta do nosso time.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-zinc-600 text-center">
            Ainda não há tickets. Usa o card “Reclame aqui” no dashboard para abrir um.
          </p>
          <div className="mt-3 flex justify-center">
            <CardButton
              type="button"
              onClick={() => {
                setError('');
                setCreateMsg('');
                setCreating(true);
              }}
              variant="primary"
            >
              Novo ticket
            </CardButton>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {items.map((t) => (
              <div key={t.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-500">{prettyDtPt(t.createdAt)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(t.status)}`}
                      >
                        {statusLabel(t.status)}
                      </span>
                      {t.status === 'DONE' ? (
                        <span className="text-xs text-zinc-500">Finalizado</span>
                      ) : null}
                    </div>
                  </div>
                  {t.status !== 'DONE' ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(t);
                          setEditMsg(t.message);
                          setError('');
                        }}
                        className="cursor-pointer rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === t.id}
                        onClick={async () => {
                          const ok = window.confirm('Excluir este ticket? Esta ação não pode ser desfeita.');
                          if (!ok) return;
                          setDeletingId(t.id);
                          setError('');
                          try {
                            await api.support.deleteMyTicket(t.id);
                            await load();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Não foi possível excluir.');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        className="cursor-pointer rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === t.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Mensagem
                    </p>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{t.message}</div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Resposta do admin
                    </p>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                      {t.adminReply || '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-zinc-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Mensagem</th>
                  <th className="px-4 py-3">Resposta do admin</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((t) => (
                  <tr key={t.id} className="text-zinc-800">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                      {prettyDtPt(t.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(t.status)}`}
                      >
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="whitespace-pre-wrap text-zinc-800">{t.message}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="whitespace-pre-wrap text-zinc-700">{t.adminReply || '—'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {t.status !== 'DONE' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(t);
                              setEditMsg(t.message);
                              setError('');
                            }}
                            className="mr-2 cursor-pointer rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-200"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === t.id}
                            onClick={async () => {
                              const ok = window.confirm(
                                'Excluir este ticket? Esta ação não pode ser desfeita.',
                              );
                              if (!ok) return;
                              setDeletingId(t.id);
                              setError('');
                              try {
                                await api.support.deleteMyTicket(t.id);
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
                        </>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
                <h3 className="text-base font-semibold text-zinc-900">Editar ticket</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {statusLabel(editing.status)} · {prettyDtPt(editing.createdAt)}
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

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">Mensagem</label>
              <textarea
                value={editMsg}
                onChange={(e) => setEditMsg(e.target.value)}
                rows={8}
                disabled={saving}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
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
                    await api.support.updateMyTicket(editing.id, editMsg);
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

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !createSending && setCreating(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Novo ticket</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Escreve a tua mensagem (elogio, reclamação de parceiro ou bug do sistema).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreating(false)}
                disabled={createSending}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {error ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">Mensagem</label>
              <textarea
                value={createMsg}
                onChange={(e) => setCreateMsg(e.target.value)}
                rows={8}
                disabled={createSending}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                placeholder="Escreve aqui…"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreating(false)}
                disabled={createSending}
                className="cursor-pointer rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={createSending}
                onClick={async () => {
                  if (!createMsg.trim()) {
                    setError('Escreve a tua mensagem antes de enviar.');
                    return;
                  }
                  setCreateSending(true);
                  setError('');
                  try {
                    await api.support.createTicket(createMsg);
                    setCreating(false);
                    await load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
                  } finally {
                    setCreateSending(false);
                  }
                }}
                className="cursor-pointer rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {createSending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

