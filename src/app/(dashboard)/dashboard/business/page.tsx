'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';
import { PartnerServicesManager } from '@/components/partner/PartnerServicesManager';

export default function BusinessPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessError, setAccessError] = useState('');
  const [accessSuccess, setAccessSuccess] = useState('');

  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [catalogImageUrls, setCatalogImageUrls] = useState<string[]>([]);
  const [catalogVideoUrl, setCatalogVideoUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingNif, setBillingNif] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingCatalogIdx, setUploadingCatalogIdx] = useState<number | null>(null);
  const [uploadingCatalogVideo, setUploadingCatalogVideo] = useState(false);
  const [pageLinks, setPageLinks] = useState<Awaited<
    ReturnType<typeof api.partner.contactLinks>
  > | null>(null);
  const [pageLinksLoading, setPageLinksLoading] = useState(false);

  const [accountEmail, setAccountEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  function absoluteRedirectPath(path: string): string {
    const base =
      (typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')) || '';
    return base ? `${base}${path}` : path;
  }

  function buildPartnerUpdatePayload(
    overrides: Partial<{
      catalogImageUrls: string[];
      catalogVideoUrl: string;
    }> = {},
  ) {
    return {
      name: name.trim(),
      whatsapp: whatsapp.trim() || undefined,
      logoUrl: logoUrl || undefined,
      shortDescription: shortDescription || undefined,
      fullDescription: fullDescription || undefined,
      backgroundImageUrl: backgroundImageUrl || undefined,
      catalogImageUrls: catalogImageUrls.length ? catalogImageUrls : undefined,
      catalogVideoUrl: catalogVideoUrl.trim() || '',
      instagram: instagram || undefined,
      billingName: billingName.trim() || null,
      billingNif: billingNif.trim() || null,
      billingAddress: billingAddress.trim() || null,
      billingPostalCode: billingPostalCode.trim() || null,
      ...overrides,
    };
  }

  const totalPageLinkClicks = (() => {
    const hero = pageLinks?.hero?.clickCount ?? 0;
    const services = (pageLinks?.services ?? [])
      .filter((s) => s.link)
      .reduce((sum, s) => sum + (s.link?.clickCount ?? 0), 0);
    return hero + services;
  })();

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        try {
          const token = getAuthToken();
          if (token) {
            const me = await api.auth.me(token);
            setAccountEmail(me.email ?? '');
          }
        } catch {
          // ignore
        }
        const data = await api.partner.me();
        setPartnerId(data.id);
        setPublicSlug(data.publicSlug?.trim() ?? '');
        setName(data.name);
        setWhatsapp(data.whatsapp || '');
        setLogoUrl(data.logoUrl ?? '');
        setShortDescription(data.shortDescription ?? '');
        setFullDescription(data.fullDescription ?? '');
        setBackgroundImageUrl(data.backgroundImageUrl ?? '');
        setCatalogImageUrls(
          Array.isArray(data.catalogImageUrls) ? data.catalogImageUrls : [],
        );
        setCatalogVideoUrl(
          typeof data.catalogVideoUrl === 'string' ? data.catalogVideoUrl : '',
        );
        setInstagram(data.instagram ?? '');
        setBillingName(data.billingName ?? '');
        setBillingNif(data.billingNif ?? '');
        setBillingAddress(data.billingAddress ?? '');
        setBillingPostalCode(data.billingPostalCode ?? '');
        setPageLinksLoading(true);
        try {
          const links = await api.partner.contactLinks();
          setPageLinks(links);
        } catch {
          setPageLinks(null);
        } finally {
          setPageLinksLoading(false);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar dados da empresa.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  if (user.role !== 'PARTNER') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minha empresa</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta área é exclusiva para parceiros da Comunidade Rafa Portugal.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updated = await api.partner.updateMe({
        ...buildPartnerUpdatePayload(),
        publicSlug: publicSlug.trim() === '' ? null : publicSlug.trim(),
      });

      setPublicSlug(updated.publicSlug?.trim() ?? '');
      setName(updated.name);
      setWhatsapp(updated.whatsapp || '');
      setLogoUrl(updated.logoUrl ?? '');
      setShortDescription(updated.shortDescription ?? '');
      setFullDescription(updated.fullDescription ?? '');
      setBackgroundImageUrl(updated.backgroundImageUrl ?? '');
      setCatalogImageUrls(
        Array.isArray(updated.catalogImageUrls) ? updated.catalogImageUrls : [],
      );
      setCatalogVideoUrl(
        typeof updated.catalogVideoUrl === 'string' ? updated.catalogVideoUrl : '',
      );
      setInstagram(updated.instagram ?? '');
      setBillingName(updated.billingName ?? '');
      setBillingNif(updated.billingNif ?? '');
      setBillingAddress(updated.billingAddress ?? '');
      setBillingPostalCode(updated.billingPostalCode ?? '');

      setSuccess('Dados da empresa atualizados com sucesso.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar dados da empresa. Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAccessSave(e: React.FormEvent) {
    e.preventDefault();
    setAccessError('');
    setAccessSuccess('');
    setAccessSaving(true);
    try {
      const emailTrim = accountEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        throw new Error('Indica um email válido.');
      }

      await api.auth.updateMe({ email: emailTrim });

      if (newPassword || newPassword2 || currentPassword) {
        if (!currentPassword) {
          throw new Error('Indica a tua senha atual para trocar a senha.');
        }
        if (!newPassword || newPassword.length < 8) {
          throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
        }
        if (newPassword !== newPassword2) {
          throw new Error('As novas senhas não coincidem.');
        }
        await api.auth.changePassword({
          currentPassword,
          newPassword,
        });
        setCurrentPassword('');
        setNewPassword('');
        setNewPassword2('');
      }

      setAccessSuccess('Dados de acesso atualizados com sucesso.');
    } catch (err) {
      setAccessError(
        err instanceof Error ? err.message : 'Erro ao atualizar dados de acesso.',
      );
    } finally {
      setAccessSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao fazer upload da logo.');
      }
      setLogoUrl(`${API_URL}${data.url}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload da logo. Tente novamente.',
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
          : 'Erro ao fazer upload da imagem de background. Tente novamente.',
      );
    } finally {
      setUploadingBackground(false);
    }
  }

  async function saveCatalogImages(newUrls: string[]) {
    const updated = await api.partner.updateMe(
      buildPartnerUpdatePayload({ catalogImageUrls: newUrls }),
    );
    setName(updated.name);
    setWhatsapp(updated.whatsapp || '');
    setCatalogImageUrls(
      Array.isArray(updated.catalogImageUrls) ? updated.catalogImageUrls : [],
    );
  }

  async function handleCatalogVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    setUploadingCatalogVideo(true);
    try {
      try {
        const updated = await api.partner.uploadCatalogVideo(file);
        setCatalogVideoUrl(
          typeof updated.catalogVideoUrl === 'string' ? updated.catalogVideoUrl : '',
        );
      } catch (uploadErr: unknown) {
        const me = uploadErr as Error & { status?: number };
        if (me.status === 413) {
          throw new Error(
            'O servidor ou proxy recusou o ficheiro (413 — payload demasiado grande). Aumenta client_max_body_size no Nginx à frente da API e reinicia o proxy.',
          );
        }
        throw uploadErr;
      }
      setSuccess('Vídeo atualizado com sucesso.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao enviar vídeo. Tente novamente.',
      );
    } finally {
      setUploadingCatalogVideo(false);
    }
    e.target.value = '';
  }

  async function handleRemoveCatalogVideo() {
    setError('');
    setUploadingCatalogVideo(true);
    try {
      const updated = await api.partner.updateMe(
        buildPartnerUpdatePayload({ catalogVideoUrl: '' }),
      );
      setCatalogVideoUrl(
        typeof updated.catalogVideoUrl === 'string' ? updated.catalogVideoUrl : '',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao remover vídeo. Tente novamente.',
      );
    } finally {
      setUploadingCatalogVideo(false);
    }
  }

  async function handleCatalogUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    slotIndex: number,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (catalogImageUrls.length >= 5 && slotIndex >= catalogImageUrls.length) {
      setError('Só é possível adicionar até 5 imagens de catálogo.');
      return;
    }
    setError('');
    setUploadingCatalogIdx(slotIndex);
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
        throw new Error(data.message || 'Erro ao fazer upload da imagem.');
      }
      const newUrl = `${API_URL}${data.url}`;
      const newUrls =
        slotIndex < catalogImageUrls.length
          ? catalogImageUrls.map((u, i) => (i === slotIndex ? newUrl : u))
          : [...catalogImageUrls, newUrl];
      await saveCatalogImages(newUrls);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload. Tente novamente.',
      );
    } finally {
      setUploadingCatalogIdx(null);
    }
    e.target.value = '';
  }

  function handleRemoveCatalogImage(slotIndex: number) {
    const newUrls = catalogImageUrls.filter((_, i) => i !== slotIndex);
    saveCatalogImages(newUrls);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Minha empresa</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Se você quer ter um site gratuito para que a sua empresa seja exibida no Google, basta
        preencher as informações abaixo — em especial o{' '}
        <span className="font-medium text-zinc-800">endereço público da página (URL)</span>, que
        ativa a página pública quando estiver definido.
      </p>
      {partnerId && publicSlug.trim() ? (
        <div className="mt-4">
          <Link
            href={`/${encodeURIComponent(publicSlug.trim())}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Ver minha página no Google
          </Link>
          <p className="mt-2 text-xs text-zinc-600">
            clicks nos botões da minha página:{' '}
            <span className="font-semibold text-zinc-900">
              {pageLinksLoading ? '…' : totalPageLinkClicks}
            </span>{' '}
            click{!pageLinksLoading && totalPageLinkClicks === 1 ? '' : 's'}
          </p>
        </div>
      ) : partnerId ? (
        <p className="mt-4 text-sm text-amber-800/95">
          A página pública só fica acessível depois de definires e guardares o endereço público
          (URL) no formulário abaixo.
        </p>
      ) : null}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando dados da empresa…</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">
                Endereço público da página (URL)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-500">/</span>
                <input
                  type="text"
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value.toLowerCase())}
                  placeholder="defina para publicar (ex.: minha-empresa)"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Só letras minúsculas, números e hífens (4–80 caracteres). Enquanto estiver vazio, a
                página pública não existe. Evita palavras reservadas como «dashboard» ou «casas».
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                Nome da empresa
              </label>
              <input
                type="text"
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                WhatsApp comercial
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex.: 351912345678"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <form onSubmit={handleAccessSave} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
              <p className="text-sm font-semibold text-zinc-900">Dados de acesso</p>
              <p className="mt-1 text-xs text-zinc-600">
                Atualiza o email e/ou a senha da tua conta de parceiro.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Email da conta
                  </label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">
                    Senha atual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-zinc-700">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {accessError ? (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {accessError}
                </div>
              ) : null}
              {accessSuccess ? (
                <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {accessSuccess}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={accessSaving}
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {accessSaving ? 'A salvar…' : 'Salvar dados de acesso'}
              </button>
            </form>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                Instagram da empresa
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setInstagram('');
                  else if (v.startsWith('@')) setInstagram(v);
                  else setInstagram('@' + v);
                }}
                placeholder="@empresa"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500">
                Apenas utilizador com @ (ex: @minha_empresa)
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {logoUrl && (
              <div className="mb-2">
                <img
                  src={logoUrl}
                  alt="Logo da empresa"
                  className="h-12 w-12 rounded object-contain border border-zinc-200 bg-white"
                />
              </div>
            )}
            <label className="block text-sm font-medium text-zinc-700">
              Logo da empresa ou sua foto do perfil (upload)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block w-full text-sm text-zinc-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {uploadingLogo
                ? 'Enviando logo…'
                : logoUrl
                ? 'Logo carregada com sucesso.'
                : 'Selecione uma imagem de logo para o seu perfil de parceiro.'}
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              Breve descrição (apresentação rápida)
            </label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              Descrição completa
            </label>
            <textarea
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              Imagem de background (upload)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              className="block w-full text-sm text-zinc-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {uploadingBackground
                ? 'Enviando imagem de background…'
                : backgroundImageUrl
                ? 'Imagem de background carregada com sucesso.'
                : 'Selecione uma imagem para o banner do seu perfil de parceiro.'}
            </p>
            {backgroundImageUrl && (
              <div className="mt-2 h-56 w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundImageUrl})` }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Vídeo de apresentação (opcional)
            </label>
            <p className="text-xs text-zinc-500">
              Um único vídeo é mostrado na tua página pública{' '}
              <span className="font-medium text-zinc-600">antes</span> do carrossel de imagens,
              centrado num formato vertical semelhante ao dos stories. Formatos: MP4, MOV ou WebM.
            </p>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              disabled={uploadingCatalogVideo}
              onChange={handleCatalogVideoUpload}
              className="block w-full text-sm text-zinc-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-50"
            />
            <p className="text-xs text-zinc-500">
              {uploadingCatalogVideo
                ? 'A processar vídeo…'
                : catalogVideoUrl
                  ? 'Vídeo guardado. Podes substituir ou remover.'
                  : 'Ainda não há vídeo.'}
            </p>
            {catalogVideoUrl ? (
              <div className="space-y-2">
                <div className="mx-auto w-full max-w-[min(100%,26rem)] overflow-hidden rounded-lg border border-zinc-200 bg-black shadow-sm">
                  <video
                    src={catalogVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="mx-auto block max-h-[min(70vh,520px)] w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  disabled={uploadingCatalogVideo}
                  onClick={() => void handleRemoveCatalogVideo()}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                >
                  Remover vídeo
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Imagens de catálogo (até 5)
            </label>
            <p className="text-xs text-amber-700">
              As imagens devem ser verticais, nas mesmas dimensões dos stories do
              Instagram.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {[0, 1, 2, 3, 4].map((slotIndex) => {
                const url = catalogImageUrls[slotIndex];
                const isUploading = uploadingCatalogIdx === slotIndex;
                const canAdd =
                  catalogImageUrls.length < 5 &&
                  slotIndex <= catalogImageUrls.length;
                return (
                  <div
                    key={slotIndex}
                    className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-2"
                  >
                    <div
                      className="relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                      style={{ width: 72, aspectRatio: '9/16' }}
                    >
                      {url ? (
                        <>
                          <img
                            src={url}
                            alt={`Catálogo ${slotIndex + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                            <label className="cursor-pointer rounded bg-white/90 px-2 py-1 text-xs font-medium text-zinc-800">
                              {isUploading ? 'A enviar…' : 'Substituir'}
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={isUploading}
                                onChange={(e) => handleCatalogUpload(e, slotIndex)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveCatalogImage(slotIndex)}
                              className="rounded bg-red-500/90 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                            >
                              Remover
                            </button>
                          </div>
                        </>
                      ) : canAdd ? (
                        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-xs text-zinc-500 hover:bg-zinc-200/50">
                          {isUploading ? 'A enviar…' : '+ Adicionar'}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={isUploading}
                            onChange={(e) => handleCatalogUpload(e, slotIndex)}
                          />
                        </label>
                      ) : null}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {slotIndex + 1}/5
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <PartnerServicesManager />
          </div>

          <div>
            <CardButton type="submit" variant="secondary" loading={saving}>
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </CardButton>
          </div>
        </form>
      )}
    </div>
  );
}

