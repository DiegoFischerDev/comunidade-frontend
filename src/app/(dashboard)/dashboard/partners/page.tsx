'use client';

import { useEffect, useState } from 'react';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';
import { PARTNER_CATEGORIES, partnerCategoryName } from '@/lib/partner-categories';

type PartnerRow = {
  id: string;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  user: { id: string; email: string | null; role: string };
  categorySlug: string | null;
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
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(
    null,
  );

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
        const partnersData = await api.admin.partners.list();
        setPartners(partnersData);
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
        <h1 className="text-2xl font-semibold text-foreground">Parceiros</h1>
        <p className="mt-2 text-sm text-muted">
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
          user: result.user,
          categorySlug: null,
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
      <h1 className="text-2xl font-semibold text-foreground">Parceiros</h1>
      <p className="mt-2 text-muted">
        Gerencie parceiros da plataforma (criação e remoção).
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreatePartner}
        className="mt-6 grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-2"
      >
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground/90">
            Senha inicial
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground/90">
            Nome
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground/90">
            E-mail da conta (opcional)
          </label>
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parceiro@exemplo.com"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
          <p className="text-xs text-muted">
            Se preencheres, o parceiro poderá usar este e-mail para login e recuperação de senha. Tem de ser único na plataforma.
          </p>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground/90">
            WhatsApp (com DDI)
          </label>
          <input
            type="text"
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-sm font-medium text-foreground/90">
            Logo do parceiro
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary-1 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground/90 hover:file:bg-zinc-200"
          />
          <p className="mt-1 text-xs text-muted">
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
                className="h-12 w-12 rounded object-contain border border-border bg-card"
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
        <p className="mt-4 text-sm text-muted">Carregando parceiros…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-page text-muted">
              <tr>
                <th className="px-4 py-2 text-left">Logo</th>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">WhatsApp</th>
                <th className="px-4 py-2 text-left">Categoria</th>
                <th className="px-4 py-2 text-left">Links de contacto</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    {resolveLogo(p.logoUrl) ? (
                      <img
                        src={resolveLogo(p.logoUrl) as string}
                        alt={p.name}
                        className="h-8 w-8 rounded object-contain"
                      />
                    ) : (
                      <span className="text-muted/80">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-foreground/90">
                    {p.user.email ? (
                      <span className="break-all">{p.user.email}</span>
                    ) : (
                      <span className="text-muted/80">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.whatsapp}</td>
                  <td className="px-4 py-2">
                    <select
                      value={p.categorySlug ?? ''}
                      onChange={async (e) => {
                        const newCategorySlug = e.target.value || null;
                        setUpdatingCategoryId(p.id);
                        setError('');
                        try {
                          const updated = await api.admin.partners.update(
                            p.id,
                            { categorySlug: newCategorySlug },
                          );
                          setPartners((prev) =>
                            prev.map((row) =>
                              row.id === p.id
                                ? { ...row, categorySlug: updated.categorySlug }
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
                      className="w-full rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                    >
                      <option value="">Sem categoria</option>
                      {PARTNER_CATEGORIES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
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
                          <p className="text-xs text-muted">
                            {configured ? (
                              <span className="font-medium text-emerald-800">
                                Configurado
                              </span>
                            ) : (
                              <span className="text-brand-primary">Por configurar</span>
                            )}
                          </p>
                          <p className="text-[11px] leading-snug text-muted">
                            Hero:{' '}
                            {p.heroShareLink ? (
                              <>
                                <code className="rounded bg-primary-1 px-1">
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
                            <p className="text-[11px] text-muted">
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
                            `Tem certeza que deseja remover este parceiro? Esta ação é irreversível.\n\nNome: ${p.name}\nWhatsApp: ${p.whatsapp}\nCategoria: ${partnerCategoryName(p.categorySlug) ?? '—'}`,
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
                    className="px-4 py-4 text-center text-sm text-muted"
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

