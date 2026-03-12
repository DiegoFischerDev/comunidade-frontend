'use client';

import { useEffect, useState } from 'react';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PartnerRow = {
  id: string;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  createdAt: string;
  user: { id: string; email: string; role: string };
  category: { id: string; name: string; slug: string } | null;
};

export default function PartnersPage() {
  const { user, impersonateAsUser } = useAuth();
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(
    null,
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  function resolveLogo(url: string | null) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
    return url;
  }

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [partnersData, categoriesData] = await Promise.all([
          api.admin.partners.list(),
          api.admin.partners.listCategories(),
        ]);
        setPartners(partnersData);
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar parceiros.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Parceiros</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  async function handleCreatePartner(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const result = await api.admin.partners.create({
        email,
        password,
        name,
        whatsapp,
        logoUrl: logoUrl || undefined,
      });
      setPartners((prev) => [
        {
          id: result.partner.id,
          name: result.partner.name,
          whatsapp: result.partner.whatsapp,
          logoUrl: result.partner.logoUrl,
          createdAt: result.partner.createdAt,
          user: result.user,
          category: null,
        },
        ...prev,
      ]);
      setEmail('');
      setPassword('');
      setName('');
      setWhatsapp('');
      setLogoUrl('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao criar parceiro. Tente novamente.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleLogoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingLogo(true);
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
          data.message || 'Erro ao fazer upload da logo.',
        );
      }
      setLogoUrl(`${API_URL}${data.url}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload da logo.',
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Parceiros</h1>
      <p className="mt-2 text-zinc-600">
        Gerencie parceiros da plataforma (criação e remoção).
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreatePartner}
        className="mt-6 grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2"
      >
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            E-mail do parceiro
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Senha inicial
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Nome do parceiro
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            WhatsApp (com DDI)
          </label>
          <input
            type="text"
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">
            Logo do parceiro
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="block w-full text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {uploadingLogo
              ? 'Enviando logo…'
              : logoUrl
              ? 'Logo carregada com sucesso.'
              : 'Selecione uma imagem de logo. Ela será exibida nos cards e páginas do parceiro.'}
          </p>
          {logoUrl && (
            <div className="mt-2">
              <img
                src={logoUrl}
                alt="Pré-visualização da logo"
                className="h-12 w-12 rounded object-contain border border-zinc-200 bg-white"
              />
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Criando parceiro…' : 'Criar parceiro'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando parceiros…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Logo</th>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">WhatsApp</th>
                <th className="px-4 py-2 text-left">Categoria</th>
                <th className="px-4 py-2 text-left">Criado em</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-zinc-200">
                  <td className="px-4 py-2">
                    {resolveLogo(p.logoUrl) ? (
                      <img
                        src={resolveLogo(p.logoUrl) as string}
                        alt={p.name}
                        className="h-8 w-8 rounded object-contain"
                      />
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.user.email}</td>
                  <td className="px-4 py-2">{p.whatsapp}</td>
                  <td className="px-4 py-2">
                    <select
                      value={p.category?.id ?? ''}
                      onChange={async (e) => {
                        const newCategoryId = e.target.value || null;
                        setUpdatingCategoryId(p.id);
                        setError('');
                        try {
                          const updated = await api.admin.partners.update(
                            p.id,
                            { categoryId: newCategoryId },
                          );
                          setPartners((prev) =>
                            prev.map((row) =>
                              row.id === p.id
                                ? { ...row, category: updated.category }
                                : row,
                            ),
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao atualizar categoria do parceiro.',
                          );
                        } finally {
                          setUpdatingCategoryId(null);
                        }
                      }}
                      disabled={updatingCategoryId === p.id}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {new Date(p.createdAt).toLocaleString('pt-PT')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        try {
                          await impersonateAsUser(p.user.id);
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao entrar como este parceiro.',
                          );
                        }
                      }}
                      className="mr-2 cursor-pointer rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Logar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Tem certeza que deseja remover este parceiro? Esta ação é irreversível.',
                          )
                        ) {
                          return;
                        }
                        try {
                          await api.admin.partners.delete(p.id);
                          setPartners((prev) =>
                            prev.filter((row) => row.id !== p.id),
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao remover parceiro.',
                          );
                        }
                      }}
                      className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-4 text-center text-sm text-zinc-500"
                  >
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

