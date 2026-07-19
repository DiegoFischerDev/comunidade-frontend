'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EvolutionGroupSelect } from '@/components/whatsapp-scan/EvolutionGroupSelect';
import { MonitoredUsersCell } from '@/components/whatsapp-scan/MonitoredUsersCell';
import { WhatsappScanNumbersInput } from '@/components/whatsapp-scan/WhatsappScanNumbersInput';
import { api } from '@/lib/api';
import { jobOfferWhatsappStatusLabel } from '@/lib/job-offer-whatsapp-message-status';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';

type ScanRow = Awaited<
  ReturnType<typeof api.admin.jobOffers.whatsapp.listScans>
>['items'][number];

type MessageLogRow = Awaited<
  ReturnType<typeof api.admin.jobOffers.whatsapp.listMessages>
>['items'][number];

type DestinationRow = Awaited<
  ReturnType<typeof api.admin.jobOffers.whatsapp.listDestinations>
>['items'][number];

function formatDtPt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function JobOfferWhatsappConfigPanel() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingDest, setCreatingDest] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingDestId, setDeletingDestId] = useState<string | null>(null);
  const [togglingScanId, setTogglingScanId] = useState<string | null>(null);
  const [togglingDestId, setTogglingDestId] = useState<string | null>(null);
  const [logsScan, setLogsScan] = useState<ScanRow | null>(null);
  const [logsAll, setLogsAll] = useState(false);
  const [logs, setLogs] = useState<MessageLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formSourceJid, setFormSourceJid] = useState('');
  const [formSourceTitle, setFormSourceTitle] = useState('');
  const [formNumbers, setFormNumbers] = useState<string[]>([]);

  const [formDestJid, setFormDestJid] = useState('');
  const [formDestTitle, setFormDestTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [scansRes, destRes] = await Promise.all([
        api.admin.jobOffers.whatsapp.listScans(),
        api.admin.jobOffers.whatsapp.listDestinations(),
      ]);
      setScans(scansRes.items);
      setDestinations(destRes.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configuração.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeScansCount = useMemo(
    () => scans.filter((s) => s.active).length,
    [scans],
  );

  const activeDestCount = useMemo(
    () => destinations.filter((d) => d.active).length,
    [destinations],
  );

  const handleCreateScan = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!formSourceJid.trim()) {
      setError('Seleciona o grupo ou canal a monitorizar.');
      return;
    }
    setCreating(true);
    try {
      await api.admin.jobOffers.whatsapp.createScan({
        sourceGroupJid: formSourceJid.trim(),
        sourceTitle: formSourceTitle.trim() || undefined,
        monitoredNumbers: formNumbers,
      });
      setFormSourceJid('');
      setFormSourceTitle('');
      setFormNumbers([]);
      setSuccess('Grupo de scan adicionado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar grupo.');
    } finally {
      setCreating(false);
    }
  }, [formSourceJid, formSourceTitle, formNumbers, load]);

  const handleCreateDestination = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!formDestJid.trim()) {
      setError('Seleciona o grupo de destino.');
      return;
    }
    setCreatingDest(true);
    try {
      await api.admin.jobOffers.whatsapp.createDestination({
        destGroupJid: formDestJid.trim(),
        destTitle: formDestTitle.trim() || undefined,
      });
      setFormDestJid('');
      setFormDestTitle('');
      setSuccess('Grupo de destino adicionado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar destino.');
    } finally {
      setCreatingDest(false);
    }
  }, [formDestJid, formDestTitle, load]);

  const deleteScan = useCallback(
    async (id: string) => {
      if (!window.confirm('Remover este grupo de scan?')) return;
      setDeletingId(id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.deleteScan(id);
        setSuccess('Grupo de scan removido.');
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao remover.');
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

  const deleteDestination = useCallback(
    async (id: string) => {
      if (!window.confirm('Remover este grupo de destino?')) return;
      setDeletingDestId(id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.deleteDestination(id);
        setSuccess('Grupo de destino removido.');
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao remover destino.');
      } finally {
        setDeletingDestId(null);
      }
    },
    [load],
  );

  const toggleScanActive = useCallback(
    async (row: ScanRow) => {
      setTogglingScanId(row.id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.updateScan(row.id, {
          active: !row.active,
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao atualizar estado.');
      } finally {
        setTogglingScanId(null);
      }
    },
    [load],
  );

  const toggleDestActive = useCallback(
    async (row: DestinationRow) => {
      setTogglingDestId(row.id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.updateDestination(row.id, {
          active: !row.active,
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao atualizar destino.');
      } finally {
        setTogglingDestId(null);
      }
    },
    [load],
  );

  const openLogs = useCallback(async (scan: ScanRow | null, all = false) => {
    setLogsScan(scan);
    setLogsAll(all);
    setLogsLoading(true);
    setLogs([]);
    try {
      const res = await api.admin.jobOffers.whatsapp.listMessages(
        100,
        all ? undefined : scan?.id,
      );
      setLogs(res.items);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Erro ao carregar logs de mensagens.',
      );
    } finally {
      setLogsLoading(false);
    }
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Configuração WhatsApp
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Adiciona grupos de origem para scan e um ou mais grupos de destino.
            Todas as vagas válidas entram no site e são republicadas em{' '}
            <strong className="font-medium">todos</strong> os destinos ativos.
            Usa <strong className="font-medium">Logs</strong> para ver o que a
            OpenAI extraiu e o motivo de rejeição.
          </p>
          {!loading && scans.length > 0 ? (
            <p className="mt-2 text-xs text-muted">
              {activeScansCount === scans.length
                ? `${scans.length} grupo(s) de scan ativo(s)`
                : `${activeScansCount} de ${scans.length} grupo(s) de scan ativo(s)`}
              {destinations.length > 0
                ? ` · ${activeDestCount} de ${destinations.length} destino(s) ativo(s)`
                : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void openLogs(null, true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/90 hover:bg-page"
          >
            Logs (todos)
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/90 hover:bg-page disabled:opacity-60"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-dashed border-border bg-page/50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Adicionar grupo de destino
        </h3>
        <p className="mt-1 text-xs text-muted">
          Todas as ofertas rastreadas são enviadas a todos os destinos ativos.
        </p>
        <div className="mt-3">
          <label className="text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Grupo WhatsApp
            </span>
            <div className="mt-1">
              <EvolutionGroupSelect
                valueJid={formDestJid}
                disabled={creatingDest}
                listGroups={() =>
                  api.admin.jobOffers.whatsapp.listEvolutionGroups()
                }
                onChange={(g) => {
                  setFormDestJid(g.groupJid);
                  setFormDestTitle(g.title);
                }}
              />
            </div>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateDestination()}
          disabled={creatingDest}
          className="mt-3 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-60"
        >
          {creatingDest ? 'A adicionar…' : 'Adicionar destino'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">A carregar destinos…</p>
      ) : destinations.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Ainda não há grupos de destino. Adiciona um acima.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Grupo de destino</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-card">
              {destinations.map((row) => (
                <tr key={row.id} className="hover:bg-page/60">
                  <td className="px-4 py-3 text-foreground">
                    {row.destTitle ?? (
                      <span className="font-mono text-xs text-muted">
                        {row.destGroupJid.replace(/@g\.us$/i, '')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={togglingDestId === row.id}
                      onClick={() => void toggleDestActive(row)}
                      className={
                        row.active
                          ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60'
                          : 'rounded-full bg-primary-1 px-2 py-1 text-xs font-semibold text-foreground/90 hover:bg-zinc-200 disabled:opacity-60'
                      }
                    >
                      {togglingDestId === row.id
                        ? '…'
                        : row.active
                          ? 'Ativo'
                          : 'Inativo'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteDestination(row.id)}
                      disabled={deletingDestId === row.id}
                      className="rounded-lg border border-red-200 bg-card px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingDestId === row.id ? 'A remover…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-dashed border-border bg-page/50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Adicionar grupo de scan
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Grupo ou canal (origem)
            </span>
            <EvolutionGroupSelect
              valueJid={formSourceJid}
              disabled={creating}
              listGroups={() => api.admin.jobOffers.whatsapp.listEvolutionGroups()}
              onChange={(g) => {
                setFormSourceJid(g.groupJid);
                setFormSourceTitle(g.title);
              }}
            />
          </label>
          <div className="text-sm sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Números monitorizados (opcional)
            </span>
            <WhatsappScanNumbersInput
              value={formNumbers}
              onChange={setFormNumbers}
            />
            <span className="mt-1 block text-xs text-muted">
              Lista vazia = todas as mensagens deste grupo.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateScan()}
          disabled={creating}
          className="mt-3 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-dark disabled:opacity-60"
        >
          {creating ? 'A adicionar…' : 'Adicionar grupo de scan'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">A carregar grupos de scan…</p>
      ) : scans.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Ainda não há grupos de scan. Adiciona um grupo de origem acima.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Grupo de scan</th>
                <th className="px-4 py-3">Números</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-card">
              {scans.map((row) => (
                <tr key={row.id} className="hover:bg-page/60">
                  <td className="px-4 py-3 text-foreground">
                    {row.sourceTitle ?? (
                      <span className="font-mono text-xs text-muted">
                        {row.sourceGroupJid.replace(/@g\.us$/i, '')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <MonitoredUsersCell
                      numbers={row.monitoredNumbers}
                      monitorAllMembers={row.monitorAllMembers}
                      contactNames={{}}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={togglingScanId === row.id}
                      onClick={() => void toggleScanActive(row)}
                      className={
                        row.active
                          ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60'
                          : 'rounded-full bg-primary-1 px-2 py-1 text-xs font-semibold text-foreground/90 hover:bg-zinc-200 disabled:opacity-60'
                      }
                    >
                      {togglingScanId === row.id
                        ? '…'
                        : row.active
                          ? 'Ativo'
                          : 'Inativo'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void openLogs(row)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground/90 hover:bg-page"
                      >
                        Logs
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteScan(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded-lg border border-red-200 bg-card px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === row.id ? 'A remover…' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logsScan !== null || logsAll ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center brand-modal-scrim p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Logs de processamento
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {logsAll
                    ? 'Todas as mensagens dos grupos de scan'
                    : (logsScan?.sourceTitle ?? logsScan?.sourceGroupJid)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLogsScan(null);
                  setLogsAll(false);
                  setLogs([]);
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground/90 hover:bg-page"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              {logsLoading ? (
                <p className="text-sm text-muted">A carregar…</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhum registo. Se enviaste uma imagem e não aparece aqui, a
                  mensagem pode não ter chegado ao backend (grupo não está em
                  scan, remetente filtrado, ou webhook sem imagem).
                </p>
              ) : (
                <ul className="space-y-3">
                  {logs.map((m) => {
                    const s = jobOfferWhatsappStatusLabel(m.status);
                    const parsed =
                      m.parsedJson != null
                        ? JSON.stringify(m.parsedJson, null, 2)
                        : null;
                    const logImageSrc = resolveUploadsUrl(m.imageUrl);
                    return (
                      <li
                        key={m.id}
                        className="rounded-xl border border-border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${s.className}`}
                          >
                            {s.label}
                          </span>
                          <span>+{m.senderNumber}</span>
                          <span>·</span>
                          <span>{formatDtPt(m.createdAt)}</span>
                          {m.createdJobOfferId ? (
                            <>
                              <span>·</span>
                              <span className="text-emerald-700">
                                oferta criada
                              </span>
                            </>
                          ) : null}
                        </div>
                        {logImageSrc ? (
                          <div className="relative mt-3 aspect-[4/3] max-h-64 w-full overflow-hidden rounded-lg border border-border bg-primary-1">
                            <Image
                              src={logImageSrc}
                              alt="Imagem analisada"
                              fill
                              className="object-contain object-top"
                              sizes="400px"
                              unoptimized
                            />
                          </div>
                        ) : null}
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                          {m.rawText || '—'}
                        </p>
                        {m.error ? (
                          <p className="mt-1 text-xs text-red-600">{m.error}</p>
                        ) : null}
                        {parsed ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-semibold text-brand-primary">
                              Resposta OpenAI (JSON)
                            </summary>
                            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-page p-2 text-[11px] leading-relaxed text-foreground">
                              {parsed}
                            </pre>
                          </details>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
