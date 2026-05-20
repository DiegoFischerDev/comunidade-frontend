"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CardButton } from "@/components/ui/CardButton";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";

type Listed = Awaited<ReturnType<typeof api.admin.recommendedServices.list>>[number];
type AvailableLink = Awaited<
  ReturnType<typeof api.admin.recommendedServices.availableLinks>
>[number];

function PencilIcon({ className }: { className?: string }) {
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
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

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

function formatWhatsappDigits(digits: string): string {
  const d = String(digits ?? "").replace(/\D/g, "");
  if (!d) return "—";
  if (d.length === 12 && d.startsWith("351")) {
    const r = d.slice(3);
    return `+351 ${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`;
  }
  return d;
}

function nextSortOrder(rows: Listed[]): number {
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((r) => r.sortOrder)) + 1;
}

type ServiceFormFieldsProps = {
  title: string;
  onTitleChange: (v: string) => void;
  linkId: string;
  onLinkIdChange: (v: string) => void;
  sortOrder: number;
  onSortOrderChange: (v: number) => void;
  active: boolean;
  onActiveChange: (v: boolean) => void;
  linkOptions: AvailableLink[];
  linkSelectHint?: string | null;
  cardImageUrl: string | null;
  cardImagePreviewUrl: string | null;
  cardImageBusy: boolean;
  onCardImageSelect: (file: File | null) => void;
  onCardImageRemove: () => void;
  canRemoveCardImage: boolean;
};

