"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { ModalPortal } from "@/components/ui/ModalPortal";

type Listed = Awaited<ReturnType<typeof api.admin.jobOffers.list>>[number];

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function dateInputToIso(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  return d.toISOString();
}

function formatPublishedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT");
}

type FormState = {
  title: string;
  jobFunction: string;
  city: string;
  description: string;
  publishedAt: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  title: "",
  jobFunction: "",
  city: "",
  description: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  active: true,
});

export type JobOfferAdminEditInput = {
  id: string;
  title: string;
  jobFunction: string;
  city: string;
  description: string;
  publishedAt: string;
  active?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  /** Abre diretamente o formulário de edição desta oferta. */
  offerToEdit?: JobOfferAdminEditInput | null;
};

export function JobOffersAdminModal({
  open,
  onClose,
  onChanged,
  offerToEdit = null,
}: Props) {
  const [rows, setRows] = useState<Listed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.admin.jobOffers.list();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar ofertas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openEditForm = useCallback((row: JobOfferAdminEditInput) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      jobFunction: row.jobFunction,
      city: row.city,
      description: row.description,
      publishedAt: toDateInputValue(row.publishedAt),
      active: row.active ?? true,
    });
    setPasteText("");
    setShowForm(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    if (offerToEdit) {
      openEditForm(offerToEdit);
      return;
    }
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm());
    setPasteText("");
  }, [open, load, offerToEdit, openEditForm]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setPasteText("");
    setShowForm(true);
  };

  const handleParseFromText = async () => {
    const text = pasteText.trim();
    if (text.length < 20) {
      setError("Cola o texto completo da oferta (mínimo 20 caracteres).");
      return;
    }
    setParsing(true);
    setError("");
    try {
      const parsed = await api.admin.jobOffers.parseFromText({ text });
      setForm({
        title: parsed.title,
        jobFunction: parsed.jobFunction,
        city: parsed.city,
        description: parsed.description,
        publishedAt: toDateInputValue(parsed.publishedAt),
        active: form.active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar o texto.");
    } finally {
      setParsing(false);
    }
  };

  const startEdit = (row: Listed) => {
    openEditForm(row);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const jobFunction = form.jobFunction.trim();
    const city = form.city.trim();
    const description = form.description.trim();
    if (!title || !jobFunction || !city || !description) {
      setError("Preencha título, função, cidade e descrição.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        title,
        jobFunction,
        city,
        description,
        publishedAt: dateInputToIso(form.publishedAt),
        active: form.active,
      };
      if (editingId) {
        await api.admin.jobOffers.update(editingId, body);
      } else {
        await api.admin.jobOffers.create(body);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar esta oferta de trabalho?")) return;
    setError("");
    try {
      await api.admin.jobOffers.delete(id);
      if (editingId === id) {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm());
      }
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao eliminar.");
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-offers-admin-title"
          className="flex max-h-[min(92vh,800px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 id="job-offers-admin-title" className="text-lg font-bold text-zinc-900">
              Gerir ofertas de trabalho
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {error ? (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {showForm ? (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <p className="text-sm font-medium text-zinc-800">
                  {editingId ? "Editar oferta" : "Nova oferta"}
                </p>
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                  <label className="block text-xs font-medium text-zinc-800">
                    Texto completo da oferta (IA)
                  </label>
                  <p className="mt-1 text-xs text-zinc-600">
                    Cola o anúncio original; a OpenAI verifica se é uma vaga de emprego
                    e, só nesse caso, preenche os campos abaixo.
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={8}
                    placeholder="Cola aqui o texto da vaga (WhatsApp, email, site…)"
                    className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={parsing || pasteText.trim().length < 20}
                    onClick={() => void handleParseFromText()}
                    className="mt-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {parsing ? "A analisar…" : "Preencher com IA"}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Título
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Função
                  </label>
                  <input
                    value={form.jobFunction}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, jobFunction: e.target.value }))
                    }
                    required
                    placeholder="Ex.: Empregado de mesa"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Cidade
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                    required
                    placeholder="Ex.: Lisboa"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Data de publicação
                  </label>
                  <input
                    type="date"
                    value={form.publishedAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, publishedAt: e.target.value }))
                    }
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Descrição
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                    rows={6}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, active: e.target.checked }))
                    }
                  />
                  Publicada (visível na lista pública)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "A guardar…" : editingId ? "Guardar" : "Criar oferta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(emptyForm());
                      setPasteText("");
                    }}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-800"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startCreate}
                  className="mb-4 w-full rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
                >
                  Adicionar oferta de trabalho
                </button>
                {loading ? (
                  <p className="text-sm text-zinc-500">A carregar…</p>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-zinc-600">Nenhuma oferta criada.</p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900">{row.title}</p>
                          <p className="text-sm text-zinc-600">
                            {row.jobFunction} · {row.city} ·{" "}
                            {formatPublishedAt(row.publishedAt)}
                            {!row.active ? (
                              <span className="ml-2 text-amber-700">(oculta)</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(row.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
