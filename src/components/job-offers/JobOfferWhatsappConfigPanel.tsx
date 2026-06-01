'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { EvolutionGroupSelect } from '@/components/whatsapp-scan/EvolutionGroupSelect';
import { MonitoredUsersCell } from '@/components/whatsapp-scan/MonitoredUsersCell';
import { WhatsappScanNumbersInput } from '@/components/whatsapp-scan/WhatsappScanNumbersInput';
import { api } from '@/lib/api';

type RouteRow = Awaited<
  ReturnType<typeof api.admin.jobOffers.whatsapp.listRoutes>
>['items'][number];

type MessageRow = {
  id: string;
  routeId: string | null;
  routeLabel: string | null;
  senderNumber: string;
  rawText: string;
  status: string;
  createdJobOfferId: string | null;
  error: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  received: 'Recebida',
  ignored_sender: 'Remetente ignorado',
  ignored_not_offer: 'Não é oferta',
  ignored_no_contact: 'Sem contacto (tel./email)',
  created: 'Publicada',
  error: 'Erro',
};

export function JobOfferWhatsappConfigPanel() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formSourceJid, setFormSourceJid] = useState('');
  const [formSourceTitle, setFormSourceTitle] = useState('');
  const [formDestJid, setFormDestJid] = useState('');
  const [formDestTitle, setFormDestTitle] = useState('');
  const [formNumbers, setFormNumbers] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [routesRes, msgs] = await Promise.all([
        api.admin.jobOffers.whatsapp.listRoutes(),
        api.admin.jobOffers.whatsapp.listMessages(40),
      ]);
      setRoutes(routesRes.items);
      setMessages(msgs.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configuração.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRoutesCount = useMemo(
    () => routes.filter((r) => r.active).length,
    [routes],
  );

  const handleCreate = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!formSourceJid.trim()) {
      setError('Seleciona o grupo ou canal de origem.');
      return;
    }
    if (!formDestJid.trim()) {
      setError('Seleciona o grupo ou canal de destino.');
      return;
    }
    setCreating(true);
    try {
      await api.admin.jobOffers.whatsapp.createRoute({
        sourceGroupJid: formSourceJid.trim(),
        sourceTitle: formSourceTitle.trim() || undefined,
        destGroupJid: formDestJid.trim(),
        destTitle: formDestTitle.trim() || undefined,
        monitoredNumbers: formNumbers,
      });
      setFormSourceJid('');
      setFormSourceTitle('');
      setFormDestJid('');
      setFormDestTitle('');
      setFormNumbers([]);
      setSuccess('Rota adicionada.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar rota.');
    } finally {
      setCreating(false);
    }
  }, [
    formSourceJid,
    formSourceTitle,
    formDestJid,
    formDestTitle,
    formNumbers,
    load,
  ]);

  const deleteRoute = useCallback(
    async (id: string) => {
      if (!window.confirm('Remover esta configuração origem → destino?')) return;
      setDeletingId(id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.deleteRoute(id);
        setSuccess('Rota removida.');
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao remover.');
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

  const toggleActive = useCallback(
    async (row: RouteRow) => {
      setTogglingId(row.id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.updateRoute(row.id, {
          active: !row.active,
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao atualizar estado.');
      } finally {
        setTogglingId(null);
      }
    },
    [load],
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Configuração WhatsApp
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
            Define vários pares origem → destino. Mensagens nos grupos de origem
            ativos são analisadas com IA; vagas entram nesta página e são
            republicadas no respetivo grupo de destino.
          </p>
          {!loading && routes.length > 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              {activeRoutesCount === routes.length
                ? `${routes.length} rota(s) ativa(s)`
                : `${activeRoutesCount} de ${routes.length} rota(s) ativa(s)`}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Atualizar
        </button>
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

      <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Adicionar rota
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
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
          <label className="text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Grupo ou canal (destino)
            </span>
            <EvolutionGroupSelect
              valueJid={formDestJid}
              disabled={creating}
              listGroups={() => api.admin.jobOffers.whatsapp.listEvolutionGroups()}
              onChange={(g) => {
                setFormDestJid(g.groupJid);
                setFormDestTitle(g.title);
              }}
            />
          </label>
          <div className="text-sm sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Números monitorizados (opcional)
            </span>
            <WhatsappScanNumbersInput
              value={formNumbers}
              onChange={setFormNumbers}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Lista vazia = todas as mensagens do grupo de origem desta rota.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {creating ? 'A adicionar…' : 'Adicionar rota'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">A carregar…</p>
      ) : routes.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          Ainda não há rotas configuradas. Adiciona um par origem → destino acima.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Números</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {routes.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-3 text-zinc-800">
                    {row.sourceTitle ?? (
                      <span className="font-mono text-xs text-zinc-500">
                        {row.sourceGroupJid.replace(/@(g\.us|newsletter)$/i, '')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">
                    {row.destTitle ?? (
                      <span className="font-mono text-xs text-zinc-500">
                        {row.destGroupJid.replace(/@(g\.us|newsletter)$/i, '')}
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
                      disabled={togglingId === row.id}
                      onClick={() => void toggleActive(row)}
                      className={
                        row.active
                          ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60'
                          : 'rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60'
                      }
                    >
                      {togglingId === row.id
                        ? '…'
                        : row.active
                          ? 'Ativa'
                          : 'Inativa'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteRoute(row.id)}
                      disabled={deletingId === row.id}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === row.id ? 'A remover…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {messages.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Últimas mensagens processadas
          </h3>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">
            {messages.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
              >
                <span className="font-medium text-zinc-800">
                  {STATUS_LABELS[m.status] ?? m.status}
                </span>
                {m.routeLabel ? (
                  <span className="ml-2 text-zinc-500">· {m.routeLabel}</span>
                ) : null}
                {m.createdJobOfferId ? (
                  <span className="ml-2 text-emerald-700">· oferta criada</span>
                ) : null}
                <p className="mt-1 line-clamp-2 text-zinc-600">{m.rawText}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
