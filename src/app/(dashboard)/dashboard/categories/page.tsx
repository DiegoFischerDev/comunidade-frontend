'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingSortOrder, setEditingSortOrder] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
      });
      setCategories((prev) => [...prev, created]);
      setSlug('');
      setName('');
      setSortOrder('');
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

  function startEdit(row: CategoryRow) {
    setEditingId(row.id);
    setEditingSlug(row.slug);
    setEditingName(row.name);
    setEditingSortOrder(String(row.sortOrder ?? ''));
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
      });
      setCategories((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setEditingId(null);
      setEditingSlug('');
      setEditingName('');
      setEditingSortOrder('');
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

  async function handleDeleteCategory(id: string) {
    if (
      !window.confirm(
        'Tem certeza que deseja remover esta categoria? Se houver parceiros ou serviços associados, a remoção pode falhar.',
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.admin.categories.delete(id);
      setCategories((prev) => prev.filter((row) => row.id !== id));
      if (editingId === id) {
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
                <th className="px-4 py-2 text-left">Ordem</th>
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
                  <td className="px-4 py-2 text-right align-top space-x-2">
                    {editingId === c.id ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={savingEdit}
                          className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
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
                          className="rounded bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="rounded bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id)}
                          className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
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

