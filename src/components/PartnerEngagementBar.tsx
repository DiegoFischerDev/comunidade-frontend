'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { resolveShareUrlForBrowser } from '@/lib/site-url';
import { CardButton } from '@/components/ui/CardButton';

export type PartnerEngagementSnapshot = {
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  myReaction: 'LIKE' | 'DISLIKE' | null;
};

type Props = {
  partnerId: string;
  /** Página pública a copiar ao partilhar. */
  sharePageUrl: string;
  variant?: 'card' | 'hero';
  /** Nome do parceiro (modais de comentário e partilha) */
  partnerName?: string;
  /** URL absoluta do logo (modal de partilha e ícone) */
  partnerLogoUrl?: string | null;
  className?: string;
  /** Dados iniciais da listagem (evita flash em cartões) */
  initial?: Pick<
    PartnerEngagementSnapshot,
    'likeCount' | 'dislikeCount' | 'commentCount' | 'shareCount'
  >;
};

function formatCount(n: number) {
  if (n > 999) return '999+';
  return String(n);
}

function iconSize(variant: 'card' | 'hero') {
  return variant === 'card' ? 'h-3.5 w-3.5' : 'h-5 w-5';
}

export function PartnerEngagementBar({
  partnerId,
  sharePageUrl,
  variant = 'card',
  partnerName,
  partnerLogoUrl,
  className = '',
  initial,
}: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<PartnerEngagementSnapshot | null>(
    initial
      ? {
          likeCount: initial.likeCount,
          dislikeCount: initial.dislikeCount,
          commentCount: initial.commentCount,
          shareCount: initial.shareCount,
          myReaction: null,
        }
      : null,
  );
  const [loading, setLoading] = useState(!initial);
  const [err, setErr] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [shareUrlToUse, setShareUrlToUse] = useState(sharePageUrl);
  const shareLogged = useRef(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentErr, setCommentErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const d = await api.marketplace.partnerEngagement(partnerId);
      setData(d);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : 'Não foi possível carregar reações.',
      );
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (!initial) {
      setLoading(true);
    }
    load();
  }, [load]);

  useLayoutEffect(() => {
    setShareUrlToUse(resolveShareUrlForBrowser(sharePageUrl));
  }, [sharePageUrl]);

  useEffect(() => {
    if (!shareOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shareOpen]);

  useEffect(() => {
    const onComment = (e: Event) => {
      const d = (e as CustomEvent<{ partnerId: string }>).detail;
      if (d?.partnerId === partnerId) void load();
    };
    window.addEventListener('partner-comment-created', onComment as EventListener);
    window.addEventListener('partner-comment-deleted', onComment as EventListener);
    return () => {
      window.removeEventListener('partner-comment-created', onComment as EventListener);
      window.removeEventListener('partner-comment-deleted', onComment as EventListener);
    };
  }, [partnerId, load]);

  useEffect(() => {
    if (!commentOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCommentText('');
        setCommentErr(null);
        setCommentOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commentOpen]);

  useEffect(() => {
    if (commentOpen && !user) {
      setCommentOpen(false);
      setCommentText('');
      setCommentErr(null);
    }
  }, [commentOpen, user]);

  const openAuth = () => {
    window.dispatchEvent(
      new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }),
    );
  };

  const openCommentModal = () => {
    setCommentErr(null);
    setCommentOpen(true);
  };

  const onCommentButtonClick = () => {
    if (variant === 'hero') {
      const el = document.getElementById('comentarios');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (!user) {
      openAuth();
      return;
    }
    openCommentModal();
  };

  useEffect(() => {
    const onOpenFromPage = (e: Event) => {
      const d = (e as CustomEvent<{ partnerId: string }>).detail;
      if (d?.partnerId !== partnerId) return;
      if (!user) {
        window.dispatchEvent(
          new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }),
        );
        return;
      }
      setCommentErr(null);
      setCommentOpen(true);
    };
    window.addEventListener('partner-open-comment-modal', onOpenFromPage);
    return () =>
      window.removeEventListener('partner-open-comment-modal', onOpenFromPage);
  }, [partnerId, user]);

  const closeCommentModal = () => {
    setCommentOpen(false);
    setCommentText('');
    setCommentErr(null);
  };

  const submitComment = async () => {
    if (!user) {
      openAuth();
      return;
    }
    const t = commentText.trim();
    if (!t || commentSending) return;
    setCommentSending(true);
    setCommentErr(null);
    try {
      const created = await api.marketplace.createPartnerComment(partnerId, {
        body: t,
      });
      window.dispatchEvent(
        new CustomEvent('partner-comment-created', {
          detail: { partnerId, newComment: created },
        }),
      );
      closeCommentModal();
    } catch (e) {
      setCommentErr(
        e instanceof Error
          ? e.message
          : 'Não foi possível publicar o comentário.',
      );
    } finally {
      setCommentSending(false);
    }
  };

  const applyReaction = async (next: 'LIKE' | 'DISLIKE' | null) => {
    if (!user) {
      openAuth();
      return;
    }
    setErr(null);
    try {
      await api.marketplace.setPartnerReaction(partnerId, { type: next });
      await load();
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : 'Não foi possível guardar a reação.',
      );
    }
  };

  const onLike = () => {
    if (!data) return;
    if (data.myReaction === 'LIKE') void applyReaction(null);
    else void applyReaction('LIKE');
  };

  const onDislike = () => {
    if (!data) return;
    if (data.myReaction === 'DISLIKE') void applyReaction(null);
    else void applyReaction('DISLIKE');
  };

  const openShare = () => {
    if (!shareLogged.current) {
      shareLogged.current = true;
      api.marketplace
        .recordPartnerShare(partnerId)
        .then((r) => {
          setData((prev) => (prev ? { ...prev, shareCount: r.shareCount } : prev));
        })
        .catch(() => {
          shareLogged.current = false;
        });
    }
    setShareOpen(true);
    setCopyDone(false);
  };

  const copyLink = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(shareUrlToUse);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const baseBtn =
    variant === 'card'
      ? 'inline-flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-0.5 text-zinc-600 transition-all duration-300 ease-out will-change-transform hover:bg-zinc-100 hover:text-zinc-900 active:scale-95'
      : 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-white/90 transition-all duration-300 ease-out will-change-transform hover:bg-white/10 active:scale-95';

  const likeActive = data?.myReaction === 'LIKE';
  const dislikeActive = data?.myReaction === 'DISLIKE';
  const sz = iconSize(variant);

  return (
    <>
      <div
        className={`flex items-center ${
          variant === 'hero'
            ? 'w-full min-w-0 flex-nowrap justify-between gap-0.5 text-sm sm:w-auto sm:flex-wrap sm:justify-start sm:gap-1.5'
            : 'flex-wrap gap-1.5 text-xs'
        } ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="group"
        aria-label="Reações e partilha do parceiro"
      >
        {err && (
          <p className="w-full text-[0.7rem] text-amber-700" role="status">
            {err}
          </p>
        )}
        {loading && !data ? (
          <span
            className={
              variant === 'card' ? 'text-zinc-400' : 'text-red-100/80'
            }
          >
            …
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onLike}
              className={baseBtn}
              title={user ? (likeActive ? 'Tirar gosto' : 'Gosto') : 'Entre para reagir'}
            >
              <span className="sr-only">Gosto</span>
              <ThumbUpIcon
                active={!!likeActive}
                variant={variant}
                sizeClass={sz}
              />
              {data && (
                <span className="min-w-[1.25ch] font-medium">
                  {formatCount(data.likeCount)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onDislike}
              className={baseBtn}
              title={
                user ? (dislikeActive ? 'Tirar desgosto' : 'Desgosto') : 'Entre para reagir'
              }
            >
              <span className="sr-only">Desgosto</span>
              <ThumbDownIcon
                active={!!dislikeActive}
                variant={variant}
                sizeClass={sz}
              />
              {data && (
                <span className="min-w-[1.25ch] font-medium">
                  {formatCount(data.dislikeCount)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onCommentButtonClick}
              className={baseBtn}
              title={
                variant === 'hero'
                  ? 'Ver comentários'
                  : user
                    ? 'Comentar'
                    : 'Entre para comentar'
              }
            >
              <span className="sr-only">
                {variant === 'hero' ? 'Ir para comentários' : 'Comentários'}
              </span>
              <CommentIcon className={sz} />
              {data && (
                <span className="min-w-[1.25ch] font-medium">
                  {formatCount(data.commentCount)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={openShare}
              className={baseBtn}
              title="Partilhar"
            >
              <span className="sr-only">Partilhar</span>
              <PaperRocketIcon className={sz} />
              {data && (
                <span className="min-w-[1.25ch] font-medium">
                  {formatCount(data.shareCount)}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {shareOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShareOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="share-title"
                className="pr-2 text-sm font-semibold text-zinc-900"
              >
                Compartilhar página
              </h2>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            {partnerName || partnerLogoUrl ? (
              <div className="mt-3 flex items-center gap-3">
                {partnerLogoUrl ? (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                    <img
                      src={partnerLogoUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-zinc-300">
                    <PaperRocketIcon className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  {partnerName ? (
                    <p className="text-sm font-medium text-zinc-900">
                      {partnerName}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            <p className="mt-3 break-all rounded-lg bg-zinc-50 px-3 py-2 text-xs text-blue-600 select-text">
              {shareUrlToUse}
            </p>
            <div className="mt-4 flex flex-wrap justify-end">
              <CardButton
                type="button"
                variant="primary"
                size="sm"
                onClick={copyLink}
                className="gap-1.5"
              >
                <CopyIcon className="h-[1.15rem] w-[1.15rem]" />
                {copyDone ? 'Copiado' : 'Copiar link'}
              </CardButton>
            </div>
          </div>
        </div>
      )}

      {commentOpen && user && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={closeCommentModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-comment-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="partner-comment-title"
              className="text-sm font-semibold text-zinc-900"
            >
              Novo comentário
            </h2>
            {partnerName ? (
              <p className="mt-1 text-sm text-zinc-600">
                Queremos muito saber sua opinião sobre {partnerName}.
              </p>
            ) : null}
            <label htmlFor="partner-comment-input" className="sr-only">
              Texto do comentário
            </label>
            <textarea
              id="partner-comment-input"
              rows={7}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="mt-3 min-h-[11rem] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Escreva o seu comentário…"
            />
            {commentErr && (
              <p className="mt-2 text-xs text-red-600" role="status">
                {commentErr}
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <CardButton
                type="button"
                variant="outline"
                size="sm"
                onClick={closeCommentModal}
              >
                Cancelar
              </CardButton>
              <CardButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void submitComment()}
                disabled={!commentText.trim() || commentSending}
                loading={commentSending}
              >
                {commentSending ? 'A enviar…' : 'Publicar'}
              </CardButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const THUMB_D =
  "M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z";
const THUMB_D_DOWN =
  "M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54";

function likeActiveWrap(variant: 'card' | 'hero') {
  return variant === 'card'
    ? 'text-emerald-600 drop-shadow-[0_1px_5px_rgba(5,150,105,0.45)]'
    : 'text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]';
}
function dislikeActiveWrap(variant: 'card' | 'hero') {
  return variant === 'card'
    ? 'text-red-600 drop-shadow-[0_1px_5px_rgba(220,38,38,0.45)]'
    : 'text-red-300 drop-shadow-[0_0_10px_rgba(248,113,113,0.45)]';
}

function ThumbUpIcon({
  active,
  variant,
  sizeClass,
}: {
  active: boolean;
  variant: 'card' | 'hero';
  sizeClass: string;
}) {
  const colorWrap = active
    ? likeActiveWrap(variant)
    : variant === 'card'
      ? 'text-zinc-500'
      : 'text-white/80';
  return (
    <span
      className={`inline-flex will-change-transform [transition:transform_0.32s_cubic-bezier(0.34,1.3,0.64,1),color_0.2s_ease,filter_0.25s_ease] ${
        active ? 'scale-110' : 'scale-100'
      } ${colorWrap}`.trim()}
      aria-hidden
    >
      <svg
        className={sizeClass}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          className="[transition:fill_0.22s_ease,stroke_0.22s_ease,stroke-width_0.22s_ease]"
          d={THUMB_D}
          fill={active ? 'currentColor' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          strokeWidth={active ? 0 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ThumbDownIcon({
  active,
  variant,
  sizeClass,
}: {
  active: boolean;
  variant: 'card' | 'hero';
  sizeClass: string;
}) {
  const colorWrap = active
    ? dislikeActiveWrap(variant)
    : variant === 'card'
      ? 'text-zinc-500'
      : 'text-white/80';
  return (
    <span
      className={`inline-flex will-change-transform [transition:transform_0.32s_cubic-bezier(0.34,1.3,0.64,1),color_0.2s_ease,filter_0.25s_ease] ${
        active ? 'scale-110' : 'scale-100'
      } ${colorWrap}`.trim()}
      aria-hidden
    >
      <svg
        className={sizeClass}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          className="[transition:fill_0.22s_ease,stroke_0.22s_ease,stroke-width_0.22s_ease]"
          d={THUMB_D_DOWN}
          fill={active ? 'currentColor' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          strokeWidth={active ? 0 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  );
}

/**
 * Foguete de papel — dobradura em dardo (avião de papel clássico, ícone de partilha).
 * Traçado estilo “send”/avião, legível em tamanho pequeno.
 */
function PaperRocketIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4L22 2z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
