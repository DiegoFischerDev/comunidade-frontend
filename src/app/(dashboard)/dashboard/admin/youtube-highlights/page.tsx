"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { YOUTUBE_HIGHLIGHT_FALLBACKS } from "@/lib/youtube-highlights-defaults";
import { youtubeThumbnailFromVideoUrl } from "@/lib/youtube-thumbnail";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton } from "@/components/ui/CardButton";

type CardRow = {
  position: number;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
};

function legacyThumbUrl(path: string): string {
  if (path.startsWith("/uploads/")) return resolveUploadsUrl(path);
  return path;
}

function previewThumb(c: CardRow): string | null {
  const fromUrl = youtubeThumbnailFromVideoUrl(c.videoUrl);
  if (fromUrl) return fromUrl;
  if (c.thumbnailUrl) return legacyThumbUrl(c.thumbnailUrl);
  return null;
}

export default function AdminYoutubeHighlightsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const updateCard = (position: number, patch: Partial<Pick<CardRow, "title" | "videoUrl">>) => {
    setCards((prev) => prev.map((c) => (c.position === position ? { ...c, ...patch } : c)));
  };

  const onSave = async () => {
    if (cards.length !== 3) return;
    setSaving(true);
    setError("");
    try {
      for (const c of cards) {
        if (!youtubeThumbnailFromVideoUrl(c.videoUrl.trim())) {
          setError(
            `O URL do YouTube do card ${c.position} é inválido: não foi possível obter o ID do vídeo.`,
          );
          setSaving(false);
          return;
        }
      }
      const built = cards
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          position: c.position,
          title: c.title.trim(),
          videoUrl: c.videoUrl.trim(),
        }));
      const res = await api.admin.youtubeHighlights.update({ cards: built });
      setCards(res.cards.sort((a, b) => a.position - b.position));
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
          Três cards no painel inicial. Indica título e URL do vídeo no YouTube; a miniatura é obtida
          automaticamente a partir do ID do vídeo (qualidade{" "}
          <code className="rounded bg-zinc-200 px-1">hqdefault</code>).
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
            const preview = previewThumb(c);
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
                        placeholder="https://www.youtube.com/watch?v=... ou youtu.be/…"
                      />
                    </label>
                    <p className="text-xs text-zinc-500">
                      A pré-visualização abaixo usa:{" "}
                      <code className="break-all text-[11px] text-zinc-600">
                        https://img.youtube.com/vi/ID/hqdefault.jpg
                      </code>
                    </p>
                  </div>
                  <div className="relative aspect-video w-full max-w-[200px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 sm:justify-self-end">
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="200px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-zinc-400">
                        Indica um URL de vídeo válido para ver a miniatura
                      </div>
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
