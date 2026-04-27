"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { YOUTUBE_HIGHLIGHT_FALLBACKS } from "@/lib/youtube-highlights-defaults";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton } from "@/components/ui/CardButton";

type CardRow = {
  position: number;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
};

function thumbDisplayUrl(path: string): string {
  if (path.startsWith("/uploads/")) return resolveUploadsUrl(path);
  return path;
}

export default function AdminYoutubeHighlightsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Record<number, File | null>>({});
  const [fileObjectUrls, setFileObjectUrls] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const data = await api.youtubeHighlights.list();
    setCards(data.cards.sort((a, b) => a.position - b.position));
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar destaques.");
        setCards(
          YOUTUBE_HIGHLIGHT_FALLBACKS.map((f, i) => ({
            position: i + 1,
            title: f.title,
            videoUrl: f.href,
            thumbnailUrl: f.thumb,
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, load]);

  const updateCard = (position: number, patch: Partial<CardRow>) => {
    setCards((prev) =>
      prev.map((c) => (c.position === position ? { ...c, ...patch } : c)),
    );
  };

  const onPickFile = (position: number, file: File | null) => {
    setFileObjectUrls((prev) => {
      const next = { ...prev };
      if (next[position]) {
        URL.revokeObjectURL(next[position]);
        delete next[position];
      }
      if (file) {
        next[position] = URL.createObjectURL(file);
      }
      return next;
    });
    setPendingFiles((prev) => ({ ...prev, [position]: file }));
  };

  useEffect(() => {
    return () => {
      for (const u of Object.values(fileObjectUrls)) {
        URL.revokeObjectURL(u);
      }
    };
  }, [fileObjectUrls]);

  const onSave = async () => {
    if (cards.length !== 3) return;
    setSaving(true);
    setError("");
    try {
      const built: CardRow[] = [];
      for (const c of cards.sort((a, b) => a.position - b.position)) {
        const file = pendingFiles[c.position];
        let thumbnailUrl = c.thumbnailUrl.trim();
        if (file) {
          const { url } = await api.uploads.post(file);
          thumbnailUrl = url;
        }
        if (!thumbnailUrl) {
          setError(`Indica uma miniatura para o card ${c.position} (URL ou ficheiro).`);
          setSaving(false);
          return;
        }
        built.push({
          position: c.position,
          title: c.title.trim(),
          videoUrl: c.videoUrl.trim(),
          thumbnailUrl,
        });
      }
      const res = await api.admin.youtubeHighlights.update({ cards: built });
      setCards(res.cards.sort((a, b) => a.position - b.position));
      setPendingFiles({});
      setFileObjectUrls((prev) => {
        for (const u of Object.values(prev)) URL.revokeObjectURL(u);
        return {};
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Destaques YouTube</h1>
        <p className="mt-2 text-sm text-zinc-600">Não tens permissão para aceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Destaques YouTube (dashboard)</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Três cards no painel inicial: título, link do vídeo e imagem de miniatura. Podes carregar uma nova
          imagem (substitui a miniatura actual) ou manter a URL indicada.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : (
        <div className="space-y-8">
          {[1, 2, 3].map((position) => {
            const c = cards.find((x) => x.position === position);
            if (!c) return null;
            const pending = pendingFiles[position];
            const preview = fileObjectUrls[position] ?? (pending ? undefined : thumbDisplayUrl(c.thumbnailUrl));
            return (
              <div
                key={position}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5"
              >
                <h2 className="text-sm font-semibold text-zinc-800">Card {position}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-zinc-600">
                      Título
                      <input
                        type="text"
                        value={c.title}
                        onChange={(e) => updateCard(position, { title: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                        maxLength={500}
                      />
                    </label>
                    <label className="block text-xs font-medium text-zinc-600">
                      URL do vídeo (YouTube)
                      <input
                        type="url"
                        value={c.videoUrl}
                        onChange={(e) => updateCard(position, { videoUrl: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </label>
                    <label className="block text-xs font-medium text-zinc-600">
                      URL da miniatura (se não enviares ficheiro)
                      <input
                        type="text"
                        value={c.thumbnailUrl}
                        onChange={(e) => updateCard(position, { thumbnailUrl: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                        placeholder="/uploads/… ou /youtube_1.png"
                      />
                    </label>
                    <label className="block text-xs font-medium text-zinc-600">
                      Nova imagem (opcional)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="mt-1 block w-full text-sm text-zinc-600 file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1"
                        onChange={(e) => onPickFile(position, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  <div className="relative aspect-video w-full max-w-[200px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 sm:justify-self-end">
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized={Boolean(pending || fileObjectUrls[position])}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">Sem imagem</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <CardButton
            type="button"
            variant="primary"
            onClick={() => void onSave()}
            disabled={saving || cards.length !== 3}
            className="min-w-[10rem]"
          >
            {saving ? "A guardar…" : "Guardar alterações"}
          </CardButton>
        </div>
      )}
    </div>
  );
}
