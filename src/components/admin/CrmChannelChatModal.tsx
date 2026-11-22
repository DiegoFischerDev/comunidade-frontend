'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  api,
  getUserFacingApiError,
  type AdminChatbotSlug,
  type CrmChannelMessage,
  type CrmChatChannel,
} from '@/lib/api';
import { ChatbotAvatar } from '@/components/admin/ChatbotAvatar';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';

export type CrmChatSource =
  | { kind: 'rafacall'; bookingId: string }
  | { kind: 'lead'; slug: string; leadId: string };

const RAFA_AVATAR_SLUG: AdminChatbotSlug = 'outros';

const THEME: Record<
  CrmChatChannel,
  { label: string; accent: string; soft: string; mine: string; ring: string }
> = {
  WHATSAPP: {
    label: 'WhatsApp',
    accent: 'text-[#128C7E]',
    soft: 'bg-[#25D366]/10',
    mine: 'bg-[#25D366] text-white',
    ring: 'focus-visible:ring-[#25D366]/40',
  },
  INSTAGRAM: {
    label: 'Instagram',
    accent: 'text-[#C13584]',
    soft: 'bg-[#E1306C]/10',
    mine: 'bg-[#E1306C] text-white',
    ring: 'focus-visible:ring-[#E1306C]/40',
  },
};

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function leadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function LeadMessageAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = !imgFailed && imageUrl ? resolveUploadsUrl(imageUrl) : '';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-6 w-6 shrink-0 rounded-full border border-border bg-page object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[10px] font-semibold text-white"
    >
      {leadInitials(name)}
    </span>
  );
}

function MessageAuthorAvatar({
  author,
  leadName,
  leadImageUrl,
  botSlug,
  botName,
}: {
  author: CrmChannelMessage['author'];
  leadName: string;
  leadImageUrl?: string | null;
  botSlug: AdminChatbotSlug;
  botName: string;
}) {
  if (author === 'LEAD') {
    return <LeadMessageAvatar name={leadName} imageUrl={leadImageUrl} />;
  }
  if (author === 'BOT') {
    return <ChatbotAvatar slug={botSlug} name={botName} size="sm" />;
  }
  return <ChatbotAvatar slug={RAFA_AVATAR_SLUG} name="Rafa" size="sm" />;
}

