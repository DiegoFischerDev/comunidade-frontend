'use client';

import { useEffect, useState } from 'react';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';
import { formatAdvertisingBalanceEur } from '@/components/house/HousePublicationStatusBadge';

type PartnerRow = {
  id: string;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  advertisingBalanceEurCents: number;
  user: { id: string; email: string | null; role: string };
  category: { id: string; name: string; slug: string } | null;
  heroShareLink: {
    id: string;
    slug: string;
    _count: { clicks: number };
  } | null;
  services: { id: string; partnerShareLinkId: string | null }[];
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
  const [balanceInputByPartnerId, setBalanceInputByPartnerId] = useState<Record<string, string>>({});
  const [savingBalancePartnerId, setSavingBalancePartnerId] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settingUpLinksPartnerId, setSettingUpLinksPartnerId] = useState<string | null>(
    null,
  );

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
        password,
        name,
        email: email.trim() || undefined,
        whatsapp,
        logoUrl: logoUrl || undefined,
      });
      setPartners((prev) => [
        {
          id: result.partner.id,
          name: result.partner.name,
          whatsapp: result.partner.whatsapp,
          logoUrl: result.partner.logoUrl,
          advertisingBalanceEurCents: 0,
          user: result.user,
          category: null,
          heroShareLink: null,
          services: [],
        },
        ...prev,
      ]);
      setPassword('');
      setName('');
      setEmail('');
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
            Nome
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
            E-mail da conta (opcional)
          </label>
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parceiro@exemplo.com"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-zinc-500">
            Se preencheres, o parceiro poderá usar este e-mail para login e recuperação de senha. Tem de ser único na plataforma.
          </p>
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
          <CardButton type="submit" variant="primary" loading={creating}>
            {creating ? 'Criando parceiro…' : 'Criar parceiro'}
          </CardButton>
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
                <th className="px-4 py-2 text-left">Saldo publicidade</th>
                <th className="px-4 py-2 text-left">Links de contacto</th>
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
                  <td className="px-4 py-2 text-zinc-700">
                    {p.user.email ? (
                      <span className="break-all">{p.user.email}</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
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
                  <td className="px-4 py-2 align-top">
                    <p className="font-medium tabular-nums text-zinc-900">
                      {formatAdvertisingBalanceEur(p.advertisingBalanceEurCents ?? 0)}
                    </p>
                    {p.category?.slug === 'relocation' ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Novo saldo €"
                          title="Saldo em euros (ex.: 25 ou 25,50)"
                          value={
                            balanceInputByPartnerId[p.id] ??
                            String((p.advertisingBalanceEurCents ?? 0) / 100)
                          }
                          onChange={(e) =>
                            setBalanceInputByPartnerId((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="w-20 rounded border border-zinc-300 px-2 py-1 text-xs tabular-nums"
                        />
                        <button
                          type="button"
                          disabled={savingBalancePartnerId === p.id}
                          onClick={async () => {
                            const displayed =
                              balanceInputByPartnerId[p.id] ??
                              String((p.advertisingBalanceEurCents ?? 0) / 100);
                            const raw = displayed.trim().replace(',', '.');
                            const euros = Number(raw);
                            if (!Number.isFinite(euros) || euros < 0) {
                              setError('Indica um saldo válido em euros (≥ 0).');
                              return;
                            }
                            setSavingBalancePartnerId(p.id);
                            setError('');
                            try {
                              const res = await api.admin.partners.setAdvertisingBalance(
                                p.id,
                                { balanceEurCents: Math.round(euros * 100) },
                              );
                              setPartners((prev) =>
                                prev.map((row) =>
                                  row.id === p.id
                                    ? {
                                        ...row,
                                        advertisingBalanceEurCents: res.balanceEurCents,
                                      }
                                    : row,
                                ),
                              );
                              setBalanceInputByPartnerId((prev) => {
                                const next = { ...prev };
                                delete next[p.id];
                                return next;
                              });
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : 'Erro ao definir saldo.',
                              );
                            } finally {
                              setSavingBalancePartnerId(null);
                            }
                          }}
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {savingBalancePartnerId === p.id ? 'A guardar…' : 'Definir'}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">—</p>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {(() => {
                      const total = p.services.length;
                      const withLink = p.services.filter(
                        (s) => s.partnerShareLinkId,
                      ).length;
                      const heroClicks = p.heroShareLink?._count.clicks ?? 0;
                      const configured =
                        Boolean(p.heroShareLink) &&
                        (total === 0 || withLink === total);
                      return (
                        <div className="min-w-[10rem] space-y-2">
                          <p className="text-xs text-zinc-600">
                            {configured ? (
                              <span className="font-medium text-emerald-800">
                                Configurado
                              </span>
                            ) : (
                              <span className="text-amber-800">Por configurar</span>
                            )}
                          </p>
                          <p className="text-[11px] leading-snug text-zinc-500">
                            Hero:{' '}
                            {p.heroShareLink ? (
                              <>
                                <code className="rounded bg-zinc-100 px-1">
                                  {p.heroShareLink.slug}
                                </code>
                                {' · '}
                                {heroClicks} clique{heroClicks === 1 ? '' : 's'}
                              </>
                            ) : (
                              '—'
                            )}
                          </p>
                          {total > 0 ? (
                            <p className="text-[11px] text-zinc-500">
                              Serviços: {withLink}/{total} com link
                            </p>
                          ) : null}
                          <CardButton
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={settingUpLinksPartnerId === p.id}
                            disabled={settingUpLinksPartnerId !== null}
                            onClick={async () => {
                              setSettingUpLinksPartnerId(p.id);
                              setError('');
                              try {
                                await api.admin.partners.setupContactLinks(p.id);
                                const fresh = await api.admin.partners.list();
                                setPartners(fresh);
                              } catch (err) {
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : 'Erro ao configurar links de contacto.',
                                );
                              } finally {
                                setSettingUpLinksPartnerId(null);
                              }
                            }}
                          >
                            {configured ? 'Atualizar links' : 'Gerar links'}
                          </CardButton>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <CardButton
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
                      variant="outline"
                      size="sm"
                      className="mr-2"
                    >
                      Logar
                    </CardButton>
                    <CardButton
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Tem certeza que deseja remover este parceiro? Esta ação é irreversível.\n\nNome: ${p.name}\nWhatsApp: ${p.whatsapp}\nCategoria: ${p.category?.name ?? '—'}`,
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
                      variant="danger"
                      size="sm"
                    >
                      Remover
                    </CardButton>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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