function ServiceFormFields({
  title,
  onTitleChange,
  linkId,
  onLinkIdChange,
  sortOrder,
  onSortOrderChange,
  active,
  onActiveChange,
  linkOptions,
  linkSelectHint,
  cardImageUrl,
  cardImagePreviewUrl,
  cardImageBusy,
  onCardImageSelect,
  onCardImageRemove,
  canRemoveCardImage,
}: ServiceFormFieldsProps) {
  const previewSrc =
    cardImagePreviewUrl ??
    (cardImageUrl ? resolveUploadsUrl(cardImageUrl) : null);

  return (
    <>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-zinc-700">Título</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          placeholder="Ex.: Crédito habitação"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-zinc-700">Link</label>
        <select
          value={linkId}
          onChange={(e) => onLinkIdChange(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Selecionar link…</option>
          {linkOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title} ({l.slug})
              {l.whatsappDigits ? ` — ${formatWhatsappDigits(l.whatsappDigits)}` : ""}
            </option>
          ))}
        </select>
        {linkSelectHint ? (
          <p className="mt-1 text-xs text-zinc-500">{linkSelectHint}</p>
        ) : null}
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-700">Ordem</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-end">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onActiveChange(e.target.checked)}
          />
          Visível na lista pública
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-zinc-700">
          Imagem do card (página pública)
        </label>
        <p className="mt-0.5 text-xs text-zinc-500">
          Proporção 4:3 recomendada. Aparece no topo de cada card em Serviços que indico.
        </p>
        {previewSrc ? (
          <div className="relative mt-2 aspect-[4/3] max-w-xs overflow-hidden rounded-lg border border-zinc-200">
            <Image
              src={previewSrc}
              alt=""
              fill
              className="object-cover"
              sizes="320px"
              unoptimized
            />
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50">
            {cardImageBusy
              ? "A enviar…"
              : previewSrc
                ? "Substituir imagem"
                : "Enviar imagem"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={cardImageBusy}
              onChange={(e) => {
                onCardImageSelect(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          {canRemoveCardImage && previewSrc ? (
            <button
              type="button"
              disabled={cardImageBusy}
              onClick={onCardImageRemove}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              Remover imagem
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ModalShell({
  title,
  titleId,
  onClose,
  children,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-medium text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Fechar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminRecommendedServicesPage() {
  const [rows, setRows] = useState<Listed[]>([]);
  const [links, setLinks] = useState<AvailableLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createLinkId, setCreateLinkId] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [createSort, setCreateSort] = useState(0);
  const [createPendingImage, setCreatePendingImage] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLinkId, setEditLinkId] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSort, setEditSort] = useState(0);
  const [cardImageBusy, setCardImageBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, available] = await Promise.all([
        api.admin.recommendedServices.list(),
        api.admin.recommendedServices.availableLinks(),
      ]);
      setRows(list);
      setLinks(available);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function revokeCreatePreview() {
    if (createImagePreview) {
      URL.revokeObjectURL(createImagePreview);
    }
  }

  function resetCreateForm(list: Listed[]) {
    revokeCreatePreview();
    setCreateTitle("");
    setCreateLinkId("");
    setCreateActive(true);
    setCreateSort(nextSortOrder(list));
    setCreatePendingImage(null);
    setCreateImagePreview(null);
  }

  function closeAddModal() {
    resetCreateForm(rows);
    setAddModalOpen(false);
  }

  function openAddModal() {
    setError("");
    closeEditModal();
    resetCreateForm(rows);
    setAddModalOpen(true);
  }

  function closeEditModal() {
    setEditId(null);
  }

  function startEdit(row: Listed) {
    setError("");
    closeAddModal();
    setEditId(row.id);
    setEditTitle(row.title);
    setEditLinkId(row.partnerShareLink.id);
    setEditActive(row.active);
    setEditSort(row.sortOrder);
  }

  const editingRow = editId ? rows.find((r) => r.id === editId) : null;
  const linkOptionsForCreate = links.filter((l) => !l.alreadyUsed);
  const modalOpen = addModalOpen || Boolean(editId);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (addModalOpen) closeAddModal();
        else closeEditModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, addModalOpen]);

  useEffect(() => {
    return () => {
      if (createImagePreview) URL.revokeObjectURL(createImagePreview);
    };
  }, [createImagePreview]);

  function onCreateImageSelect(file: File | null) {
    revokeCreatePreview();
    if (!file) {
      setCreatePendingImage(null);
      setCreateImagePreview(null);
      return;
    }
    setCreatePendingImage(file);
    setCreateImagePreview(URL.createObjectURL(file));
  }

  function onCreateImageRemove() {
    revokeCreatePreview();
    setCreatePendingImage(null);
    setCreateImagePreview(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const link = links.find((l) => l.id === createLinkId);
    if (!link) {
      setError("Selecione um link válido.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await api.admin.recommendedServices.create({
        title: createTitle.trim(),
        partnerShareLinkId: link.id,
        active: createActive,
        sortOrder: createSort,
      });
      if (createPendingImage) {
        setCardImageBusy(true);
        try {
          await api.admin.recommendedServices.uploadCardImage(
            created.id,
            createPendingImage,
          );
        } finally {
          setCardImageBusy(false);
        }
      }
      closeAddModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCardImageSelected(file: File | null) {
    if (!editId || !file) return;
    setCardImageBusy(true);
    setError("");
    try {
      await api.admin.recommendedServices.uploadCardImage(editId, file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setCardImageBusy(false);
    }
  }

  async function handleCardImageRemove() {
    if (!editId || !editingRow?.cardImageUrl) return;
    if (!window.confirm("Remover a imagem do card?")) return;
    setCardImageBusy(true);
    setError("");
    try {
      await api.admin.recommendedServices.deleteCardImage(editId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover imagem.");
    } finally {
      setCardImageBusy(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    const link = links.find((l) => l.id === editLinkId || l.slug === editLinkId);
    if (!link) {
      setError("Selecione um link válido.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.admin.recommendedServices.update(editId, {
        title: editTitle.trim(),
        partnerShareLinkId: link.id,
        active: editActive,
        sortOrder: editSort,
      });
      closeEditModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover este serviço da lista pública?")) return;
    setError("");
    setDeletingId(id);
    try {
      await api.admin.recommendedServices.delete(id);
      if (editId === id) closeEditModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Serviços indicados</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Escolha links já criados em{" "}
            <Link
              href="/dashboard/admin/share-links"
              className="font-medium text-blue-600 hover:underline"
            >
              Links WhatsApp
            </Link>
            . Cada item na lista pública abre <code className="text-xs">/link?t=…</code> e
            conta o clique antes de ir para o WhatsApp do parceiro.
          </p>
          <p className="mt-2">
            <Link
              href="/relocation/servicos"
              className="text-sm font-medium text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver página pública →
            </Link>
          </p>
        </div>
        <CardButton type="button" variant="primary" onClick={openAddModal}>
          Adicionar serviço
        </CardButton>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Imagem</th>
                <th className="px-3 py-2">Ordem</th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Link</th>
                <th className="px-3 py-2">Ativo</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    Nenhum serviço na lista.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const thumb = r.cardImageUrl
                    ? resolveUploadsUrl(r.cardImageUrl)
                    : null;
                  return (
                    <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-3 py-2">
                        <div className="relative h-12 w-16 overflow-hidden rounded-md border border-zinc-200 bg-gradient-to-br from-[#1a4d2e] to-[#7cb518]">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[10px] text-white/80">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{r.sortOrder}</td>
                      <td className="px-3 py-2 font-medium text-zinc-900">{r.title}</td>
                      <td className="px-3 py-2">
                        <span className="text-zinc-700">{r.partnerShareLink.title}</span>
                        <br />
                        <Link
                          href={r.redirectPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {r.partnerShareLink.slug}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{r.active ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex justify-end gap-2">
                          <button
                            type="button"
                            title="Editar serviço"
                            aria-label="Editar serviço"
                            disabled={deletingId === r.id || saving}
                            onClick={() => startEdit(r)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Excluir serviço"
                            aria-label="Excluir serviço"
                            disabled={deletingId === r.id || saving}
                            onClick={() => void handleDelete(r.id)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-700 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === r.id ? (
                              <svg
                                className="h-4 w-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      {addModalOpen ? (
        <ModalShell
          title="Adicionar serviço"
          titleId="add-recommended-service-title"
          onClose={closeAddModal}
        >
          <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
            <ServiceFormFields
              title={createTitle}
              onTitleChange={setCreateTitle}
              linkId={createLinkId}
              onLinkIdChange={setCreateLinkId}
              sortOrder={createSort}
              onSortOrderChange={setCreateSort}
              active={createActive}
              onActiveChange={setCreateActive}
              linkOptions={linkOptionsForCreate}
              linkSelectHint={
                linkOptionsForCreate.length === 0 && !loading
                  ? "Todos os links já estão na lista. Crie um novo em Links WhatsApp."
                  : null
              }
              cardImageUrl={null}
              cardImagePreviewUrl={createImagePreview}
              cardImageBusy={saving || cardImageBusy}
              onCardImageSelect={onCreateImageSelect}
              onCardImageRemove={onCreateImageRemove}
              canRemoveCardImage={Boolean(createImagePreview)}
            />
            <div className="flex gap-2 sm:col-span-2">
              <CardButton
                type="submit"
                variant="primary"
                loading={saving || cardImageBusy}
                disabled={!createLinkId}
              >
                Adicionar
              </CardButton>
              <CardButton type="button" variant="outline" onClick={closeAddModal}>
                Cancelar
              </CardButton>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {editId ? (
        <ModalShell
          title="Editar serviço"
          titleId="edit-recommended-service-title"
          onClose={closeEditModal}
        >
          <form onSubmit={handleSaveEdit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <ServiceFormFields
              title={editTitle}
              onTitleChange={setEditTitle}
              linkId={editLinkId}
              onLinkIdChange={setEditLinkId}
              sortOrder={editSort}
              onSortOrderChange={setEditSort}
              active={editActive}
              onActiveChange={setEditActive}
              linkOptions={links}
              cardImageUrl={editingRow?.cardImageUrl ?? null}
              cardImagePreviewUrl={null}
              cardImageBusy={cardImageBusy}
              onCardImageSelect={(f) => void handleCardImageSelected(f)}
              onCardImageRemove={() => void handleCardImageRemove()}
              canRemoveCardImage={Boolean(editingRow?.cardImageUrl)}
            />
            <div className="flex gap-2 sm:col-span-2">
              <CardButton type="submit" variant="primary" loading={saving}>
                Guardar
              </CardButton>
              <CardButton type="button" variant="outline" onClick={closeEditModal}>
                Cancelar
              </CardButton>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
