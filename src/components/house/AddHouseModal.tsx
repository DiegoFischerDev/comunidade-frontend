'use client';

import { useCallback, useEffect, useState } from 'react';
import { RelocationCityCombobox } from '@/components/relocation/RelocationCityCombobox';
import {
  HouseCreateMediaFields,
  type HouseMediaEditState,
} from '@/components/house/HouseCreateMediaFields';
import {
  HOUSE_BUSINESS_TYPES,
  HOUSE_ENTRADA_COUNT_OPTIONS,
  HOUSE_TYPOLOGIES,
  todayLocalDateInputValue,
} from '@/lib/house-form-constants';
import { api } from '@/lib/api';
import {
  isRelocationPortugalCity,
  migrateLegacyHouseCityToCanonical,
} from '@/lib/relocation-portugal-cities';

const EXTRA_RELOCATION_CITIES_STORAGE_KEY = 'relocation-extra-city-options';

function loadExtraRelocationCitiesFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(EXTRA_RELOCATION_CITIES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const out: string[] = [];
    for (const x of list) {
      const t = typeof x === 'string' ? x.trim() : '';
      if (t && !out.includes(t)) out.push(t);
    }
    return out;
  } catch {
    return [];
  }
}

function saveExtraRelocationCitiesToStorage(next: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EXTRA_RELOCATION_CITIES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function toDateInputValue(isoOrDate: string): string {
  if (!isoOrDate) return '';
  const s = typeof isoOrDate === 'string' ? isoOrDate : String(isoOrDate);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type AddHouseModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'admin' | 'partner';
  /** Quando definido, o modal abre em modo edição. */
  houseId?: string | null;
  extraCityOptions?: string[];
};

export function AddHouseModal({
  open,
  onClose,
  onSuccess,
  mode,
  houseId = null,
  extraCityOptions: extraCityOptionsProp = [],
}: AddHouseModalProps) {
  const isAdmin = mode === 'admin';
  const isEdit = Boolean(houseId?.trim());
  /** Parceiro a criar: só mídia + descrição; campos extraídos pela OpenAI no servidor. */
  const isPartnerAiCreate = !isAdmin && !isEdit;

  const [relocationPartners, setRelocationPartners] = useState<{ id: string; name: string }[]>([]);
  const [assignedPartnerId, setAssignedPartnerId] = useState('');
  const [storedExtraCities, setStoredExtraCities] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [typology, setTypology] = useState<(typeof HOUSE_TYPOLOGIES)[number]['id']>('T2');
  const [businessType, setBusinessType] = useState<(typeof HOUSE_BUSINESS_TYPES)[number]['id']>('RENT');
  const [city, setCity] = useState('');
  const [availableFrom, setAvailableFrom] = useState(() => todayLocalDateInputValue());
  const [priceEur, setPriceEur] = useState('');
  const [relocationFeeEur, setRelocationFeeEur] = useState('');
  const [caucoesCount, setCaucoesCount] = useState('0');
  const [rendasEntradaCount, setRendasEntradaCount] = useState('0');
  const [furnished, setFurnished] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [video, setVideo] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const [retainedImageUrls, setRetainedImageUrls] = useState<string[]>([]);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);

  const [loadingHouse, setLoadingHouse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const extraCityOptions = [...new Set([...extraCityOptionsProp, ...storedExtraCities])].sort((a, b) =>
    a.localeCompare(b, 'pt'),
  );

  const resetForm = useCallback(() => {
    setAssignedPartnerId('');
    setTitle('');
    setDescription('');
    setTypology('T2');
    setBusinessType('RENT');
    setCity('');
    setAvailableFrom(todayLocalDateInputValue());
    setPriceEur('');
    setRelocationFeeEur('');
    setCaucoesCount('0');
    setRendasEntradaCount('0');
    setFurnished(true);
    setImages([]);
    setCoverImageIndex(0);
    setVideo(null);
    setThumbnail(null);
    setRetainedImageUrls([]);
    setExistingVideoUrl(null);
    setExistingThumbnailUrl(null);
    setRemoveVideo(false);
    setError('');
  }, []);

  function handleClose() {
    resetForm();
    onClose();
  }

  const populateFromHouse = useCallback(
    (h: {
      title: string;
      description: string;
      businessType: 'RENT' | 'SALE';
      typology: (typeof HOUSE_TYPOLOGIES)[number]['id'];
      city: string;
      availableFrom: string;
      priceEur: string;
      relocationFeeEur: string;
      caucoesCount: number;
      rendasEntradaCount: number;
      furnished: boolean;
      imageUrls: string[];
      coverImageUrl: string | null;
      videoUrl: string | null;
      videoPosterUrl?: string | null;
      partner?: { id: string };
    }) => {
      setTitle(h.title);
      setDescription(h.description);
      setBusinessType(h.businessType);
      setTypology(h.typology);
      setCity(isAdmin ? h.city?.trim() ?? '' : migrateLegacyHouseCityToCanonical(h.city));
      setAvailableFrom(toDateInputValue(h.availableFrom));
      setPriceEur(h.priceEur);
      setRelocationFeeEur(h.relocationFeeEur);
      setCaucoesCount(String(h.caucoesCount));
      setRendasEntradaCount(String(h.rendasEntradaCount));
      setFurnished(h.furnished);
      if (h.partner?.id) setAssignedPartnerId(h.partner.id);

      const urls = [...h.imageUrls];
      setRetainedImageUrls(urls);
      if (urls.length > 0) {
        const ci =
          h.coverImageUrl && urls.includes(h.coverImageUrl) ? urls.indexOf(h.coverImageUrl) : 0;
        setCoverImageIndex(Math.min(Math.max(0, ci), urls.length - 1));
      } else {
        setCoverImageIndex(0);
      }
      setExistingVideoUrl(h.videoUrl);
      setExistingThumbnailUrl(h.videoPosterUrl ?? null);
      setRemoveVideo(false);
      setVideo(null);
      setThumbnail(null);
      setImages([]);
    },
    [isAdmin],
  );

  useEffect(() => {
    if (!open) return;
    setStoredExtraCities(loadExtraRelocationCitiesFromStorage());
  }, [open]);

  useEffect(() => {
    if (!open || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await api.admin.partners.list();
        const reloc = list
          .filter((p) => p.categorySlug === 'relocation')
          .map((p) => ({ id: p.id, name: p.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
        if (!cancelled) setRelocationPartners(reloc);
      } catch {
        if (!cancelled) setRelocationPartners([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin]);

  useEffect(() => {
    if (!open) return;
    const id = houseId?.trim();
    if (!id) {
      resetForm();
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingHouse(true);
      setError('');
      try {
        if (isAdmin) {
          const h = await api.admin.houses.get(id);
          if (!cancelled) populateFromHouse(h);
        } else {
          const h = await api.partner.houses.get(id);
          if (!cancelled) populateFromHouse(h);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar o anúncio.');
        }
      } finally {
        if (!cancelled) setLoadingHouse(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, houseId, isAdmin, populateFromHouse, resetForm]);

  const handleCityChange = (next: string) => {
    setCity(next);
    const t = next.trim();
    if (!t || isRelocationPortugalCity(t)) return;
    setStoredExtraCities((prev) => {
      if (prev.includes(t)) return prev;
      const merged = [...prev, t].sort((a, b) => a.localeCompare(b, 'pt'));
      saveExtraRelocationCitiesToStorage(merged);
      return merged;
    });
  };

  const editMedia: HouseMediaEditState | null = isEdit
    ? {
        retainedImageUrls,
        onRetainedImageUrlsChange: setRetainedImageUrls,
        existingVideoUrl,
        removeVideo,
        onRemoveVideoChange: setRemoveVideo,
        existingThumbnailUrl,
      }
    : null;

  const totalImageCount = retainedImageUrls.length + images.length;
  const hasVideoAfter = (!!existingVideoUrl && !removeVideo) || !!video;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanPrice = priceEur.trim();
    const cleanRelocation = relocationFeeEur.trim().replace(/\s*€\s*$/i, '').trim();
    const cleanCity = city.trim();
    const id = houseId?.trim();

    if (isPartnerAiCreate) {
      if (!cleanDesc || cleanDesc.length < 20) {
        return setError(
          'Escreve uma descrição com pelo menos 20 caracteres (tipologia, cidade, preço, mobilado, etc.).',
        );
      }
      if (images.length === 0 && !video) {
        return setError('Adiciona pelo menos 1 imagem ou 1 vídeo.');
      }
    } else if (!isAdmin || isEdit) {
      if (!cleanTitle) return setError('Preenche o título do imóvel.');
      if (!cleanDesc) return setError('Preenche a descrição.');
      if (!cleanCity) return setError('Preenche a cidade.');
      if (!isAdmin && isEdit && !isRelocationPortugalCity(cleanCity)) {
        return setError('Escolhe uma cidade da lista.');
      }
      if (!availableFrom) return setError('Seleciona a data em "Disponível a partir".');
      if (!cleanPrice) {
        return setError(
          businessType === 'SALE' ? 'Preenche o preço de venda.' : 'Preenche o preço do arrendamento.',
        );
      }
      if (!cleanRelocation) return setError('Preenche a taxa de relocation (em euros).');
    }

    if (isEdit && !isAdmin) {
      if (totalImageCount === 0 && !hasVideoAfter) {
        return setError('Precisas de pelo menos 1 imagem ou 1 vídeo.');
      }
    }

    if (isEdit && isAdmin) {
      if (totalImageCount === 0 && !hasVideoAfter) {
        return setError('Precisas de pelo menos 1 imagem ou 1 vídeo.');
      }
    }

    if (totalImageCount > 6) return setError('Podes enviar no máximo 6 imagens.');

    setSaving(true);
    try {
      if (isEdit && id) {
        const updatePayload = {
          title: cleanTitle,
          description: cleanDesc,
          businessType,
          typology,
          city: cleanCity,
          availableFrom,
          priceEur: cleanPrice,
          relocationFeeEur: cleanRelocation,
          caucoesCount,
          rendasEntradaCount,
          furnished,
          keepImageUrls: retainedImageUrls,
          images: images.length ? images : undefined,
          video: video ?? undefined,
          ...(thumbnail && totalImageCount === 0 ? { thumbnail } : {}),
          removeVideo: removeVideo && !video ? true : undefined,
          coverImageIndex: totalImageCount > 0 ? coverImageIndex : undefined,
        };

        if (isAdmin) {
          await api.admin.houses.update(id, {
            ...updatePayload,
            partnerId: assignedPartnerId,
          });
        } else {
          await api.partner.houses.update(id, updatePayload);
        }
      } else if (isAdmin) {
        await api.admin.houses.create({
          ...(images.length ? { images } : {}),
          ...(video ? { video } : {}),
          ...(thumbnail && images.length === 0 ? { thumbnail } : {}),
          title: cleanTitle,
          description: cleanDesc,
          businessType,
          typology,
          city: cleanCity,
          availableFrom,
          priceEur: cleanPrice,
          relocationFeeEur: cleanRelocation,
          caucoesCount,
          rendasEntradaCount,
          furnished,
          ...(images.length ? { coverImageIndex } : {}),
          ...(assignedPartnerId.trim() ? { partnerId: assignedPartnerId.trim() } : {}),
        });
      } else if (isPartnerAiCreate) {
        await api.partner.houses.createFromDescription({
          description: cleanDesc,
          ...(images.length ? { images } : {}),
          ...(video ? { video } : {}),
          ...(thumbnail && images.length === 0 ? { thumbnail } : {}),
          ...(images.length ? { coverImageIndex } : {}),
        });
      } else {
        await api.partner.houses.create({
          ...(images.length ? { images } : {}),
          ...(video ? { video } : {}),
          ...(thumbnail && images.length === 0 ? { thumbnail } : {}),
          title: cleanTitle,
          description: cleanDesc,
          businessType,
          typology,
          city: cleanCity,
          availableFrom,
          priceEur: cleanPrice,
          relocationFeeEur: cleanRelocation,
          caucoesCount,
          rendasEntradaCount,
          furnished,
          ...(images.length ? { coverImageIndex } : {}),
        });
      }
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar o anúncio.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              {isEdit ? 'Editar casa' : 'Adicionar casa'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Fechar
          </button>
        </div>

        {loadingHouse ? (
          <p className="py-8 text-center text-sm text-zinc-600">A carregar anúncio…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin ? (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-zinc-700">
                  Parceiro relocation (titular do anúncio)
                </span>
                <select
                  value={assignedPartnerId}
                  onChange={(e) => setAssignedPartnerId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">Administrador — conta relocation interna</option>
                  {relocationPartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <HouseCreateMediaFields
              idPrefix={isAdmin ? 'admin-house' : 'partner-house'}
              images={images}
              onImagesChange={setImages}
              coverImageIndex={coverImageIndex}
              onCoverImageIndexChange={setCoverImageIndex}
              video={video}
              onVideoChange={setVideo}
              thumbnail={thumbnail}
              onThumbnailChange={setThumbnail}
              showThumbnail
              editMedia={editMedia}
            />

            {!isPartnerAiCreate ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Título</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Ex.: T2 mobilado no Porto"
                  />
                </label>
                <div className="text-sm">
                  <RelocationCityCombobox
                    id={isAdmin ? 'admin-house-city' : 'partner-house-city'}
                    label="Cidade"
                    labelClassName="mb-1 block text-xs font-medium text-zinc-700"
                    value={city}
                    onChange={isAdmin ? setCity : handleCityChange}
                    allowEmpty={isAdmin && !isEdit}
                    allowCustomValue
                    extraCityOptions={extraCityOptions}
                    placeholder="Pesquisar cidade…"
                    variant={isAdmin ? 'amber' : 'blue'}
                    required={!isAdmin || isEdit}
                  />
                </div>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Tipologia</span>
                  <select
                    value={typology}
                    onChange={(e) => setTypology(e.target.value as (typeof HOUSE_TYPOLOGIES)[number]['id'])}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {HOUSE_TYPOLOGIES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Finalidade</span>
                  <select
                    value={businessType}
                    onChange={(e) =>
                      setBusinessType(e.target.value as (typeof HOUSE_BUSINESS_TYPES)[number]['id'])
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {HOUSE_BUSINESS_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Disponível a partir</span>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">
                    {businessType === 'SALE' ? 'Preço de venda (EUR)' : 'Renda mensal (EUR)'}
                  </span>
                  <input
                    value={priceEur}
                    onChange={(e) => setPriceEur(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Taxa relocation (EUR)</span>
                  <input
                    value={relocationFeeEur}
                    onChange={(e) => setRelocationFeeEur(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-zinc-700">Cauções</span>
                    <select
                      value={caucoesCount}
                      onChange={(e) => setCaucoesCount(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {HOUSE_ENTRADA_COUNT_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-zinc-700">Rendas antecipadas</span>
                    <select
                      value={rendasEntradaCount}
                      onChange={(e) => setRendasEntradaCount(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {HOUSE_ENTRADA_COUNT_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={furnished}
                    onChange={(e) => setFurnished(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Imóvel mobilado
                </label>
              </div>
            ) : null}

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-700">
                {isPartnerAiCreate ? 'Descrição do imóvel' : 'Descrição'}
              </span>
              {isPartnerAiCreate ? (
                <p className="mb-2 text-xs text-zinc-500">
                  Inclui tipologia, cidade, preço, mobilado, cauções, data de entrada, etc. Ao publicar, a IA
                  preenche automaticamente o resto do anúncio.
                </p>
              ) : null}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={isPartnerAiCreate ? 8 : 4}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder={
                  isPartnerAiCreate
                    ? 'Ex.: T2 mobilado no Porto, renda 950€, 2 cauções, entrada 1 de julho, taxa relocation 500€…'
                    : isAdmin
                      ? undefined
                      : 'Detalha localização, mobilado, despesas incluídas, duração mínima, etc.'
                }
              />
            </label>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || loadingHouse}
                className="rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving
                  ? isPartnerAiCreate
                    ? 'A analisar com IA…'
                    : 'A guardar…'
                  : isEdit
                    ? 'Guardar alterações'
                    : isAdmin
                      ? 'Guardar anúncio'
                      : 'Publicar imóvel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
