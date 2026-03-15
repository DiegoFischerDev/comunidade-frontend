'use client';

import { useEffect, useState } from 'react';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  description?: string;
  backgroundImageUrl?: string;
};

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingSortOrder, setEditingSortOrder] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingBackgroundImageUrl, setEditingBackgroundImageUrl] =
    useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingEditBackground, setUploadingEditBackground] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.admin.categories.list();
        setCategories(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar categorias.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Categorias</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const created = await api.admin.categories.create({
        slug,
        name,
        description: description || undefined,
        backgroundImageUrl: backgroundImageUrl || undefined,
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
      });
      setCategories((prev) => [...prev, created]);
      setSlug('');
      setName('');
      setSortOrder('');
      setDescription('');
      setBackgroundImageUrl('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao criar categoria. Tente novamente.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleBackgroundUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingBackground(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || 'Erro ao fazer upload da imagem de background.',
        );
      }
      setBackgroundImageUrl(`${API_URL}${data.url}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload da imagem de background.',
      );
    } finally {
      setUploadingBackground(false);
    }
  }

  function startEdit(row: CategoryRow) {
    setEditingId(row.id);
    setEditingSlug(row.slug);
    setEditingName(row.name);
    setEditingSortOrder(String(row.sortOrder ?? ''));
    setEditingDescription(row.description ?? '');
    setEditingBackgroundImageUrl(row.backgroundImageUrl ?? '');
  }

  async function handleEditBackgroundUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setError('');
    setUploadingEditBackground(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message ||
            'Erro ao fazer upload da imagem de background da categoria.',
        );
      }
      const url = `${API_URL}${data.url}`;
      setEditingBackgroundImageUrl(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload da imagem de background da categoria.',
      );
    } finally {
      setUploadingEditBackground(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSavingEdit(true);
    try {
      const updated = await api.admin.categories.update(editingId, {
        slug: editingSlug || undefined,
        name: editingName || undefined,
        sortOrder: editingSortOrder ? Number(editingSortOrder) : undefined,
        description: editingDescription || undefined,
        backgroundImageUrl: editingBackgroundImageUrl || undefined,
      });
      setCategories((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setEditingId(null);
      setEditingSlug('');
      setEditingName('');
      setEditingSortOrder('');
      setEditingDescription('');
      setEditingBackgroundImageUrl('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar categoria. Tente novamente.',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteCategory(category: CategoryRow) {
    if (
      !window.confirm(
        `Tem certeza que deseja remover esta categoria? Se houver parceiros ou serviços associados, a remoção pode falhar.\n\nNome: ${category.name}\nSlug: ${category.slug}`,
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.admin.categories.delete(category.id);
      setCategories((prev) => prev.filter((row) => row.id !== category.id));
      if (editingId === category.id) {
        setEditingId(null);
        setEditingSlug('');
        setEditingName('');
        setEditingSortOrder('');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao remover categoria. Tente novamente.',
      );
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Categorias</h1>
      <p className="mt-2 text-zinc-600">
        Gerencie as categorias de serviços (slug, nome e ordem de exibição).
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreateCategory}
        className="mt-6 grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3"
      >
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Slug
          </label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: vistos, niss-niff"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1 md:col-span-3">
          <label className="block text-sm font-medium text-zinc-700">
            Descrição (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1 md:col-span-3">
          <label className="block text-sm font-medium text-zinc-700">
            Imagem de background
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleBackgroundUpload}
            className="block w-full text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {uploadingBackground
              ? 'Enviando imagem…'
              : backgroundImageUrl
              ? 'Imagem carregada com sucesso.'
              : 'Selecione uma imagem para o banner da categoria.'}
          </p>
          {backgroundImageUrl && (
            <div className="mt-2 h-20 w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImageUrl})` }}
              />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Nome
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Vistos, NISS/NIFF"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Ordem (opcional)
          </label>
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Criando categoria…' : 'Criar categoria'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando categorias…</p>
      ) : categories.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Nenhuma categoria cadastrada ainda.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Slug</th>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Descrição</th>
                <th className="px-4 py-2 text-left">Ordem</th>
                <th className="px-4 py-2 text-left">Background</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-zinc-200">
                  <td className="px-4 py-2 align-top">
                    {editingId === c.id ? (
                      <input
                        type="text"
                        value={editingSlug}
                        onChange={(e) => setEditingSlug(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      c.slug
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {editingId === c.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {editingId === c.id ? (
                      <textarea
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : c.description ? (
                      <p className="line-clamp-3 max-w-xs text-xs text-zinc-600">
                        {c.description}
                      </p>
                    ) : (
                      <span className="text-xs text-zinc-400">Sem descrição</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {editingId === c.id ? (
                      <input
                        type="number"
                        min={0}
                        value={editingSortOrder}
                        onChange={(e) =>
                          setEditingSortOrder(e.target.value)
                        }
                        className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      c.sortOrder
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {editingId === c.id ? (
                      <div className="space-y-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditBackgroundUpload}
                          className="block w-full text-xs text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
                        />
                        <p className="text-[11px] text-zinc-500">
                          {uploadingEditBackground
                            ? 'Enviando imagem…'
                            : editingBackgroundImageUrl
                            ? 'Imagem carregada.'
                            : 'Selecione uma imagem para o banner.'}
                        </p>
                        {editingBackgroundImageUrl && (
                          <div className="mt-1 h-10 w-full overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                            <div
                              className="h-full w-full bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${editingBackgroundImageUrl})`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : c.backgroundImageUrl ? (
                      <div className="h-10 w-24 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${c.backgroundImageUrl})` }}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Sem imagem</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right align-top space-x-2">
                    {editingId === c.id ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={savingEdit}
                          className="cursor-pointer rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {savingEdit ? 'Salvando…' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingSlug('');
                            setEditingName('');
                            setEditingSortOrder('');
                          }}
                          className="cursor-pointer rounded bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="cursor-pointer rounded bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c)}
                          className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

