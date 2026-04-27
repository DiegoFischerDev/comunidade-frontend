"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton, CardLinkButton } from "@/components/ui/CardButton";

const CITIES = [
  { id: "INTERIOR", label: "Interior" },
  { id: "LISBOA", label: "Lisboa" },
  { id: "PORTO", label: "Porto" },
  { id: "BRAGA", label: "Braga" },
  { id: "COIMBRA", label: "Coimbra" },
  { id: "AVEIRO", label: "Aveiro" },
  { id: "FARO", label: "Faro" },
  { id: "ALGARVE", label: "Algarve" },
  { id: "EVORA", label: "Évora" },
  { id: "VISEU", label: "Viseu" },
] as const;

const TYPOLOGIES = [
  { id: "T1", label: "T1" },
  { id: "T2", label: "T2" },
  { id: "T3", label: "T3" },
  { id: "T4", label: "T4" },
  { id: "T5", label: "T5" },
  { id: "QUARTO_AP_COMPARTILHADO", label: "Quarto em Ap compartilhado" },
] as const;

const ENTRADA_COUNT_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i));

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function resolveMediaUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export default function EditHousePage() {
  const params = useParams();
  const houseId = typeof params.houseId === "string" ? params.houseId : "";
  const router = useRouter();
  const { user } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [relocationGate, setRelocationGate] = useState<"loading" | "ok" | "no">("loading");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typology, setTypology] = useState<(typeof TYPOLOGIES)[number]["id"]>("T2");
  const [city, setCity] = useState<string>(CITIES[0].id);
  const [availableFrom, setAvailableFrom] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [relocationFeeEur, setRelocationFeeEur] = useState("");
  const [caucoesCount, setCaucoesCount] = useState("0");
  const [rendasEntradaCount, setRendasEntradaCount] = useState("0");
  const [furnished, setFurnished] = useState(false);

  const [retainedImageUrls, setRetainedImageUrls] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  /** Índice na ordem [retidas…, novas…] — alinhado ao backend. */
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [video, setVideo] = useState<File | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    if (!user || user.role !== "PARTNER") {
      setRelocationGate("ok");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.partner.me();
        if (!cancelled) {
          setRelocationGate(me.category?.slug === "relocation" ? "ok" : "no");
        }
      } catch {
        if (!cancelled) setRelocationGate("no");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!houseId || !user || user.role !== "PARTNER" || relocationGate !== "ok") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const h = await api.partner.houses.get(houseId);
        if (cancelled) return;
        setTitle(h.title);
        setDescription(h.description);
        setTypology(h.typology);
        setCity(h.city);
        setAvailableFrom(h.availableFrom.slice(0, 10));
        setPriceEur(h.priceEur);
        setRelocationFeeEur(h.relocationFeeEur);
        setCaucoesCount(String(h.caucoesCount));
        setRendasEntradaCount(String(h.rendasEntradaCount));
        setFurnished(h.furnished);
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
        setRemoveVideo(false);
        setVideo(null);
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
  }, [houseId, user, relocationGate]);

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

    if (!cleanTitle) return setError("Preenche o título do imóvel.");
    if (!cleanDesc) return setError("Preenche a descrição.");
    if (!availableFrom) return setError('Seleciona a data em "Disponível em".');
    if (!cleanPrice) return setError("Preenche o preço do arrendamento.");
    if (!cleanRelocation) return setError("Preenche a taxa de relocation (em euros).");

    const totalImages = retainedImageUrls.length + newImages.length;
    const hasVideoAfter =
      (!!existingVideoUrl && !removeVideo) || !!video;
    if (totalImages > 6) return setError("No máximo 6 imagens no total.");
    if (totalImages === 0 && !hasVideoAfter) {
      return setError("Precisas de pelo menos 1 imagem ou 1 vídeo.");
    }

    setSaving(true);
    try {
      await api.partner.houses.update(houseId, {
        title: cleanTitle,
        description: cleanDesc,
        typology,
        city,
        availableFrom,
        priceEur: cleanPrice,
        relocationFeeEur: cleanRelocation,
        caucoesCount,
        rendasEntradaCount,
        furnished,
        keepImageUrls: retainedImageUrls,
        images: newImages.length ? newImages : undefined,
        video: video ?? undefined,
        removeVideo: removeVideo && !video ? true : undefined,
        coverImageIndex: totalImages > 0 ? coverImageIndex : undefined,
      });
      router.push("/dashboard/casas?updated=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHouse() {
    const ok = window.confirm(
      "Excluir este imóvel? As fotos e o vídeo serão removidos. Esta ação não pode ser desfeita.",
    );
    if (!ok) return;
    setError("");
    setDeleting(true);
    try {
      await api.partner.houses.delete(houseId);
      router.push("/dashboard/casas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o imóvel.");
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  if (user.role !== "PARTNER") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
        <p className="mt-2 text-sm text-zinc-600">Esta área é exclusiva para parceiros.</p>
      </div>
    );
  }

  if (relocationGate === "loading") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      </div>
    );
  }

  if (relocationGate === "no") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-600">Apenas parceiros Relocation.</p>
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
        <CardLinkButton href="/dashboard/casas" variant="outline" className="mt-4">
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
          <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Alterações na página pública. A mensagem no grupo WhatsApp não é reenviada.
          </p>
        </div>
        <CardLinkButton href="/dashboard/casas" variant="outline">
          Voltar
        </CardLinkButton>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <span className="block text-xs font-medium text-zinc-700">Fotos</span>
          <p className="mt-1 text-xs text-zinc-500">
            Remove ou adiciona (máx. 6). Escolhe a <strong className="font-semibold">foto principal</strong> para
            pré-visualização ao partilhar o link (WhatsApp, etc.).
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
                        name="cover-edit"
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
                          name="cover-edit"
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
          <span className="block text-xs font-medium text-zinc-700">Vídeo (só na página pública)</span>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700">Cidade</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
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
            <label className="block text-xs font-medium text-zinc-700">Renda mensal</label>
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
          <CardButton type="submit" variant="primary" disabled={saving || deleting}>
            {saving ? "A guardar…" : "Guardar alterações"}
          </CardButton>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/60 p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Excluir anúncio</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Remove o imóvel da plataforma e apaga as fotos e o vídeo armazenados. Não é possível recuperar.
        </p>
        <CardButton
          type="button"
          variant="danger"
          className="mt-4"
          disabled={deleting || saving}
          onClick={handleDeleteHouse}
        >
          {deleting ? "A excluir…" : "Excluir imóvel"}
        </CardButton>
      </div>
    </div>
  );
}
