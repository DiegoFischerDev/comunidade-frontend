'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type Payload = Awaited<ReturnType<typeof api.admin.leadsGestoras.list>>;
type LeadRow = Payload['items'][number];

function formatLeadPublicId(publicId: number | null | undefined): string {
  if (!publicId || Number.isNaN(Number(publicId))) return '—';
  return String(publicId).padStart(6, '0');
}

function digitsOnly(value: string): string {
  return (value || '').replace(/\D+/g, '');
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

function previewOneLine(text: string | null, max = 90): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '—';
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'inviavel':
      return 'Inviável';
    case 'pre_aprovado':
      return 'Pré-aprovado';
    case 'credito_aprovado':
      return 'Crédito aprovado';
    case 'agendado_escritura':
      return 'Agendado escritura';
    case 'escritura_realizada':
      return 'Escritura realizada';
    default:
      return '—';
  }
}

export default function AdminLeadsGestorasPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editStatus, setEditStatus] = useState<string>('');

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.leadsGestoras.list();
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((l) => {
      if (statusFilter !== 'all' && (l.status ?? '') !== statusFilter) {
        return false;
      }
      const hay = [
        l.id,
        l.name,
        l.email,
        l.whatsapp,
        l.partner?.name ?? '',
        l.comment ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return !q || hay.includes(q);
    });
  }, [items, query, statusFilter]);

  const openEdit = useCallback((row: LeadRow) => {
    setEditing(row);
    setEditName(row.name ?? '');
    setEditEmail(row.email ?? '');
    setEditWhatsapp(row.whatsapp ?? '');
    setEditComment(row.comment ?? '');
    setEditStatus(row.status ?? '');
  }, []);

  const closeEdit = useCallback(() => {
    setEditing(null);
    setSaving(false);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await api.admin.leadsGestoras.update(editing.id, {
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        whatsapp: digitsOnly(editWhatsapp) || undefined,
        comment: editComment.trim() ? editComment : null,
        status: editStatus || null,
      });
      await load();
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }, [editing, editName, editEmail, editWhatsapp, editComment, editStatus, load, closeEdit]);

  const deleteLead = useCallback(
    async (id: string) => {
      const ok = window.confirm('Tem a certeza que quer excluir este lead?');
      if (!ok) return;
      setDeletingId(id);
      setError('');
      try {
        await api.admin.leadsGestoras.delete(id);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao excluir.');
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

  if (!user) return null;
  if (!canSee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Leads gestoras</h1>
        <p className="mt-2 text-sm text-muted">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads gestoras</h1>
          <p className="mt-2 text-sm text-muted">
            Todos os leads do financiamento (atribuídos às gestoras/parceiros).
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 sm:w-56"
          >
            <option value="all">Todos os status</option>
            <option value="inviavel">Inviável</option>
            <option value="pre_aprovado">Pré-aprovado</option>
            <option value="credito_aprovado">Crédito aprovado</option>
            <option value="agendado_escritura">Agendado escritura</option>
            <option value="escritura_realizada">Escritura realizada</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, WhatsApp, email…"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 sm:w-80"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-page"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nenhum lead encontrado.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Gestora</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Resumo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-page/60">
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/90">
                    {formatDtPt(row.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{row.name}</div>
                    <div className="text-xs text-muted">
                      {row.email} · +{digitsOnly(row.whatsapp)}
                    </div>
                    <div className="text-[11px] text-muted/80">
                      ID: {formatLeadPublicId(row.publicId)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {row.partner?.name ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/90">
                    {statusLabel(row.status)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground/90">
                    {row.docsSentAt ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                        ✓ enviados ({row.submissionsCount})
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary-1 px-2 py-1 text-xs font-semibold text-foreground/90">
                        a aguardar
                      </span>
                    )}
                  </td>
                  <td className="max-w-[380px] px-4 py-3 text-foreground/90">
                    {previewOneLine(row.comment)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-page"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteLead(row.id)}
                      disabled={deletingId === row.id}
                      className="ml-2 rounded-lg border border-red-200 bg-card px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === row.id ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center brand-modal-scrim p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Editar lead</h2>
                <p className="mt-1 text-xs text-muted">
                  ID: {formatLeadPublicId(editing.publicId)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground/90 hover:bg-page"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Nome
                </span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Email
                </span>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  WhatsApp (dígitos)
                </span>
                <input
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Status
                </span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">Sem status</option>
                  <option value="inviavel">Inviável</option>
                  <option value="pre_aprovado">Pré-aprovado</option>
                  <option value="credito_aprovado">Crédito aprovado</option>
                  <option value="agendado_escritura">Agendado escritura</option>
                  <option value="escritura_realizada">Escritura realizada</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Comentário (resumo do quiz)
                </span>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-page"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-dark disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

