'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type GroupsPayload = Awaited<ReturnType<typeof api.admin.whatsappScan.listGroups>>;
type GroupRow = GroupsPayload['items'][number];
type MessagesPayload = Awaited<ReturnType<typeof api.admin.whatsappScan.listMessages>>;
type MessageRow = MessagesPayload['items'][number];

type RelocationPartner = { id: string; name: string };

function parseNumbers(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((s) => s.replace(/\D+/g, ''))
        .filter((s) => s.length > 0),
    ),
  );
}

function formatDtPt(iso: string): string {
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

function statusLabel(status: MessageRow['status']): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'created':
      return {
        label: 'Imóvel criado',
        className: 'bg-emerald-50 text-emerald-800',
      };
    case 'ignored_not_listing':
      return { label: 'Não é anúncio', className: 'bg-zinc-100 text-zinc-700' };
    case 'ignored_sender':
      return { label: 'Número ignorado', className: 'bg-zinc-100 text-zinc-700' };
    case 'error':
      return { label: 'Erro', className: 'bg-red-50 text-red-700' };
    default:
      return { label: 'Recebida', className: 'bg-amber-50 text-amber-800' };
  }
}

export default function AdminWhatsappScanPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [partners, setPartners] = useState<RelocationPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // formulário de criação
  const [formPartnerId, setFormPartnerId] = useState('');
  const [formGroupJid, setFormGroupJid] = useState('');
  const [formNumbers, setFormNumbers] = useState('');
  const [creating, setCreating] = useState(false);

  // edição
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const [editPartnerId, setEditPartnerId] = useState('');
  const [editGroupJid, setEditGroupJid] = useState('');
  const [editNumbers, setEditNumbers] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // logs (modal por grupo)
  const [logsGroup, setLogsGroup] = useState<GroupRow | null>(null);
  const [logs, setLogs] = useState<MessageRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // atividade recente (logs de todos os grupos, na própria página)
  const [activity, setActivity] = useState<MessageRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityGroupFilter, setActivityGroupFilter] = useState('');
  const [activityStatusFilter, setActivityStatusFilter] = useState('');

  const loadActivity = useCallback(async () => {
    if (!canSee) return;
    setActivityLoading(true);
    try {
      const res = await api.admin.whatsappScan.listMessages(
        activityGroupFilter || undefined,
      );
      setActivity(res.items);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, [canSee, activityGroupFilter]);

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const [groupsRes, partnersRes] = await Promise.all([
        api.admin.whatsappScan.listGroups(),
        api.admin.partners.list(),
      ]);
      setGroups(groupsRes.items);
      setPartners(
        partnersRes
          .filter((p) => p.categorySlug === 'relocation')
          .map((p) => ({ id: p.id, name: p.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT')),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const visibleActivity = useMemo(
    () =>
      activity.filter(
        (m) => !activityStatusFilter || m.status === activityStatusFilter,
      ),
    [activity, activityStatusFilter],
  );

  const handleCreate = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!formPartnerId) {
      setError('Escolhe o parceiro relocation.');
      return;
    }
    if (!/@g\.us$/i.test(formGroupJid.trim())) {
      setError('JID do grupo inválido (deve terminar em @g.us).');
      return;
    }
    setCreating(true);
    try {
      await api.admin.whatsappScan.createGroup({
        partnerId: formPartnerId,
        groupJid: formGroupJid.trim(),
        monitoredNumbers: parseNumbers(formNumbers),
      });
      setFormPartnerId('');
      setFormGroupJid('');
      setFormNumbers('');
      setSuccess('Grupo adicionado ao monitoramento.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar grupo.');
    } finally {
      setCreating(false);
    }
  }, [formPartnerId, formGroupJid, formNumbers, load]);

  const openEdit = useCallback((row: GroupRow) => {
    setEditing(row);
    setEditPartnerId(row.partnerId);
    setEditGroupJid(row.groupJid);
    setEditNumbers(row.monitoredNumbers.join(', '));
    setEditActive(row.active);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setSavingEdit(true);
    setError('');
    try {
      await api.admin.whatsappScan.updateGroup(editing.id, {
        partnerId: editPartnerId || undefined,
        groupJid: editGroupJid.trim() || undefined,
        monitoredNumbers: parseNumbers(editNumbers),
        active: editActive,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSavingEdit(false);
    }
  }, [editing, editPartnerId, editGroupJid, editNumbers, editActive, load]);

  const deleteGroup = useCallback(
    async (id: string) => {
      if (!window.confirm('Remover este grupo do monitoramento?')) return;
      setDeletingId(id);
      setError('');
      try {
        await api.admin.whatsappScan.deleteGroup(id);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao remover.');
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

  const openLogs = useCallback(async (row: GroupRow) => {
    setLogsGroup(row);
    setLogsLoading(true);
    setLogs([]);
    try {
      const res = await api.admin.whatsappScan.listMessages(row.id);
      setLogs(res.items);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const partnersById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of partners) m.set(p.id, p.name);
    return m;
  }, [partners]);

  if (!user) return null;
  if (!canSee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Whatsapp scan</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Whatsapp scan</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Monitoriza grupos de WhatsApp e usa IA para identificar anúncios de imóveis. Cada
            anúncio detetado cria um imóvel <strong>rascunho (oculto)</strong> atribuído ao parceiro
            relocation escolhido, para revisão e publicação manual.
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
      {success ? (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {/* Formulário de criação */}
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Adicionar grupo monitorizado</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Parceiro (relocation)
            </span>
            <select
              value={formPartnerId}
              onChange={(e) => setFormPartnerId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Seleciona…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
              JID do grupo
            </span>
            <input
              value={formGroupJid}
              onChange={(e) => setFormGroupJid(e.target.value)}
              placeholder="120363XXXXXXXXXX@g.us"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Números monitorizados (opcional)
            </span>
            <textarea
              value={formNumbers}
              onChange={(e) => setFormNumbers(e.target.value)}
              rows={2}
              placeholder="Ex.: 351912345678, 351999888777 — vazio = monitoriza todos"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Separa por vírgula, espaço ou linha. Apenas dígitos (com indicativo do país). Vazio =
              monitoriza todas as mensagens do grupo.
            </span>
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
          >
            {creating ? 'Adicionando…' : 'Adicionar grupo'}
          </button>
        </div>
      </div>

      {/* Lista de grupos */}
      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      ) : groups.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">Nenhum grupo monitorizado ainda.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Parceiro</th>
                <th className="px-4 py-3">Grupo (JID)</th>
                <th className="px-4 py-3">Números</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Mensagens</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {groups.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-3 text-zinc-800">
                    {row.partner?.name ?? partnersById.get(row.partnerId) ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{row.groupJid}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.monitoredNumbers.length === 0 ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        Todos
                      </span>
                    ) : (
                      <span className="text-xs">{row.monitoredNumbers.join(', ')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.active ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                        Ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{row.messagesCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void openLogs(row)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      Mensagens
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="ml-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteGroup(row.id)}
                      disabled={deletingId === row.id}
                      className="ml-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === row.id ? 'Removendo…' : 'Remover'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Atividade recente (logs) */}
      <div className="mt-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Atividade recente</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Últimas mensagens capturadas nos grupos monitorizados e o resultado do processamento
              pela IA.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activityGroupFilter}
              onChange={(e) => setActivityGroupFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Todos os grupos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.partner?.name ?? g.groupJid}
                </option>
              ))}
            </select>
            <select
              value={activityStatusFilter}
              onChange={(e) => setActivityStatusFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="created">Imóvel criado</option>
              <option value="ignored_not_listing">Não é anúncio</option>
              <option value="ignored_sender">Número ignorado</option>
              <option value="error">Erro</option>
              <option value="received">Recebida</option>
            </select>
            <button
              type="button"
              onClick={() => void loadActivity()}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-3">
          {activityLoading ? (
            <p className="text-sm text-zinc-600">Carregando…</p>
          ) : visibleActivity.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600">
              Nenhuma mensagem processada ainda. As mensagens aparecem aqui assim que chegarem nos
              grupos monitorizados.
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleActivity.map((m) => {
                const s = statusLabel(m.status);
                return (
                  <li key={m.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${s.className}`}>
                        {s.label}
                      </span>
                      {m.group?.partner?.name ? (
                        <span className="font-medium text-zinc-700">
                          {m.group.partner.name}
                        </span>
                      ) : null}
                      <span>+{m.senderNumber}</span>
                      <span>·</span>
                      <span>{formatDtPt(m.createdAt)}</span>
                      {m.createdHouseId ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                          imóvel #{m.createdHouseId.slice(-6)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{m.rawText}</p>
                    {m.error ? <p className="mt-1 text-xs text-red-600">{m.error}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Modal edição */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-zinc-900">Editar grupo</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Parceiro (relocation)
                </span>
                <select
                  value={editPartnerId}
                  onChange={(e) => setEditPartnerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  JID do grupo
                </span>
                <input
                  value={editGroupJid}
                  onChange={(e) => setEditGroupJid(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Números monitorizados
                </span>
                <textarea
                  value={editNumbers}
                  onChange={(e) => setEditNumbers(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-xs text-zinc-500">Vazio = monitoriza todos.</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                />
                Ativo
              </label>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={savingEdit}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {savingEdit ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal logs/mensagens */}
      {logsGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Mensagens processadas</h2>
                <p className="mt-1 font-mono text-xs text-zinc-500">{logsGroup.groupJid}</p>
              </div>
              <button
                type="button"
                onClick={() => setLogsGroup(null)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              {logsLoading ? (
                <p className="text-sm text-zinc-600">Carregando…</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-zinc-600">Nenhuma mensagem processada ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {logs.map((m) => {
                    const s = statusLabel(m.status);
                    return (
                      <li key={m.id} className="rounded-xl border border-zinc-200 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${s.className}`}
                          >
                            {s.label}
                          </span>
                          <span>+{m.senderNumber}</span>
                          <span>·</span>
                          <span>{formatDtPt(m.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">
                          {m.rawText}
                        </p>
                        {m.error ? (
                          <p className="mt-1 text-xs text-red-600">{m.error}</p>
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
    </div>
  );
}
