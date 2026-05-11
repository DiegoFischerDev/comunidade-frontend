"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RelocationCityCombobox } from "@/components/relocation/RelocationCityCombobox";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton, CardLinkButton } from "@/components/ui/CardButton";
import { migrateLegacyHouseCityToCanonical } from "@/lib/relocation-portugal-cities";

const TYPOLOGIES = [
  { id: "T0", label: "T0" },
  { id: "T1", label: "T1" },
  { id: "T2", label: "T2" },
  { id: "T3", label: "T3" },
  { id: "T4", label: "T4" },
  { id: "T5", label: "T5" },
  { id: "QUARTO_AP_COMPARTILHADO", label: "Quarto em Ap compartilhado" },
] as const;
const BUSINESS_TYPES = [
  { id: "RENT", label: "Arrendamento" },
  { id: "SALE", label: "Venda" },
] as const;

const STATUS_OPTIONS = [
  { id: "AVAILABLE" as const, label: "Disponível" },
  { id: "RESERVED" as const, label: "Reservado" },
  { id: "UNAVAILABLE" as const, label: "Indisponível" },
];

const ENTRADA_COUNT_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i));

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function resolveMediaUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function toDateInputValue(isoOrDate: string): string {
  if (!isoOrDate) return "";
  const s = typeof isoOrDate === "string" ? isoOrDate : String(isoOrDate);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminEditHousePage() {
  const params = useParams();
  const houseId = typeof params.houseId === "string" ? params.houseId : "";
  const router = useRouter();
  const { user } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [numericHouseId, setNumericHouseId] = useState<number | null>(null);
  const [relocationPartners, setRelocationPartners] = useState<{ id: string; name: string }[]>([]);
  const [assignedPartnerId, setAssignedPartnerId] = useState("");
  const [extraRelocationCities, setExtraRelocationCities] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typology, setTypology] = useState<(typeof TYPOLOGIES)[number]["id"]>("T2");
  const [businessType, setBusinessType] = useState<(typeof BUSINESS_TYPES)[number]["id"]>("RENT");
  const [city, setCity] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [relocationFeeEur, setRelocationFeeEur] = useState("");
  const [caucoesCount, setCaucoesCount] = useState("0");
  const [rendasEntradaCount, setRendasEntradaCount] = useState("0");
  const [furnished, setFurnished] = useState(false);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["id"]>("AVAILABLE");

  const [retainedImageUrls, setRetainedImageUrls] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [video, setVideo] = useState<File | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const newImagePreviews = useMemo(
    () => newImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [newImages],
  );

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [newImagePreviews]);

  const videoPreviewUrl = useMemo(
    () => (video ? URL.createObjectURL(video) : null),
    [video],
  );

  const thumbnailPreviewUrl = useMemo(
    () => (thumbnail ? URL.createObjectURL(thumbnail) : null),
    [thumbnail],
  );

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    if (!houseId || !user || user.role !== "ADMIN") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const h = await api.admin.houses.get(houseId);
        if (cancelled) return;
        setNumericHouseId(h.houseId);
        const cat = h.partner.category?.name?.trim();
        setPartnerLabel(cat ? `${h.partner.name} · ${cat}` : h.partner.name);
        setAssignedPartnerId(h.partner.id);
        setTitle(h.title);
        setDescription(h.description);
        setBusinessType(h.businessType);
        setTypology(h.typology);
        // Admin pode guardar cidades fora da lista fixa — manter o valor gravado.
        setCity(h.city?.trim?.() ? h.city.trim() : "");
        setAvailableFrom(toDateInputValue(h.availableFrom));
        setPriceEur(h.priceEur);
        setRelocationFeeEur(h.relocationFeeEur);
        setCaucoesCount(String(h.caucoesCount));
        setRendasEntradaCount(String(h.rendasEntradaCount));
        setFurnished(h.furnished);
        setStatus(h.status);
        const urls = [...h.imageUrls];
        setRetainedImageUrls(urls);
        if (urls.length > 0) {
          const ci =
            h.coverImageUrl && urls.includes(h.coverImageUrl)
              ? urls.indexOf(h.coverImageUrl)
              : 0;
          setCoverImageIndex(Math.min(Math.max(0, ci), urls.length - 1));
        } else {
          setCoverImageIndex(0);
        }
        setExistingVideoUrl(h.videoUrl);
        setExistingThumbnailUrl(h.videoPosterUrl ?? null);
        setRemoveVideo(false);
        setVideo(null);
        setThumbnail(null);
        setNewImages([]);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [houseId, user]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    (async () => {
      try {
        const list = await api.admin.partners.list();
        const reloc = list
          .filter((p) => p.category?.slug === "relocation")
          .map((p) => ({ id: p.id, name: p.name }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
        setRelocationPartners(reloc);
      } catch {
        setRelocationPartners([]);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    (async () => {
      try {
        const res = await api.admin.relocationCities.list();
        setExtraRelocationCities(Array.isArray(res.cities) ? res.cities : []);
      } catch {
        setExtraRelocationCities([]);
      }
    })();
  }, [user]);

  const totalImageCount = retainedImageUrls.length + newImages.length;
  useEffect(() => {
    if (totalImageCount === 0) return;
    setCoverImageIndex((i) => Math.min(i, totalImageCount - 1));
  }, [totalImageCount]);

  function addImageFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;
    setNewImages((prev) => [...prev, ...incoming].slice(0, 6));
  }

  function removeNewImageAt(index: number) {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeRetainedAt(url: string) {
    setRetainedImageUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanPrice = priceEur.trim();
    const cleanRelocation = relocationFeeEur.trim().replace(/\s*€\s*$/i, "").trim();
    const cleanCity = city.trim();

    if (!cleanTitle) return setError("Preenche o título do imóvel.");
    if (!cleanDesc) return setError("Preenche a descrição.");
    if (!cleanCity) return setError("Preenche a cidade.");
    if (cleanCity.length > 120) {
      return setError("O nome da cidade não pode ter mais de 120 caracteres.");
    }
    if (!availableFrom) return setError('Seleciona a data em "Disponível em".');
    if (!cleanPrice) return setError(businessType === "SALE" ? "Preenche o preço de venda." : "Preenche o preço do arrendamento.");
    if (!cleanRelocation) return setError("Preenche a taxa de relocation (em euros).");

    const totalImages = retainedImageUrls.length + newImages.length;
    const hasVideoAfter = (!!existingVideoUrl && !removeVideo) || !!video;
    if (totalImages > 6) return setError("No máximo 6 imagens no total.");
    if (totalImages === 0 && !hasVideoAfter) {
      return setError("Precisas de pelo menos 1 imagem ou 1 vídeo.");
    }

    setSaving(true);
    try {
      await api.admin.houses.update(houseId, {
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
        status,
        partnerId: assignedPartnerId,
        keepImageUrls: retainedImageUrls,
        images: newImages.length ? newImages : undefined,
        video: video ?? undefined,
        thumbnail: thumbnail ?? undefined,
        removeVideo: removeVideo && !video ? true : undefined,
        coverImageIndex: totalImages > 0 ? coverImageIndex : undefined,
      });
      router.push("/dashboard/admin/houses?updated=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  if (user.role !== "ADMIN") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
        <p className="mt-2 text-sm text-zinc-600">Esta área é exclusiva para administradores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
        <p className="mt-4 text-sm text-zinc-600">A carregar dados…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
        <CardLinkButton href="/dashboard/admin/houses" variant="outline" className="mt-4">
          Voltar
        </CardLinkButton>
      </div>
    );
  }

  const showExistingVideo = existingVideoUrl && !removeVideo && !video;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel (admin)</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {partnerLabel ? (
              <>
                Parceiro: <span className="font-medium text-zinc-800">{partnerLabel}</span>
                {numericHouseId != null ? (
                  <>
                    {" "}
                    · Id: <span className="font-mono tabular-nums">{numericHouseId}</span>
                  </>
                ) : null}
              </>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            As alterações refletem-se na página pública e nas listagens.
          </p>
        </div>
        <CardLinkButton href="/dashboard/admin/houses" variant="outline">
          Voltar
        </CardLinkButton>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-zinc-700">Estado do anúncio</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number]["id"])}
            className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700">
            Parceiro relocation (titular do anúncio)
          </label>
          <select
            value={assignedPartnerId}
            onChange={(e) => setAssignedPartnerId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Administrador — conta relocation interna</option>
            {relocationPartners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Ao alterar, o contacto na página pública passa a ser o WhatsApp do parceiro escolhido.
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-700">Fotos</span>
          <p className="mt-1 text-xs text-zinc-500">
            Remove ou adiciona (máx. 6). Escolhe a <strong className="font-semibold">foto principal</strong> para
            pré-visualização ao partilhar o link.
          </p>
          <div className="mt-4 space-y-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addImageFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <CardButton
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              disabled={totalImageCount >= 6}
            >
              Adicionar imagens
            </CardButton>
            {totalImageCount > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {retainedImageUrls.map((url, i) => (
                  <div
                    key={url}
                    className={`relative aspect-video overflow-hidden rounded-xl border bg-zinc-100 ${
                      coverImageIndex === i ? "border-amber-500 ring-2 ring-amber-400/50" : "border-zinc-200"
                    }`}
                  >
                    <img src={resolveMediaUrl(url)} alt="" className="h-full w-full object-cover" />
                    <label className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <input
                        type="radio"
                        name="cover-admin-edit"
                        className="accent-amber-400"
                        checked={coverImageIndex === i}
                        onChange={() => setCoverImageIndex(i)}
                      />
                      Principal
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRetainedAt(url)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
                      aria-label="Remover"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {newImagePreviews.map((p, i) => {
                  const idx = retainedImageUrls.length + i;
                  return (
                    <div
                      key={`${p.file.name}-${i}`}
                      className={`relative aspect-video overflow-hidden rounded-xl border bg-zinc-100 ${
                        coverImageIndex === idx ? "border-amber-500 ring-2 ring-amber-400/50" : "border-zinc-200"
                      }`}
                    >
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      <label className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        <input
                          type="radio"
                          name="cover-admin-edit"
                          className="accent-amber-400"
                          checked={coverImageIndex === idx}
                          onChange={() => setCoverImageIndex(idx)}
                        />
                        Principal
                      </label>
                      <button
                        type="button"
                        onClick={() => removeNewImageAt(i)}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-700">Vídeo</span>
          {showExistingVideo ? (
            <div className="mt-2 space-y-2">
              <div className="overflow-hidden rounded-xl bg-black">
                <video
                  src={resolveMediaUrl(existingVideoUrl!)}
                  className="max-h-64 w-full object-contain"
                  controls
                  playsInline
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={removeVideo}
                  onChange={(e) => {
                    setRemoveVideo(e.target.checked);
                    if (e.target.checked) setVideo(null);
                  }}
                />
                Remover vídeo atual
              </label>
            </div>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">Sem vídeo.</p>
          )}
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/3gpp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setVideo(f);
              if (f) {
                setRemoveVideo(false);
              }
            }}
            className="mt-2 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
          />
          {videoPreviewUrl ? (
            <div className="mt-3 overflow-hidden rounded-xl bg-black">
              <video src={videoPreviewUrl} className="max-h-64 w-full object-contain" controls playsInline />
            </div>
          ) : null}
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-700">Thumbnail (opcional)</span>
          <p className="mt-1 text-xs text-zinc-500">
            Usada apenas no preview da lista e nos cards públicos (quando não houver fotos).
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
          />
          {thumbnailPreviewUrl ? (
            <img
              src={thumbnailPreviewUrl}
              alt="Preview thumbnail"
              className="mt-3 h-28 w-40 rounded-md border border-zinc-200 object-cover"
            />
          ) : existingThumbnailUrl ? (
            <img
              src={resolveMediaUrl(existingThumbnailUrl)}
              alt="Thumbnail atual"
              className="mt-3 h-28 w-40 rounded-md border border-zinc-200 object-cover"
            />
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-700">Mobilado?</span>
          <div className="mt-2 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" checked={furnished} onChange={() => setFurnished(true)} />
              Sim
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" checked={!furnished} onChange={() => setFurnished(false)} />
              Não
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700">Finalidade</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as (typeof BUSINESS_TYPES)[number]["id"])}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {BUSINESS_TYPES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <RelocationCityCombobox
              id="admin-house-city-edit"
              label="Cidade"
              labelClassName="block text-xs font-medium text-zinc-700"
              value={city}
              onChange={setCity}
              allowEmpty={false}
              allowCustomValue
              extraCityOptions={extraRelocationCities}
              placeholder="Pesquisar cidade…"
              variant="blue"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Tipologia</label>
            <select
              value={typology}
              onChange={(e) => setTypology(e.target.value as (typeof TYPOLOGIES)[number]["id"])}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {TYPOLOGIES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700">Disponível em</label>
          <input
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700">
              {businessType === "SALE" ? "Preço de venda" : "Renda mensal"}
            </label>
            <input
              value={priceEur}
              onChange={(e) => setPriceEur(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">Taxa de relocation</label>
            <input
              value={relocationFeeEur}
              onChange={(e) => setRelocationFeeEur(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700">N.º cauções</label>
            <select
              value={caucoesCount}
              onChange={(e) => setCaucoesCount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {ENTRADA_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">N.º rendas antecipadas</label>
            <select
              value={rendasEntradaCount}
              onChange={(e) => setRendasEntradaCount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {ENTRADA_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex justify-end">
          <CardButton type="submit" variant="primary" disabled={saving}>
            {saving ? "A guardar…" : "Guardar alterações"}
          </CardButton>
        </div>
      </form>
    </div>
  );
}
