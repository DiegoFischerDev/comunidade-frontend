'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Row = Awaited<
  ReturnType<typeof api.partner.leads.nextContact.list>
>['items'][number];

function formatLeadPublicId(publicId: number | null | undefined): string {
  if (!publicId || Number.isNaN(Number(publicId))) return '—';
  return String(publicId).padStart(6, '0');
}

function digitsOnly(value: string): string {
  return String(value ?? '').replace(/\D+/g, '');
}

function formatMonthPt(d: Date): string {
  return d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
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

function toDateTimeLocalValue(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function previewOneLine(text: string | null, max = 110): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '—';
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function ProximoContactoPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'PARTNER';

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [editing, setEditing] = useState<Row | null>(null);
  const [editValue, setEditValue] = useState(''); // datetime-local (local tz)
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.partner.leads.nextContact.list();
      setItems(res.items);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    // Mostrar apenas: mês anterior, mês atual e futuros (ignorar meses mais antigos).
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const visible = items.filter((it) => {
      const d = new Date(it.nextContactAt);
      if (Number.isNaN(d.getTime())) return false;
      return d >= startOfPrevMonth;
    });
    const visibleFiltered =
      statusFilter === 'all'
        ? visible
        : visible.filter((it) => (it.status ?? '') === statusFilter);

    const map = new Map<string, Row[]>();
    for (const it of visibleFiltered) {
      const d = new Date(it.nextContactAt);
      const key = Number.isNaN(d.getTime())
        ? 'Sem data'
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    // garantir ordenação dentro do mês
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.nextContactAt).getTime() - new Date(b.nextContactAt).getTime(),
      );
    }
    const keyFor = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const prevKey = keyFor(startOfPrevMonth);
    const thisKey = keyFor(startOfThisMonth);

    const prevItems = map.get(prevKey) ?? [];
    const thisItems = map.get(thisKey) ?? [];
    map.delete(prevKey);
    map.delete(thisKey);

    const futureEntries = Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    const out: Array<{ key: string; label: string; items: Row[] }> = [];
    if (prevItems.length) {
      out.push({
        key: prevKey,
        label: `Mês anterior — ${formatMonthPt(startOfPrevMonth)}`,
        items: prevItems,
      });
    }
    if (thisItems.length) {
      out.push({
        key: thisKey,
        label: `Mês atual — ${formatMonthPt(startOfThisMonth)}`,
        items: thisItems,
      });
    }
    for (const [key, arr] of futureEntries) {
      out.push({ key, label: formatMonthPt(new Date(`${key}-01T00:00:00`)), items: arr });
    }
    return out;
  }, [items, statusFilter]);

  const openEdit = useCallback((row: Row) => {
    setEditing(row);
    setEditValue(toDateTimeLocalValue(row.nextContactAt));
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
      if (!editValue) {
        await api.partner.leads.nextContact.set(editing.id, null);
      } else {
        const asIso = new Date(editValue).toISOString();
        await api.partner.leads.nextContact.set(editing.id, asIso);
      }
      await load();
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }, [editing, editValue, load, closeEdit]);

  if (!user) return null;
  if (!canSee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Próximo contacto</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta página é exclusiva para parceiros de financiamento.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Próximo contacto</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Agenda simples de follow-up. Aqui só aparecem leads com agendamento definido.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 sm:w-56"
          >
            <option value="all">Todos os status</option>
            <option value="inviavel">Inviável</option>
            <option value="pre_aprovado">Pré-aprovado</option>
            <option value="credito_aprovado">Crédito aprovado</option>
            <option value="agendado_escritura">Agendado escritura</option>
            <option value="escritura_realizada">Escritura realizada</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
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
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-zinc-700">
            Nenhum lead agendado. Define um “próximo contacto” em algum lead para ele aparecer
            aqui.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                {g.label}
              </h2>
              <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    <tr>
                      <th className="px-4 py-3">Próximo contacto</th>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Resumo</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {g.items.map((row) => {
                      const wa = digitsOnly(row.whatsapp);
                      return (
                        <tr key={row.id} className="hover:bg-zinc-50/60">
                          <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                            {formatDtPt(row.nextContactAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-900">{row.name}</div>
                            <div className="text-xs text-zinc-600">
                              {row.email} · +{wa}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              ID: {formatLeadPublicId(row.publicId)}
                            </div>
                          </td>
                          <td className="max-w-[520px] px-4 py-3 text-zinc-700">
                            {previewOneLine(row.comment)}
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
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="ml-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Editar próximo contacto</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {editing.name} · ID: {formatLeadPublicId(editing.publicId)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Data e hora (hora local)
              </label>
              <input
                type="datetime-local"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <p className="text-xs text-zinc-500">
                Para remover da agenda, apaga o campo e salva.
              </p>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

