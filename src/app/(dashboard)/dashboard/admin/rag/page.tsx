'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  getUserFacingApiError,
  type RagQaPair,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

type Draft = {
  question: string;
  answer: string;
};

type CreateForm = {
  question: string;
  answer: string;
  isActive: boolean;
  showInFaq: boolean;
};

const EMPTY_CREATE: CreateForm = {
  question: '',
  answer: '',
  isActive: true,
  showInFaq: false,
};

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

function SwitchToggle(props: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  const { checked, disabled, label, onChange } = props;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? 'relative h-7 w-12 shrink-0 cursor-pointer rounded-full bg-brand-primary transition-colors disabled:cursor-not-allowed disabled:opacity-60'
          : 'relative h-7 w-12 shrink-0 cursor-pointer rounded-full bg-border transition-colors disabled:cursor-not-allowed disabled:opacity-60'
      }
    >
      <span
        className={
          checked
            ? 'absolute top-0.5 left-6 h-6 w-6 rounded-full bg-white shadow-sm transition-all'
            : 'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all'
        }
      />
    </button>
  );
}

export default function AdminRagPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';
  const [items, setItems] = useState<RagQaPair[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const rows = await api.admin.ragQa.list();
      setItems(rows);
      setDrafts({});
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

  const dirtyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of items) {
      const draft = drafts[row.id];
      if (!draft) continue;
      if (
        draft.question !== row.question ||
        draft.answer !== row.answer
      ) {
        ids.add(row.id);
      }
    }
    return ids;
  }, [drafts, items]);

  function draftFor(row: RagQaPair): Draft {
    return (
      drafts[row.id] ?? {
        question: row.question,
        answer: row.answer,
      }
    );
  }

  function updateDraft(
    row: RagQaPair,
    field: keyof Draft,
    value: string,
  ) {
    setDrafts((prev) => {
      const current = prev[row.id] ?? {
        question: row.question,
        answer: row.answer,
      };
      return {
        ...prev,
        [row.id]: { ...current, [field]: value },
      };
    });
  }

  async function handleCreate() {
    const question = createForm.question.trim();
    const answer = createForm.answer.trim();
    if (!question || !answer) {
      toast.error('Preenche pergunta e resposta.');
      return;
    }
    setCreating(true);
    try {
      await api.admin.ragQa.create({
        question,
        answer,
        isActive: createForm.isActive,
        showInFaq: createForm.showInFaq,
      });
      setCreateForm(EMPTY_CREATE);
      toast.success('Par Q&A criado.');
      await load();
    } catch (e) {
      toast.error(getUserFacingApiError(e) || 'Erro ao criar.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveRow(row: RagQaPair) {
    const draft = draftFor(row);
    const question = draft.question.trim();
    const answer = draft.answer.trim();
    if (!question || !answer) {
      toast.error('Preenche pergunta e resposta.');
      return;
    }
    setSavingId(row.id);
    try {
      const updated = await api.admin.ragQa.update(row.id, {
        question,
        answer,
      });
      setItems((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item)),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      toast.success('Alterações guardadas.');
    } catch (e) {
      toast.error(getUserFacingApiError(e) || 'Erro ao guardar.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(row: RagQaPair, next: boolean) {
    const key = `${row.id}:rag`;
    setTogglingKey(key);
    setItems((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, isActive: next } : item,
      ),
    );
    try {
      const updated = await api.admin.ragQa.update(row.id, { isActive: next });
      setItems((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item)),
      );
    } catch (e) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, isActive: row.isActive } : item,
        ),
      );
      toast.error(getUserFacingApiError(e) || 'Erro ao actualizar RAG.');
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleToggleFaq(row: RagQaPair, next: boolean) {
    const key = `${row.id}:faq`;
    setTogglingKey(key);
    setItems((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, showInFaq: next } : item,
      ),
    );
    try {
      const updated = await api.admin.ragQa.update(row.id, { showInFaq: next });
      setItems((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item)),
      );
    } catch (e) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, showInFaq: row.showInFaq } : item,
        ),
      );
      toast.error(getUserFacingApiError(e) || 'Erro ao actualizar FAQ.');
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Apagar este par pergunta/resposta?')) return;
    setDeletingId(id);
    try {
      await api.admin.ragQa.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Par Q&A apagado.');
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
            Edita pergunta e resposta directamente na tabela. Os toggles RAG e
            FAQ guardam na hora.
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
        <h2 className="text-lg font-semibold text-foreground">Novo par</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Pergunta
            </span>
            <textarea
              value={createForm.question}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  question: e.target.value,
                }))
              }
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              placeholder="Ex.: Quanto custa a assessoria de relocation?"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Resposta ideal
            </span>
            <textarea
              value={createForm.answer}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, answer: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              placeholder="A resposta que o chatbot deve seguir quando a pergunta for semelhante."
            />
          </label>
          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <SwitchToggle
                checked={createForm.isActive}
                label="RAG activo no novo par"
                onChange={(next) =>
                  setCreateForm((prev) => ({ ...prev, isActive: next }))
                }
              />
              RAG
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <SwitchToggle
                checked={createForm.showInFaq}
                label="FAQ no novo par"
                onChange={(next) =>
                  setCreateForm((prev) => ({ ...prev, showInFaq: next }))
                }
              />
              FAQ
            </label>
          </div>
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreate()}
            className="cursor-pointer rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-brand-on-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'A criar…' : 'Criar'}
          </button>
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
                  <th className="px-4 py-3 text-right">
                    <span className="sr-only">Acções</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((row) => {
                  const draft = draftFor(row);
                  const isDirty = dirtyIds.has(row.id);
                  const isSaving = savingId === row.id;
                  return (
                    <tr key={row.id} className="align-top text-foreground">
                      <td className="min-w-[14rem] px-4 py-3">
                        <textarea
                          value={draft.question}
                          onChange={(e) =>
                            updateDraft(row, 'question', e.target.value)
                          }
                          rows={3}
                          className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                          aria-label={`Pergunta ${row.id}`}
                        />
                      </td>
                      <td className="min-w-[18rem] px-4 py-3">
                        <textarea
                          value={draft.answer}
                          onChange={(e) =>
                            updateDraft(row, 'answer', e.target.value)
                          }
                          rows={4}
                          className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                          aria-label={`Resposta ${row.id}`}
                        />
                        {isDirty ? (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void handleSaveRow(row)}
                            className="mt-2 cursor-pointer rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-brand-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? 'A guardar…' : 'Salvar alterações'}
                          </button>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <SwitchToggle
                          checked={row.isActive}
                          disabled={togglingKey === `${row.id}:rag`}
                          label={
                            row.isActive
                              ? 'Desactivar RAG'
                              : 'Activar RAG'
                          }
                          onChange={(next) =>
                            void handleToggleActive(row, next)
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <SwitchToggle
                          checked={row.showInFaq}
                          disabled={togglingKey === `${row.id}:faq`}
                          label={
                            row.showInFaq
                              ? 'Retirar do FAQ'
                              : 'Mostrar no FAQ'
                          }
                          onChange={(next) => void handleToggleFaq(row, next)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row.id)}
                          aria-label="Apagar par Q&A"
                          title="Apagar"
                          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
