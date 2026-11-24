'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  getUserFacingApiError,
  type RagQaPair,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

type FormState = {
  question: string;
  answer: string;
  isActive: boolean;
  showInFaq: boolean;
};

const EMPTY_FORM: FormState = {
  question: '',
  answer: '',
  isActive: true,
  showInFaq: false,
};

export default function AdminRagPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';
  const [items, setItems] = useState<RagQaPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const rows = await api.admin.ragQa.list();
      setItems(rows);
    } catch (e) {
      setItems([]);
      setError(getUserFacingApiError(e) || 'Erro ao carregar Q&A.');
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(row: RagQaPair) {
    setEditingId(row.id);
    setForm({
      question: row.question,
      answer: row.answer,
      isActive: row.isActive,
      showInFaq: row.showInFaq,
    });
  }

  async function handleSave() {
    const question = form.question.trim();
    const answer = form.answer.trim();
    if (!question || !answer) {
      toast.error('Preenche pergunta e resposta.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.admin.ragQa.update(editingId, {
          question,
          answer,
          isActive: form.isActive,
          showInFaq: form.showInFaq,
        });
        toast.success('Par Q&A actualizado.');
      } else {
        await api.admin.ragQa.create({
          question,
          answer,
          isActive: form.isActive,
          showInFaq: form.showInFaq,
        });
        toast.success('Par Q&A criado.');
      }
      startCreate();
      await load();
    } catch (e) {
      toast.error(getUserFacingApiError(e) || 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(row: RagQaPair) {
    try {
      await api.admin.ragQa.update(row.id, { isActive: !row.isActive });
      await load();
    } catch (e) {
      toast.error(getUserFacingApiError(e) || 'Erro ao actualizar estado.');
    }
  }

  async function handleToggleFaq(row: RagQaPair) {
    try {
      await api.admin.ragQa.update(row.id, { showInFaq: !row.showInFaq });
      await load();
    } catch (e) {
      toast.error(getUserFacingApiError(e) || 'Erro ao actualizar FAQ.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Apagar este par pergunta/resposta?')) return;
    setDeletingId(id);
    try {
      await api.admin.ragQa.delete(id);
      if (editingId === id) startCreate();
      toast.success('Par Q&A apagado.');
      await load();
    } catch (e) {
      toast.error(getUserFacingApiError(e) || 'Erro ao apagar.');
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) return null;
  if (!canSee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">RAG (Q&A)</h1>
        <p className="mt-2 text-sm text-muted">
          Não tens permissão para aceder a esta página.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">RAG (Q&A)</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Lista partilhada de perguntas e respostas ideais. Os chatbots usam
            os pares activos como contexto; o toggle FAQ controla o que aparece
            no FAQ público do site.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-page"
        >
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mt-6 max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {editingId ? 'Editar par' : 'Novo par'}
        </h2>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Pergunta
            </span>
            <textarea
              value={form.question}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, question: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              placeholder="Ex.: Quanto custa a assessoria de relocation?"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Resposta ideal
            </span>
            <textarea
              value={form.answer}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, answer: e.target.value }))
              }
              rows={5}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              placeholder="A resposta que o chatbot deve seguir quando a pergunta for semelhante."
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              Activo (RAG / chatbots)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.showInFaq}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, showInFaq: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              FAQ (página pública)
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="cursor-pointer rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-brand-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'A guardar…' : editingId ? 'Guardar alterações' : 'Criar'}
            </button>
            {editingId ? (
              <button
                type="button"
                disabled={saving}
                onClick={startCreate}
                className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-page"
              >
                Cancelar edição
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">
          Pares guardados ({items.length})
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted">A carregar…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Ainda não há pares. Cria o primeiro acima.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-page text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Pergunta</th>
                  <th className="px-4 py-3">Resposta</th>
                  <th className="px-4 py-3">RAG</th>
                  <th className="px-4 py-3">FAQ</th>
                  <th className="px-4 py-3 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => (
                  <tr key={row.id} className="align-top text-foreground">
                    <td className="max-w-xs px-4 py-3">
                      <p className="whitespace-pre-wrap">{row.question}</p>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="whitespace-pre-wrap text-muted">
                        {row.answer.length > 280
                          ? `${row.answer.slice(0, 280)}…`
                          : row.answer}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(row)}
                        className={
                          row.isActive
                            ? 'cursor-pointer rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800'
                            : 'cursor-pointer rounded-full bg-page px-2 py-0.5 text-xs font-semibold text-muted'
                        }
                      >
                        {row.isActive ? 'Activo' : 'Off'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void handleToggleFaq(row)}
                        className={
                          row.showInFaq
                            ? 'cursor-pointer rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-semibold text-brand-primary'
                            : 'cursor-pointer rounded-full bg-page px-2 py-0.5 text-xs font-semibold text-muted'
                        }
                      >
                        {row.showInFaq ? 'No FAQ' : 'Off'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="cursor-pointer rounded bg-primary-1 px-3 py-1 text-xs font-medium text-foreground hover:bg-zinc-200"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row.id)}
                          className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === row.id ? '…' : 'Apagar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
