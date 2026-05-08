"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { RelocationCityCombobox } from "@/components/relocation/RelocationCityCombobox";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton, CardLinkButton } from "@/components/ui/CardButton";
import { isRelocationPortugalCity } from "@/lib/relocation-portugal-cities";

const EXTRA_RELOCATION_CITIES_STORAGE_KEY = "relocation-extra-city-options";

function loadExtraRelocationCitiesFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EXTRA_RELOCATION_CITIES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const out: string[] = [];
    for (const x of list) {
      const t = typeof x === "string" ? x.trim() : "";
      if (t && !out.includes(t)) out.push(t);
    }
    return out;
  } catch {
    return [];
  }
}

function saveExtraRelocationCitiesToStorage(next: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXTRA_RELOCATION_CITIES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

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

const ENTRADA_COUNT_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i));

/** Data de hoje em YYYY-MM-DD (fuso local) para `<input type="date">`. */
function todayLocalDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function NewHousePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typology, setTypology] = useState<(typeof TYPOLOGIES)[number]["id"]>("T2");
  const [businessType, setBusinessType] = useState<(typeof BUSINESS_TYPES)[number]["id"]>("RENT");
  const [city, setCity] = useState("");
  const [extraCityOptions, setExtraCityOptions] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState(() => todayLocalDateInputValue());
  const [priceEur, setPriceEur] = useState("");
  const [relocationFeeEur, setRelocationFeeEur] = useState("");
  const [caucoesCount, setCaucoesCount] = useState("0");
  const [rendasEntradaCount, setRendasEntradaCount] = useState("0");
  const [furnished, setFurnished] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [video, setVideo] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [relocationGate, setRelocationGate] = useState<"loading" | "ok" | "no">("loading");

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
    setExtraCityOptions(loadExtraRelocationCitiesFromStorage());
  }, []);

  const handleCityChange = (next: string) => {
    setCity(next);
    const t = next.trim();
    if (!t) return;
    if (isRelocationPortugalCity(t)) return;
    setExtraCityOptions((prev) => {
      if (prev.includes(t)) return prev;
      const merged = [...prev, t].sort((a, b) => a.localeCompare(b, "pt"));
      saveExtraRelocationCitiesToStorage(merged);
      return merged;
    });
  };

  const imagePreviews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [imagePreviews]);

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
    if (images.length === 0) return;
    setCoverImageIndex((i) => Math.min(i, images.length - 1));
  }, [images.length]);

  function addImageFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;
    setImages((prev) => [...prev, ...incoming].slice(0, 6));
  }

  function removeImageAt(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  if (!user) return null;

  if (user.role !== "PARTNER") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Publicar imóvel</h1>
        <p className="mt-2 text-sm text-zinc-600">Esta área é exclusiva para parceiros.</p>
      </div>
    );
  }

  if (relocationGate === "loading") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Publicar imóvel</h1>
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      </div>
    );
  }

  if (relocationGate === "no") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Publicar imóvel</h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-600">
          Apenas parceiros na categoria Relocation podem publicar imóveis aqui.
        </p>
        <div className="mt-4">
          <CardLinkButton href="/dashboard" variant="outline">
            Voltar ao painel
          </CardLinkButton>
        </div>
      </div>
    );
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
    if (!availableFrom) return setError('Seleciona a data em "Disponível em".');
    if (!cleanPrice) return setError(businessType === "SALE" ? "Preenche o preço de venda." : "Preenche o preço do arrendamento.");
    if (!cleanRelocation) return setError("Preenche a taxa de relocation (em euros).");
    if (images.length === 0 && !video) {
      return setError("Adiciona pelo menos 1 imagem ou 1 vídeo.");
    }
    if (images.length > 6) return setError("Podes enviar no máximo 6 imagens.");

    setSaving(true);
    try {
      await api.partner.houses.create({
        ...(images.length ? { images } : {}),
        ...(video ? { video } : {}),
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
      router.push("/dashboard/casas?sent=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Publicar imóvel</h1>
          <p className="mt-2 text-sm text-zinc-600">
            O anúncio fica na plataforma com as fotos e o vídeo que enviares. A divulgação nos grupos WhatsApp é feita
            pela equipa quando for o caso (não é automática aqui).
          </p>
        </div>
        <div className="shrink-0">
          <CardLinkButton href="/dashboard/casas" variant="outline">
            Voltar
          </CardLinkButton>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <span className="block text-xs font-medium text-zinc-700">Fotos</span>
          <div className="mt-3 space-y-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-hidden
              onChange={(e) => {
                addImageFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <CardButton
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                disabled={images.length >= 6}
              >
                {images.length === 0 ? "Adicionar imagens" : "Adicionar mais imagens"}
              </CardButton>
              <span className="text-xs text-zinc-500">{images.length}/6 · na página do anúncio</span>
            </div>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {imagePreviews.map((p, i) => (
                  <div
                    key={`${p.file.name}-${p.file.size}-${i}`}
                    className={`relative aspect-video overflow-hidden rounded-xl border bg-zinc-100 ${
                      coverImageIndex === i ? "border-amber-500 ring-2 ring-amber-400/50" : "border-transparent"
                    }`}
                  >
                    <Image src={p.url} alt="" fill className="object-cover" unoptimized />
                    <label className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <input
                        type="radio"
                        name="cover-nova"
                        className="accent-amber-400"
                        checked={coverImageIndex === i}
                        onChange={() => setCoverImageIndex(i)}
                      />
                      Principal
                    </label>
                    <button
                      type="button"
                      onClick={() => removeImageAt(i)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white hover:bg-black/80"
                      aria-label="Remover imagem"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imagePreviews.length > 0 ? (
              <p className="text-xs text-zinc-500">
                A foto marcada como principal é usada na pré-visualização ao partilhar o link do anúncio.
              </p>
            ) : null}
          </div>

          <span className="mt-6 block text-xs font-medium text-zinc-700">Vídeo</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov,.webm,.3gp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setVideo(f);
            }}
            className="mt-2 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-200"
          />
          <p className="mt-1 text-xs text-zinc-500">MP4, MOV, WebM ou 3GP.</p>
          {videoPreviewUrl ? (
            <div className="mt-3 overflow-hidden rounded-xl bg-black">
              <video
                src={videoPreviewUrl}
                className="max-h-64 w-full object-contain"
                controls
                playsInline
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: T2 mobilado perto do metro"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-700">Mobilado?</span>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="house-furnished"
                checked={furnished === true}
                onChange={() => setFurnished(true)}
              />
              Sim
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="house-furnished"
                checked={furnished === false}
                onChange={() => setFurnished(false)}
              />
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
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
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
              id="house-city"
              label="Cidade"
              labelClassName="block text-xs font-medium text-zinc-700"
              value={city}
              onChange={handleCityChange}
              allowEmpty={false}
              allowCustomValue
              extraCityOptions={extraCityOptions}
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
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
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
            className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700">
              {businessType === "SALE" ? "Preço de venda" : "Renda mensal"}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                placeholder="Ex.: 950"
                inputMode="decimal"
                className="w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="shrink-0 text-sm font-medium text-zinc-600">€</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700">Taxa de relocation</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={relocationFeeEur}
                onChange={(e) => setRelocationFeeEur(e.target.value)}
                placeholder="Ex.: 500"
                inputMode="decimal"
                className="w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="shrink-0 text-sm font-medium text-zinc-600">€</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700">N.º de cauções (entrada)</label>
            <select
              value={caucoesCount}
              onChange={(e) => setCaucoesCount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              {ENTRADA_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">N.º de rendas antecipadas (entrada)</label>
            <select
              value={rendasEntradaCount}
              onChange={(e) => setRendasEntradaCount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
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
            placeholder="Detalha localização, mobiliado, despesas incluídas, duração mínima, contato, etc."
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 sm:pr-2">
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 justify-end">
            <CardButton type="submit" variant="primary" disabled={saving}>
              {saving ? "A publicar…" : "Publicar imóvel"}
            </CardButton>
          </div>
        </div>
      </form>
    </div>
  );
}
