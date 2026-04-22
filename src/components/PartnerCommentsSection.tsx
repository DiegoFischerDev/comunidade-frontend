'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Item = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
};

type Props = {
  partnerId: string;
  partnerName: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function PartnerCommentsSection({ partnerId, partnerName }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.marketplace.partnerComments(partnerId, { take: 40 });
      setItems(res.items);
      setHasMore(res.hasMore);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível carregar comentários.',
      );
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }),
      );
      return;
    }
    setSending(true);
    setError(null);
    try {
      const created = await api.marketplace.createPartnerComment(partnerId, {
        body: t,
      });
      setText('');
      setItems((prev) => [created, ...prev]);
      window.dispatchEvent(
        new CustomEvent('partner-comment-created', { detail: { partnerId } }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível publicar o comentário.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      id="comentarios"
      className="scroll-mt-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"
    >
      <h2 className="text-sm font-semibold text-zinc-900">Comentários</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Comentários da comunidade sobre {partnerName}.
      </p>

      <div className="mt-4">
        <label htmlFor="partner-comment" className="sr-only">
          Novo comentário
        </label>
        <textarea
          id="partner-comment"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder={
            user
              ? 'Escreva o seu comentário…'
              : 'Inicie sessão para comentar…'
          }
          disabled={!user}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {error && (
            <p className="text-xs text-red-600" role="status">
              {error}
            </p>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => void send()}
              disabled={!user || !text.trim() || sending}
              className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'A enviar…' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>

      <ul className="mt-6 space-y-4 border-t border-zinc-100 pt-5">
        {loading && <li className="text-sm text-zinc-500">A carregar…</li>}
        {!loading && items.length === 0 && !error && (
          <li className="text-sm text-zinc-500">Ainda não há comentários.</li>
        )}
        {items.map((c) => (
          <li key={c.id} className="text-sm">
            <p className="font-medium text-zinc-900">{c.user.name}</p>
            <p className="text-xs text-zinc-500">{formatDate(c.createdAt)}</p>
            <p className="mt-1 whitespace-pre-wrap text-zinc-700">{c.body}</p>
          </li>
        ))}
        {hasMore && !loading && (
          <li>
            <button
              type="button"
              onClick={async () => {
                const last = items[items.length - 1];
                if (!last) return;
                try {
                  const res = await api.marketplace.partnerComments(partnerId, {
                    take: 40,
                    before: last.id,
                  });
                  setItems((prev) => [...prev, ...res.items]);
                  setHasMore(res.hasMore);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : 'Não foi possível carregar mais.',
                  );
                }
              }}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Carregar mais
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
