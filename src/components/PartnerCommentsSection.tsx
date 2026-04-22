'use client';

import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type Item = {
  id: string;
  body: string;
  createdAt: string;
  parentId: string | null;
  user: { id: string; name: string };
};

type TreeNode = Item & { children: TreeNode[] };

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

function buildTree(flat: Item[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const it of flat) {
    map.set(it.id, { ...it, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const it of flat) {
    const node = map.get(it.id)!;
    if (it.parentId && map.has(it.parentId)) {
      map.get(it.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortCh = (n: TreeNode) => {
    n.children.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    n.children.forEach(sortCh);
  };
  roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  roots.forEach(sortCh);
  return roots;
}

/** Todas as respostas de uma thread, da raiz, por ordem cronológica. */
function flattenRepliesInThread(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    for (const c of n.children) {
      out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Ícone de balão (cada comentário na thread) */
function CommentBubbleIcon() {
  return (
    <div
      className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d58901]/15 to-amber-100/80 text-amber-800/90 ring-1 ring-amber-200/50"
      aria-hidden
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.16 1.123 2.013 2.67 2.48h11.64c1.545-.467 2.67-1.32 2.67-2.48V6.75c0-1.26-1.002-2.25-2.25-2.25H5.25c-1.248 0-2.25.99-2.25 2.25v6.75zM12 20.25v-2.25M9 18h6"
        />
      </svg>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <li className="animate-pulse">
      <div className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 sm:p-5">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-200" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="h-4 w-32 rounded bg-zinc-200" />
          <div className="h-3 w-24 rounded bg-zinc-100" />
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full rounded bg-zinc-100" />
            <div className="h-3 w-4/5 rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    </li>
  );
}

type ThreadProps = {
  node: TreeNode;
  isAdmin: boolean;
  userId: string | null | undefined;
  deletingId: string | null;
  onDelete: (id: string) => void;
  inlineReplyParentId: string | null;
  inlineReplyText: string;
  inlineReplySending: boolean;
  inlineReplyErr: string | null;
  onStartInlineReply: (item: Item) => void;
  onInlineReplyText: (s: string) => void;
  onCancelInlineReply: () => void;
  onSubmitInlineReply: () => void;
};

type ReplyRowViewProps = {
  node: TreeNode;
  isAdmin: boolean;
  userId: string | null | undefined;
  deletingId: string | null;
  onDelete: (id: string) => void;
};

function CommentInlineForm({
  node,
  value,
  sending,
  err,
  onChange,
  onCancel,
  onSubmit,
  inputRef,
}: {
  node: Item;
  value: string;
  sending: boolean;
  err: string | null;
  onChange: (s: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="mt-2 max-w-lg animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/90">
        <label className="sr-only" htmlFor={`reply-${node.id}`}>
          Responder a {node.user.name}
        </label>
        <textarea
          id={`reply-${node.id}`}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={2}
          placeholder="Adicionar resposta…"
          className="max-h-40 min-h-[2.75rem] w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
          disabled={sending}
        />
        {err && (
          <p className="px-3 pb-1 text-xs text-red-600" role="status">
            {err}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200/60 bg-white/60 px-2.5 py-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim() || sending}
            className="inline-flex cursor-pointer rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-amber-300/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'A enviar…' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReplyRow({ node, isAdmin, userId, deletingId, onDelete }: ReplyRowViewProps) {
  const canDelete = isAdmin || (userId != null && userId === node.user.id);
  return (
    <li className="pt-1.5 first:pt-0.5">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-tight sm:text-sm">
          <span className="font-semibold text-zinc-900">
            {node.user.name}
          </span>
          <time
            className="text-[11px] text-zinc-400 sm:text-xs"
            dateTime={node.createdAt}
          >
            {formatDate(node.createdAt)}
          </time>
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              disabled={deletingId === node.id}
              className="-m-0.5 inline-flex shrink-0 cursor-pointer rounded p-0.5 text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Eliminar comentário"
              title="Eliminar comentário"
            >
              <span className="sr-only">Eliminar comentário</span>
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          ) : null}
        </div>
        <p
          className="mt-0.5 break-words text-sm leading-relaxed text-zinc-600 antialiased whitespace-pre-wrap"
          lang="pt"
        >
          {node.body}
        </p>
      </div>
    </li>
  );
}

function RootCommentThread({
  node,
  isAdmin,
  userId,
  deletingId,
  onDelete,
  inlineReplyParentId,
  inlineReplyText,
  inlineReplySending,
  inlineReplyErr,
  onStartInlineReply,
  onInlineReplyText,
  onCancelInlineReply,
  onSubmitInlineReply,
}: ThreadProps) {
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const canDelete = isAdmin || (userId != null && userId === node.user.id);
  const flatReplies = useMemo(
    () => flattenRepliesInThread(node),
    [node],
  );
  const lastInThread = flatReplies[flatReplies.length - 1] ?? node;
  const inlineOpen = inlineReplyParentId === lastInThread.id;
  useEffect(() => {
    if (inlineOpen) {
      replyInputRef.current?.focus();
    }
  }, [inlineOpen]);
  return (
    <li>
      <div className="rounded-2xl border border-zinc-100 bg-gradient-to-b from-white to-zinc-50/60 p-4 sm:p-5">
        <article className="flex gap-3.5 sm:gap-4">
          <CommentBubbleIcon />
          <div className="min-w-0 flex-1 pt-0.5">
            <header className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-zinc-900">
                  {node.user.name}
                </span>
                <span className="hidden sm:inline" aria-hidden>
                  ·
                </span>
                <time
                  className="text-xs font-medium text-zinc-400"
                  dateTime={node.createdAt}
                >
                  {formatDate(node.createdAt)}
                </time>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(node.id)}
                    disabled={deletingId === node.id}
                    className="-m-0.5 inline-flex shrink-0 cursor-pointer rounded p-0.5 text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Eliminar comentário"
                    title="Eliminar comentário"
                  >
                    <span className="sr-only">Eliminar comentário</span>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </header>
            <p
              className="mt-2.5 text-sm leading-relaxed text-zinc-700 antialiased whitespace-pre-wrap"
              lang="pt"
            >
              {node.body}
            </p>
          </div>
        </article>

        {flatReplies.length > 0 && (
          <ul
            className="ml-0 mt-3 list-none space-y-0.5 border-t border-zinc-200/50 pt-3 pl-0 sm:ml-12 sm:pl-1"
            role="list"
            aria-label="Respostas"
          >
            {flatReplies.map((r) => (
              <ReplyRow
                key={r.id}
                node={r}
                isAdmin={isAdmin}
                userId={userId}
                deletingId={deletingId}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}

        <div
          className={
            flatReplies.length > 0
              ? 'ml-0 mt-3 sm:ml-12 sm:pl-1'
              : 'mt-3 flex gap-3.5 sm:gap-4'
          }
        >
          {flatReplies.length === 0 && (
            <div className="h-10 w-10 shrink-0" aria-hidden />
          )}
          <div
            className={
              flatReplies.length > 0
                ? 'border-l-2 border-amber-200/50 pl-3 sm:pl-3.5'
                : 'min-w-0 flex-1 border-l-2 border-amber-200/50 pl-3 sm:pl-3.5'
            }
          >
            <button
              type="button"
              onClick={() => onStartInlineReply(lastInThread)}
              className="cursor-pointer text-left text-xs font-medium text-amber-800/90"
            >
              {inlineOpen ? 'Fechar' : 'Responder'}
            </button>
            {inlineOpen && (
              <CommentInlineForm
                node={lastInThread}
                value={inlineReplyText}
                sending={inlineReplySending}
                err={inlineReplyErr}
                onChange={onInlineReplyText}
                onCancel={onCancelInlineReply}
                onSubmit={onSubmitInlineReply}
                inputRef={replyInputRef}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function PartnerCommentsSection({ partnerId, partnerName }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [take, setTake] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inlineReplyParentId, setInlineReplyParentId] = useState<
    string | null
  >(null);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [inlineReplySending, setInlineReplySending] = useState(false);
  const [inlineReplyErr, setInlineReplyErr] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(items), [items]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.marketplace.partnerComments(partnerId, { take });
      setItems(res.items);
      setHasMore(res.hasMore);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível carregar comentários.',
      );
    } finally {
      setLoading(false);
    }
  }, [partnerId, take]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onCreated = (e: Event) => {
      const d = (
        e as CustomEvent<{
          partnerId: string;
        }>
      ).detail;
      if (d?.partnerId !== partnerId) return;
      void load();
    };
    window.addEventListener('partner-comment-created', onCreated);
    return () => window.removeEventListener('partner-comment-created', onCreated);
  }, [partnerId, load]);

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Eliminar este comentário? Esta ação não pode ser anulada.')) {
      return;
    }
    setDeletingId(commentId);
    setError(null);
    try {
      await api.marketplace.deletePartnerComment(partnerId, commentId);
      const res = await api.marketplace.partnerComments(partnerId, { take });
      setItems(res.items);
      setHasMore(res.hasMore);
      window.dispatchEvent(
        new CustomEvent('partner-comment-deleted', { detail: { partnerId } }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível eliminar o comentário.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartInlineReply = (item: Item) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('open-auth-modal', { detail: { mode: 'login' } }),
      );
      return;
    }
    if (inlineReplyParentId === item.id) {
      setInlineReplyParentId(null);
      setInlineReplyText('');
      setInlineReplyErr(null);
      return;
    }
    setInlineReplyParentId(item.id);
    setInlineReplyText('');
    setInlineReplyErr(null);
  };

  const cancelInlineReply = () => {
    setInlineReplyParentId(null);
    setInlineReplyText('');
    setInlineReplyErr(null);
  };

  const submitInlineReply = async () => {
    if (!user || !inlineReplyParentId) return;
    const t = inlineReplyText.trim();
    if (!t || inlineReplySending) return;
    setInlineReplySending(true);
    setInlineReplyErr(null);
    try {
      const created = await api.marketplace.createPartnerComment(
        partnerId,
        { body: t, parentId: inlineReplyParentId },
      );
      window.dispatchEvent(
        new CustomEvent('partner-comment-created', {
          detail: { partnerId, newComment: created },
        }),
      );
      cancelInlineReply();
    } catch (e) {
      setInlineReplyErr(
        e instanceof Error
          ? e.message
          : 'Não foi possível publicar a resposta.',
      );
    } finally {
      setInlineReplySending(false);
    }
  };

  if (!loading && items.length === 0 && !error) {
    return null;
  }

  return (
    <section
      id="comentarios"
      className="scroll-mt-8 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white"
    >
      <div className="border-b border-amber-100/80 bg-gradient-to-br from-amber-50/90 via-white to-zinc-50/40 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Image
              src="/group.png"
              alt=""
              width={40}
              height={40}
              className="mt-0.5 h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-amber-200/50"
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                O que dizem de {partnerName}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Comentários deixados por membros da Comunidade RPM.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('partner-open-comment-modal', {
                  detail: { partnerId },
                }),
              );
            }}
            className="shrink-0 cursor-pointer rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-amber-300/60 sm:py-2.5 sm:text-sm"
          >
            Comentar
          </button>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        {error && !loading && (
          <p className="text-sm text-red-600" role="status">
            {error}
          </p>
        )}

        <ul className="space-y-3">
          {loading && items.length === 0 && !error && (
            <>
              <CommentSkeleton />
              <CommentSkeleton />
            </>
          )}

          {tree.map((n) => (
            <RootCommentThread
              key={n.id}
              node={n}
              isAdmin={isAdmin}
              userId={user?.id}
              deletingId={deletingId}
              onDelete={deleteComment}
              inlineReplyParentId={inlineReplyParentId}
              inlineReplyText={inlineReplyText}
              inlineReplySending={inlineReplySending}
              inlineReplyErr={inlineReplyErr}
              onStartInlineReply={handleStartInlineReply}
              onInlineReplyText={setInlineReplyText}
              onCancelInlineReply={cancelInlineReply}
              onSubmitInlineReply={() => void submitInlineReply()}
            />
          ))}

          {hasMore && !loading && items.length > 0 && (
            <li className="pt-1 text-center sm:text-left">
              <button
                type="button"
                onClick={() => {
                  setTake(2000);
                }}
                className="inline-flex cursor-pointer items-center justify-center rounded-full border border-amber-200/90 bg-amber-50/80 px-4 py-2 text-xs font-semibold text-amber-900/90"
              >
                Carregar mais comentários
              </button>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
