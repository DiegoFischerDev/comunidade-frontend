"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
];

const TYPOLOGIES = [
  { id: "T1", label: "T1" },
  { id: "T2", label: "T2" },
  { id: "T3", label: "T3" },
  { id: "T4", label: "T4" },
  { id: "T5", label: "T5" },
  { id: "QUARTO_AP_COMPARTILHADO", label: "Quarto em Ap compartilhado" },
] as const;

export default function NewHousePostPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typology, setTypology] = useState<(typeof TYPOLOGIES)[number]["id"]>("T2");
  const [city, setCity] = useState(CITIES[0].id);
  const [availableFrom, setAvailableFrom] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [requirements, setRequirements] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const previews = useMemo(() => {
    return images.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  if (!user) return null;

  if (user.role !== "PARTNER") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Publicar imóvel</h1>
        <p className="mt-2 text-sm text-zinc-600">Esta área é exclusiva para parceiros.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanPrice = priceEur.trim();
    const cleanReq = requirements.trim();

    if (!cleanTitle) return setError("Preenche o título do imóvel.");
    if (!cleanDesc) return setError("Preenche a descrição.");
    if (!availableFrom) return setError('Seleciona a data em "Disponível em".');
    if (!cleanPrice) return setError("Preenche o preço do arrendamento.");
    if (!cleanReq) return setError("Preenche as exigências (cauções e rendas).");
    if (images.length === 0) return setError("Envia pelo menos 1 imagem.");
    if (images.length > 6) return setError("Podes enviar no máximo 6 imagens.");

    setSaving(true);
    try {
      await api.partner.houses.create({
        images,
        title: cleanTitle,
        description: cleanDesc,
        typology,
        city,
        availableFrom,
        priceEur: cleanPrice,
        requirements: cleanReq,
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
            Ao enviar, o sistema publica as fotos no grupo e depois envia a descrição formatada.
          </p>
        </div>
        <div className="shrink-0">
          <CardLinkButton href="/dashboard/casas" variant="secondary">
            Voltar
          </CardLinkButton>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-zinc-700">Imagens (até 6)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              setImages(list.slice(0, 6));
            }}
            className="mt-1 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-200"
          />

          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {previews.map((p) => (
                <div key={p.url} className="relative aspect-video overflow-hidden rounded-xl bg-zinc-100">
                  <Image src={p.url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700">Cidade</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
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
            <label className="block text-xs font-medium text-zinc-700">Preço do arrendamento</label>
            <input
              value={priceEur}
              onChange={(e) => setPriceEur(e.target.value)}
              placeholder="Ex.: 950€/mês"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700">Exigências (cauções/rendas)</label>
            <input
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Ex.: 2 cauções + 1 renda"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <CardButton type="submit" variant="primary" disabled={saving}>
            {saving ? "Enviando…" : "Enviar para o grupo"}
          </CardButton>
        </div>
      </form>
    </div>
  );
}

