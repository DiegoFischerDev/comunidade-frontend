"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CardButton, CardLinkButton } from "@/components/ui/CardButton";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Row = Awaited<ReturnType<typeof api.admin.grupoTeste.list>>[number];

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function mediaSrc(path: string): string {
  const p = path.trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;
}

const STATUS_LABEL: Record<Row["status"], string> = {
  PENDING: "Pendente",
  SENDING: "A enviar…",
  SENT: "Enviado",
  FAILED: "Falhou",
};

export default function AdminGrupoTestePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState("");
  const [description, setDescription] = useState("");
  const [defaultGroupJid, setDefaultGroupJid] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sendJids, setSendJids] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const data = await api.admin.grupoTeste.list();
      setRows(data);
      setSendJids((prev) => {
        const next = { ...prev };
        for (const r of data) {
          if (next[r.id] === undefined && r.targetGroupJid) {
            next[r.id] = r.targetGroupJid;
          }
        }
        return next;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [authLoading, user, router, load]);

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

  function addImages(fileList: FileList | null) {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    setImages((prev) => [...prev, ...incoming].slice(0, 6));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    const desc = description.trim();
    if (desc.length < 3) {
      setSaveError("A descrição deve ter pelo menos 3 caracteres.");
      return;
    }
    if (!images.length && !video) {
      setSaveError("Adiciona pelo menos 1 imagem ou 1 vídeo.");
      return;
    }
    setSaving(true);
    try {
      await api.admin.grupoTeste.create({
        description: desc,
        targetGroupJid: defaultGroupJid.trim() || undefined,
        images,
        video,
      });
      setDescription("");
      setImages([]);
      setVideo(null);
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(row: Row) {
    const jid = (sendJids[row.id] ?? row.targetGroupJid ?? "").trim();
    if (!jid) {
      setSaveError("Indica o JID do grupo WhatsApp para este envio.");
      return;
    }
    setSaveError("");
    setSendingId(row.id);
    try {
      await api.admin.grupoTeste.send(row.id, jid);
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao enviar.");
      await load();
    } finally {
      setSendingId(null);
    }
  }

  if (authLoading || !user || user.role !== "ADMIN") {
    return (
      <div className="p-6 text-sm text-zinc-600">
        {authLoading ? "A carregar…" : "A redirecionar…"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Grupo teste</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Regista mensagens com imagens e vídeo; envia para um grupo WhatsApp via Evolution (só administradores).
          </p>
        </div>
        <CardLinkButton href="/dashboard" variant="outline" className="w-fit">
          ← Início
        </CardLinkButton>
      </div>

      <form
        onSubmit={handleUpload}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-zinc-900">Nova mensagem</h2>
        <label className="block text-sm font-medium text-zinc-700">
          Descrição (enviada como texto no WhatsApp)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Texto da mensagem…"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          JID do grupo (opcional — preenche por defeito o campo de envio na lista)
          <input
            type="text"
            value={defaultGroupJid}
            onChange={(e) => setDefaultGroupJid(e.target.value)}
            placeholder="ex.: 120363123456789012@g.us"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-zinc-700">Imagens (máx. 6)</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              addImages(e.target.files);
              e.target.value = "";
            }}
          />
          <CardButton
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => imageInputRef.current?.click()}
            disabled={images.length >= 6}
          >
            Adicionar imagens
          </CardButton>
          {images.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {imagePreviews.map((p, i) => (
                <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200">
                  <Image src={p.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-bl bg-black/60 text-xs text-white"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remover"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <label className="block text-sm font-medium text-zinc-700">
          Vídeo (opcional, 1 ficheiro — MP4, MOV, WebM, 3GP)
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/3gpp"
            className="mt-1 block w-full text-sm text-zinc-700"
            onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          />
        </label>
        {videoPreviewUrl ? (
          <video src={videoPreviewUrl} className="max-h-48 w-full rounded-lg border border-zinc-200" controls playsInline />
        ) : null}

        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}

        <CardButton type="submit" variant="primary" disabled={saving}>
          {saving ? "A guardar…" : "Upload / guardar"}
        </CardButton>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Mensagens guardadas</h2>
        {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-600">Ainda não há registos.</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {new Date(r.createdAt).toLocaleString("pt-PT")} · {r.createdBy.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "SENT"
                        ? "bg-emerald-100 text-emerald-900"
                        : r.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-800">{r.description}</p>
                {r.imageUrls.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.imageUrls.map((url) => (
                      <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border border-zinc-200">
                        <Image
                          src={mediaSrc(url)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                {r.videoUrl ? (
                  <div className="mt-3">
                    <a
                      href={mediaSrc(r.videoUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-amber-800 underline"
                    >
                      Ver vídeo
                    </a>
                  </div>
                ) : null}
                {r.whatsappError ? (
                  <p className="mt-2 text-xs text-red-700">{r.whatsappError}</p>
                ) : null}
                {r.status !== "SENT" ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1 text-sm font-medium text-zinc-700">
                      JID do grupo para enviar
                      <input
                        type="text"
                        value={sendJids[r.id] ?? ""}
                        onChange={(e) =>
                          setSendJids((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        placeholder="120363…@g.us"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                      />
                    </label>
                    <CardButton
                      type="button"
                      variant="primary"
                      className="shrink-0"
                      disabled={sendingId === r.id || r.status === "SENDING"}
                      onClick={() => void handleSend(r)}
                    >
                      {sendingId === r.id ? "A enviar…" : "Enviar para grupo teste"}
                    </CardButton>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
