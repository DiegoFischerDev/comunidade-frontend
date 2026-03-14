'use client';

import { useEffect, useState } from 'react';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PartnerProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [catalogImageUrls, setCatalogImageUrls] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingCatalogIdx, setUploadingCatalogIdx] = useState<number | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await api.partner.me();
        setName(data.name);
        setWhatsapp(data.whatsapp);
        setLogoUrl(data.logoUrl ?? '');
        setShortDescription(data.shortDescription ?? '');
        setFullDescription(data.fullDescription ?? '');
        setBackgroundImageUrl(data.backgroundImageUrl ?? '');
        setCatalogImageUrls(Array.isArray(data.catalogImageUrls) ? data.catalogImageUrls : []);
        setInstagram(data.instagram ?? '');
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar perfil do parceiro.',
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
        <h1 className="text-2xl font-semibold text-zinc-900">Meu perfil</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta área é exclusiva para parceiros.
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
        logoUrl: logoUrl || undefined,
        shortDescription: shortDescription || undefined,
        fullDescription: fullDescription || undefined,
        backgroundImageUrl: backgroundImageUrl || undefined,
        catalogImageUrls: catalogImageUrls.length ? catalogImageUrls : undefined,
        instagram: instagram || undefined,
      });

      setLogoUrl(updated.logoUrl ?? '');
      setShortDescription(updated.shortDescription ?? '');
      setFullDescription(updated.fullDescription ?? '');
      setBackgroundImageUrl(updated.backgroundImageUrl ?? '');
      setCatalogImageUrls(Array.isArray(updated.catalogImageUrls) ? updated.catalogImageUrls : []);
      setInstagram(updated.instagram ?? '');

      setSuccess('Perfil atualizado com sucesso.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar perfil. Tente novamente.',
      );
    } finally {
      setSaving(false);
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
          : 'Erro ao fazer upload da logo. Tente novamente.',
      );
    } finally {
      setUploadingLogo(false);
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
          : 'Erro ao fazer upload da imagem de background. Tente novamente.',
      );
    } finally {
      setUploadingBackground(false);
    }
  }

  async function saveCatalogImages(newUrls: string[]) {
    const updated = await api.partner.updateMe({
      logoUrl: logoUrl || undefined,
      shortDescription: shortDescription || undefined,
      fullDescription: fullDescription || undefined,
      backgroundImageUrl: backgroundImageUrl || undefined,
      catalogImageUrls: newUrls,
      instagram: instagram || undefined,
    });
    setCatalogImageUrls(Array.isArray(updated.catalogImageUrls) ? updated.catalogImageUrls : []);
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
      <h1 className="text-2xl font-semibold text-zinc-900">Meu perfil</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Ajuste as informações que aparecerão na sua área de parceiro dentro da
        Comunidade RPM. Algumas informações (como categoria e comissão) são
        configuradas pelo time RPM.
      </p>

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
        <p className="mt-4 text-sm text-zinc-600">Carregando perfil…</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                Nome do parceiro
              </label>
              <input
                type="text"
                value={name}
                disabled
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-zinc-700">
                WhatsApp (definido no cadastro)
              </label>
              <input
                type="text"
                value={whatsapp}
                disabled
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">
                Instagram
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
                placeholder="@utilizador"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500">Apenas utilizador com @ (ex: @minha_conta)</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              Logo (upload)
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
                : 'Selecione uma imagem de logo para o seu perfil de parceiro.'}
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
              className="block w-full text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {uploadingBackground
                ? 'Enviando imagem de background…'
                : backgroundImageUrl
                ? 'Imagem de background carregada com sucesso.'
                : 'Selecione uma imagem para o banner do seu perfil de parceiro.'}
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Imagens de catálogo (até 5)
            </label>
            <p className="text-xs text-amber-700">
              Que as imagens devem ser verticais nas mesmas dimensões dos stories do Instagram.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {[0, 1, 2, 3, 4].map((slotIndex) => {
                const url = catalogImageUrls[slotIndex];
                const isUploading = uploadingCatalogIdx === slotIndex;
                const canAdd = catalogImageUrls.length < 5 && slotIndex <= catalogImageUrls.length;
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
                    <span className="text-xs text-zinc-500">{slotIndex + 1}/5</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