function mergeMessages(current: CrmChannelMessage[], incoming: CrmChannelMessage[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort((left, right) => {
    const byTime = left.createdAt.localeCompare(right.createdAt);
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
  });
}

export function CrmChannelChatModal({
  source,
  channel,
  title,
  leadImageUrl,
  botSlug,
  botName,
  badges,
  actions,
  suspendEscape,
  onClose,
  onBotPaused,
}: {
  source: CrmChatSource;
  channel: CrmChatChannel;
  title: string;
  leadImageUrl?: string | null;
  botSlug: AdminChatbotSlug;
  botName: string;
  badges?: ReactNode;
  actions?: ReactNode;
  suspendEscape?: boolean;
  onClose: () => void;
  onBotPaused?: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [messages, setMessages] = useState<CrmChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const recordedUrlRef = useRef<string | null>(null);
  const theme = THEME[channel];
  const busy = sending || sendingLink || sendingAudio || recording;
  const bookingId = source.kind === 'rafacall' ? source.bookingId : '';
  const leadSlug = source.kind === 'lead' ? source.slug : '';
  const leadId = source.kind === 'lead' ? source.leadId : '';
  const sourceKey =
    source.kind === 'rafacall'
      ? `rafacall:${bookingId}`
      : `lead:${leadSlug}:${leadId}`;

  const load = useCallback(
    async (after?: string | null) => {
      const page =
        bookingId
          ? await api.admin.rafacall.listCrmMessages(bookingId, channel, after)
          : await api.admin.chatbots.crm.listMessages(leadSlug, leadId, channel, after);
      return page.messages;
    },
    [bookingId, channel, leadId, leadSlug],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setMessages([]);
    stickToBottom.current = true;
    void load(null)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getUserFacingApiError(err, { context: 'Ao abrir a conversa' }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, sourceKey]);

  useEffect(() => {
    if (loading) return;
    const timer = window.setInterval(() => {
      const after = messages[messages.length - 1]?.id;
      void load(after || null)
        .then((rows) => {
          if (rows.length === 0) return;
          setMessages((current) => mergeMessages(current, rows));
        })
        .catch(() => {
          /* o próximo ciclo tenta de novo */
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [load, loading, messages]);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    // No mobile o focus abre o teclado e empurra o layout — só autofocus em desktop.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      return;
    }
    const node = dialogRef.current;
    node?.querySelector<HTMLElement>('textarea')?.focus();
  }, [sourceKey, channel]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      if (recordTimerRef.current != null) window.clearInterval(recordTimerRef.current);
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    };
  }, []);

  function stopMediaTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function clearRecordingPreview() {
    if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    recordedUrlRef.current = null;
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordSeconds(0);
  }

  async function startRecording() {
    if (busy) return;
    setError('');
    clearRecordingPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      mediaChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopMediaTracks();
        if (recordTimerRef.current != null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        const blob = new Blob(mediaChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        mediaChunksRef.current = [];
        if (blob.size < 1) {
          setRecording(false);
          setError('Não foi possível gravar o áudio.');
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        recordedUrlRef.current = objectUrl;
        setRecordedBlob(blob);
        setRecordedUrl(objectUrl);
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((current) => {
          if (current >= 119) {
            stopRecording();
            return current;
          }
          return current + 1;
        });
      }, 1000);
    } catch {
      stopMediaTracks();
      setError('Não foi possível aceder ao microfone.');
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      stopMediaTracks();
      setRecording(false);
    }
    mediaRecorderRef.current = null;
  }

  async function sendRecordedAudio() {
    if (!recordedBlob || sendingAudio) return;
    setSendingAudio(true);
    setError('');
    try {
      const ext = recordedBlob.type.includes('ogg') ? 'ogg' : 'webm';
      const result =
        source.kind === 'rafacall'
          ? await api.admin.rafacall.sendCrmAudio(
              source.bookingId,
              channel,
              recordedBlob,
              `nota-de-voz.${ext}`,
            )
          : await api.admin.chatbots.crm.sendAudio(
              source.slug,
              source.leadId,
              channel,
              recordedBlob,
              `nota-de-voz.${ext}`,
            );
      stickToBottom.current = true;
      setMessages((current) => mergeMessages(current, [result.message]));
      clearRecordingPreview();
      if (result.botPaused) onBotPaused?.();
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, { context: 'Ao enviar áudio' }));
    } finally {
      setSendingAudio(false);
    }
  }

  useEffect(() => {
    if (suspendEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, suspendEscape]);

  async function submit(body: { text?: string; template?: 'scheduling-link' }) {
    if (sending || sendingLink) return;
    const isLink = body.template === 'scheduling-link';
    if (!isLink && !(body.text || '').trim()) return;
    if (isLink) setSendingLink(true);
    else setSending(true);
    setError('');
    try {
      const result =
        source.kind === 'rafacall'
          ? await api.admin.rafacall.sendCrmMessage(source.bookingId, { channel, ...body })
          : await api.admin.chatbots.crm.sendMessage(source.slug, source.leadId, {
              channel,
              ...body,
            });
      stickToBottom.current = true;
      setMessages((current) => mergeMessages(current, [result.message]));
      if (!isLink) setDraft('');
      if (result.botPaused) onBotPaused?.();
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, { context: 'Ao enviar' }));
    } finally {
      setSending(false);
      setSendingLink(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-none bg-black/50 p-3 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(44rem,calc(100dvh-1.5rem))] w-full max-w-xl flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-sm"
      >
        <header className={`border-b border-border px-4 py-3 ${theme.soft}`}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p id={titleId} className="truncate text-base font-semibold text-foreground">
                {title}
              </p>
              <p className={`text-xs font-semibold ${theme.accent}`}>{theme.label}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-card text-muted shadow-sm transition-colors hover:bg-page hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              aria-label="Fechar"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          {badges || actions ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {badges}
              {actions}
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit({ template: 'scheduling-link' })}
                className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border bg-page px-2.5 text-xs font-medium text-foreground transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:px-2 sm:text-[11px]"
              >
                {sendingLink ? 'A enviar…' : 'Enviar link de agendar'}
              </button>
            </div>
          ) : null}
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-page px-3 py-3"
          onScroll={(event) => {
            const node = event.currentTarget;
            const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
            stickToBottom.current = distance < 48;
          }}
        >
          {loading ? <p className="text-sm text-muted">A carregar conversa…</p> : null}
          {!loading && messages.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há mensagens neste canal.</p>
          ) : null}
          {messages.map((message) => {
            const mine = message.author !== 'LEAD';
            const label =
              message.author === 'ADMIN'
                ? 'Rafa'
                : message.author === 'BOT'
                  ? botName
                  : null;
            const avatar = (
              <MessageAuthorAvatar
                author={message.author}
                leadName={title}
                leadImageUrl={leadImageUrl}
                botSlug={botSlug}
                botName={botName}
              />
            );
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
              >
                {!mine ? avatar : null}
                <div
                  className={`max-w-[min(85%,22rem)] rounded-[14px] px-3 py-2 text-sm leading-relaxed ${
                    mine ? theme.mine : 'border border-border bg-card text-foreground'
                  }`}
                >
                  {label ? (
                    <p
                      className={`mb-0.5 text-[10px] font-semibold ${
                        mine ? 'text-white/80' : 'text-muted'
                      }`}
                    >
                      {label}
                    </p>
                  ) : null}
                  {message.kind === 'AUDIO' && message.mediaUrl ? (
                    <div className="space-y-1">
                      <p className={`flex items-center gap-1.5 text-[11px] ${mine ? 'text-white/85' : 'text-muted'}`}>
                        <MicIcon className="h-3.5 w-3.5 shrink-0" />
                        {message.body || 'Nota de voz'}
                      </p>
                      <audio
                        controls
                        preload="metadata"
                        src={resolveUploadsUrl(message.mediaUrl)}
                        className="max-w-full"
                      />
                    </div>
                  ) : message.kind === 'AUDIO_TRANSCRIPT' ? (
                    <p className="flex items-start gap-1.5">
                      <MicIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{message.body}</span>
                    </p>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.body}</p>
                  )}
                </div>
                {mine ? avatar : null}
              </div>
            );
          })}
        </div>

        <form
          className="border-t border-border bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit({ text: draft });
          }}
        >
          {error ? (
            <p role="alert" className="mb-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          {recording || recordedBlob ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-[14px] border border-border bg-page px-3 py-2">
              {recording ? (
                <p className="text-sm font-medium text-red-700">
                  A gravar… {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                  {String(recordSeconds % 60).padStart(2, '0')}
                </p>
              ) : recordedUrl ? (
                <audio controls src={recordedUrl} className="max-w-full flex-1" />
              ) : null}
              <div className="ml-auto flex flex-wrap gap-2">
                {recording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex h-9 cursor-pointer items-center rounded-[12px] border border-border bg-card px-3 text-xs font-semibold"
                  >
                    Parar
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={sendingAudio}
                      onClick={clearRecordingPreview}
                      className="inline-flex h-9 cursor-pointer items-center rounded-[12px] border border-border bg-card px-3 text-xs font-semibold disabled:opacity-50"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      disabled={sendingAudio}
                      onClick={() => void sendRecordedAudio()}
                      className="inline-flex h-9 cursor-pointer items-center rounded-[12px] bg-brand-primary px-3 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {sendingAudio ? 'A enviar…' : 'Enviar áudio'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void startRecording()}
              className={`inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border bg-page ${theme.accent} disabled:cursor-not-allowed disabled:opacity-50 ${
                recording ? 'border-red-300 bg-red-50' : 'border-border'
              }`}
              aria-label="Gravar nota de voz"
            >
              <MicIcon className="h-5 w-5" />
            </button>
            <label className="sr-only" htmlFor={`${titleId}-draft`}>
              Mensagem
            </label>
            <textarea
              id={`${titleId}-draft`}
              value={draft}
              rows={2}
              maxLength={4000}
              disabled={busy}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit({ text: draft });
                }
              }}
              placeholder={`Escrever no ${theme.label}`}
              className={`min-h-12 flex-1 resize-none rounded-[14px] border border-border bg-page px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 ${theme.ring}`}
            />
            <button
              type="submit"
              disabled={busy || draft.trim().length === 0}
              className="inline-flex h-12 cursor-pointer items-center rounded-[14px] bg-brand-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'A enviar…' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
