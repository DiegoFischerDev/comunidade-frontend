'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { NewSupportTicketModal } from '@/components/support-ticket';
import { DashboardFaqSection } from '@/components/dashboard/DashboardFaqSection';
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
  if (s === 'IN_REVIEW') return 'bg-brand-accent/10 text-brand-primary';
  if (s === 'DONE') return 'bg-emerald-50 text-emerald-800';
  return 'bg-primary-1 text-foreground';
}

/** Só edita se o ticket não estiver concluído e ainda não houver resposta da equipa. */
function canUserEditTicket(t: Payload['items'][number]): boolean {
  if (t.status === 'DONE') return false;
  return !((t.adminReply ?? '').trim().length > 0);
}

export default function ReclameAquiUserPage() {
  const { user } = useAuth();

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createSending, setCreateSending] = useState(false);
  const [createSent, setCreateSent] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestNameError, setGuestNameError] = useState('');
  const [guestWhatsappError, setGuestWhatsappError] = useState('');

  const [editing, setEditing] = useState<Payload['items'][number] | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const resetCreateForm = useCallback(() => {
    setCreateMsg('');
    setGuestName('');
    setGuestWhatsapp('');
    setGuestNameError('');
    setGuestWhatsappError('');
    setCreateSent(false);
  }, []);

  const handleCreateSend = useCallback(async () => {
    if (!user) {
      const name = guestName.trim();
      const wa = guestWhatsapp.replace(/\D/g, '');
      let hasError = false;
      if (!name) {
        setGuestNameError('Informe o seu nome.');
        hasError = true;
      } else {
        setGuestNameError('');
      }
      if (wa.length < 8) {
        setGuestWhatsappError('Informe um WhatsApp válido.');
        hasError = true;
      } else {
        setGuestWhatsappError('');
      }
      if (!createMsg.trim()) {
        setError('Escreve a tua mensagem antes de enviar.');
        hasError = true;
      }
      if (hasError) return;

      setCreateSending(true);
      setError('');
      try {
        await api.support.createGuestTicket({
          name,
          whatsapp: guestWhatsapp,
          message: createMsg.trim(),
        });
        setCreateSent(true);
        setCreateMsg('');
        setGuestName('');
        setGuestWhatsapp('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
      } finally {
        setCreateSending(false);
      }
      return;
    }

    if (!createMsg.trim()) {
      setError('Escreve a tua mensagem antes de enviar.');
      return;
    }
    setCreateSending(true);
    setError('');
    try {
      await api.support.createTicket(createMsg);
      setCreateMsg('');
      setCreating(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar.');
    } finally {
      setCreateSending(false);
    }
  }, [user, guestName, guestWhatsapp, createMsg, load, resetCreateForm]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[820px]">
        {error ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <DashboardFaqSection className="pt-2 pb-6 md:pt-4 md:pb-8" />

        <div className="mt-4 text-center md:mt-6">
          <h1 className="text-2xl font-semibold text-foreground">Reclame aqui</h1>
          <p className="mt-2 text-sm text-muted">
            Queremos ouvir-te e resolver o teu problema. Podes abrir um pedido sem criar conta — indica
            o teu nome e WhatsApp para te contactarmos.
          </p>
        </div>

        <div className="mt-6 flex justify-center pb-12 md:mt-8 md:pb-16">
          <CardButton
            type="button"
            onClick={() => {
              setError('');
              resetCreateForm();
              setCreating(true);
            }}
            variant="primary"
          >
            Abrir pedido
          </CardButton>
        </div>

        <NewSupportTicketModal
          open={creating}
          onClose={() => {
            if (createSending) return;
            setCreating(false);
            setError('');
            resetCreateForm();
          }}
          message={createMsg}
          onMessageChange={setCreateMsg}
          onSend={handleCreateSend}
          sending={createSending}
          sent={createSent}
          error={error}
          collectGuestContact
          guestName={guestName}
          guestWhatsapp={guestWhatsapp}
          onGuestNameChange={(v) => {
            setGuestName(v);
            setGuestNameError('');
          }}
          onGuestWhatsappChange={(v) => {
            setGuestWhatsapp(v);
            setGuestWhatsappError('');
          }}
          guestNameError={guestNameError}
          guestWhatsappError={guestWhatsappError}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-12 md:pb-16">
      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <DashboardFaqSection className="pt-2 pb-6 md:pt-4 md:pb-8" />

      <div className="mt-4 text-center md:mt-6">
        <h1 className="text-2xl font-semibold text-foreground">Reclame aqui</h1>
        <p className="mt-2 text-sm text-muted">
          Queremos te ouvir e resolver o seu problema. Encontrou algum bug, teve uma experiência ruim ou
          quer compartilhar um elogio? Conta pra gente — estamos aqui pra ajudar.
        </p>
      </div>

      <div className="mt-6 flex justify-center md:mt-8">
        <CardButton
          type="button"
          onClick={() => {
            setError('');
            setCreateMsg('');
            setCreating(true);
          }}
          variant="primary"
        >
          Reclame aqui
        </CardButton>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">Carregando…</p>
      ) : (
        <>
          {items.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted">
              Ainda não enviaste nenhum pedido. Usa o botão acima para o primeiro.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-3 md:hidden">
                {items.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted">{prettyDtPt(t.createdAt)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(t.status)}`}
                          >
                            {statusLabel(t.status)}
                          </span>
                          {t.status === 'DONE' ? (
                            <span className="text-xs text-muted">Finalizado</span>
                          ) : null}
                        </div>
                      </div>
                      {t.status !== 'DONE' ? (
                        <div className="flex shrink-0 items-center gap-2">
                          {canUserEditTicket(t) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(t);
                                setEditMsg(t.message);
                                setError('');
                              }}
                              className="cursor-pointer rounded-full bg-primary-1 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-zinc-200"
                            >
                              Editar
                            </button>
                          ) : null}
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
                                setError(
                                  e instanceof Error ? e.message : 'Não foi possível excluir.',
                                );
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
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Mensagem
                        </p>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">{t.message}</div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Resposta do admin
                        </p>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                          {t.adminReply || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-page text-xs font-semibold uppercase tracking-wide text-muted">
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
                      <tr key={t.id} className="text-foreground">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
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
                          <div className="whitespace-pre-wrap text-foreground">{t.message}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="whitespace-pre-wrap text-foreground/90">{t.adminReply || '—'}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {t.status === 'DONE' ? (
                            <span className="text-xs text-muted">—</span>
                          ) : (
                            <>
                              {canUserEditTicket(t) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(t);
                                    setEditMsg(t.message);
                                    setError('');
                                  }}
                                  className="mr-2 cursor-pointer rounded bg-primary-1 px-3 py-1 text-xs font-medium text-foreground hover:bg-zinc-200"
                                >
                                  Editar
                                </button>
                              ) : null}
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
                                    setError(
                                      e instanceof Error ? e.message : 'Não foi possível excluir.',
                                    );
                                  } finally {
                                    setDeletingId(null);
                                  }
                                }}
                                className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                {deletingId === t.id ? 'Excluindo…' : 'Excluir'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center brand-modal-scrim p-4"
          role="presentation"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Editar ticket</h3>
                <p className="mt-1 text-sm text-muted">
                  {statusLabel(editing.status)} · {prettyDtPt(editing.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted hover:bg-page disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground/90">Mensagem</label>
              <textarea
                value={editMsg}
                onChange={(e) => setEditMsg(e.target.value)}
                rows={8}
                disabled={saving}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 disabled:opacity-60"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="cursor-pointer rounded bg-primary-1 px-3 py-2 text-sm font-medium text-foreground hover:bg-zinc-200 disabled:opacity-50"
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
                className="cursor-pointer rounded bg-brand-accent/10 px-3 py-2 text-sm font-medium text-brand-primary hover:bg-page disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NewSupportTicketModal
        open={creating}
        onClose={() => {
          if (createSending) return;
          setCreating(false);
          setError('');
          setCreateMsg('');
        }}
        message={createMsg}
        onMessageChange={setCreateMsg}
        onSend={handleCreateSend}
        sending={createSending}
        sent={false}
        error={error}
      />
    </div>
  );
}
