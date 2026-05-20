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

function formatWhatsappDigits(digits: string): string {
  const d = String(digits ?? "").replace(/\D/g, "");
  if (!d) return "—";
  if (d.length === 12 && d.startsWith("351")) {
    const r = d.slice(3);
    return `+351 ${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`;
  }
  return d;
}

export default function AdminRecommendedServicesPage() {
  const [rows, setRows] = useState<Listed[]>([]);
  const [links, setLinks] = useState<AvailableLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [linkId, setLinkId] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLinkId, setEditLinkId] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSort, setEditSort] = useState(0);
  const [cardImageBusy, setCardImageBusy] = useState(false);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.admin.recommendedServices.create({
        title: title.trim(),
        partnerShareLinkId: linkId,
      });
      setTitle("");
      setLinkId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row: Listed) {
    setEditId(row.id);
    setEditTitle(row.title);
    setEditLinkId(row.partnerShareLink.id);
    setEditActive(row.active);
    setEditSort(row.sortOrder);
  }

  const editingRow = editId ? rows.find((r) => r.id === editId) : null;

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
      setEditId(null);
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
    try {
      await api.admin.recommendedServices.delete(id);
      if (editId === id) setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  const linkOptionsForCreate = links.filter((l) => !l.alreadyUsed);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Serviços indicados</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Escolha links já criados em{" "}
          <Link href="/dashboard/admin/share-links" className="font-medium text-blue-600 hover:underline">
            Links WhatsApp
          </Link>
          . Cada item na lista pública abre <code className="text-xs">/link?t=…</code> e conta o
          clique antes de ir para o WhatsApp do parceiro.
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

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Adicionar serviço</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <div>
            <label htmlFor="new-title" className="block text-xs font-medium text-zinc-700">
              Título na lista
            </label>
            <input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Ex.: Crédito habitação"
            />
          </div>
          <div>
            <label htmlFor="new-link" className="block text-xs font-medium text-zinc-700">
              Link de redirecionamento
            </label>
            <select
              id="new-link"
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Selecionar link…</option>
              {linkOptionsForCreate.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.slug}) — {formatWhatsappDigits(l.whatsappDigits)}
                </option>
              ))}
            </select>
            {linkOptionsForCreate.length === 0 && !loading ? (
              <p className="mt-1 text-xs text-zinc-500">
                Todos os links já estão na lista. Crie um novo em Links WhatsApp.
              </p>
            ) : null}
          </div>
          <CardButton type="submit" variant="primary" loading={saving} disabled={!linkId}>
            Adicionar
          </CardButton>
        </form>
      </section>

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
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="cursor-pointer text-xs font-medium text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      <span className="mx-1 text-zinc-300">·</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(r.id)}
                        className="cursor-pointer text-xs font-medium text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      {editId ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Editar serviço</h2>
          <form onSubmit={handleSaveEdit} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">Título</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700">Link</label>
              <select
                value={editLinkId}
                onChange={(e) => setEditLinkId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {links.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700">Ordem</label>
              <input
                type="number"
                value={editSort}
                onChange={(e) => setEditSort(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
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
              {editingRow?.cardImageUrl ? (
                <div className="relative mt-2 aspect-[4/3] max-w-xs overflow-hidden rounded-lg border border-zinc-200">
                  <Image
                    src={resolveUploadsUrl(editingRow.cardImageUrl)}
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
                  {cardImageBusy ? "A enviar…" : editingRow?.cardImageUrl ? "Substituir imagem" : "Enviar imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={cardImageBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void handleCardImageSelected(f ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {editingRow?.cardImageUrl ? (
                  <button
                    type="button"
                    disabled={cardImageBusy}
                    onClick={() => void handleCardImageRemove()}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    Remover imagem
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <CardButton type="submit" variant="primary" loading={saving}>
                Guardar
              </CardButton>
              <CardButton type="button" variant="outline" onClick={() => setEditId(null)}>
                Cancelar
              </CardButton>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
