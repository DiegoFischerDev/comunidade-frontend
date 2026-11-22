'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
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

type ChatTheme = {
  label: string;
  shell: string;
  header: string;
  headerTitle: string;
  headerSub: string;
  headerClose: string;
  toolbar: string;
  toolbarBtn: string;
  thread: string;
  empty: string;
  bubbleMine: string;
  bubbleTheirs: string;
  labelMine: string;
  labelTheirs: string;
  timeMine: string;
  timeTheirs: string;
  daySeparator: string;
  composer: string;
  input: string;
  emojiBtn: string;
  emojiPanel: string;
  mic: string;
  micActive: string;
  send: string;
  ring: string;
  recordPanel: string;
};

const THEME: Record<CrmChatChannel, ChatTheme> = {
  WHATSAPP: {
    label: 'online',
    shell: 'border-[#d1d7db] bg-[#efeae2]',
    header: 'border-[#0a3d38]/20 bg-[#008069] text-white',
    headerTitle: 'text-white',
    headerSub: 'text-white/80',
    headerClose: 'border-white/25 bg-white/10 text-white hover:bg-white/20',
    toolbar: 'border-white/15 bg-[#00745d]',
    toolbarBtn:
      'border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/40',
    thread:
      'bg-[#efeae2] [background-image:url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cdc4\' fill-opacity=\'0.35\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")]',
    empty: 'text-[#667781]',
    bubbleMine: 'rounded-lg rounded-br-none bg-[#d9fdd3] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
    bubbleTheirs: 'rounded-lg rounded-bl-none bg-white text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
    labelMine: 'text-[#008069]',
    labelTheirs: 'text-[#667781]',
    timeMine: 'text-[#667781]',
    timeTheirs: 'text-[#667781]',
    daySeparator:
      'rounded-lg bg-[#e1f2fb] px-3 py-1 text-[12px] font-medium text-[#54656f] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
    composer: 'border-[#d1d7db] bg-[#f0f2f5]',
    input:
      'rounded-[24px] border-0 bg-white text-[#111b21] shadow-sm placeholder:text-[#667781] focus-visible:ring-[#25d366]/35',
    emojiBtn: 'border-0 bg-transparent text-[#54656f] hover:bg-black/5 hover:text-[#008069]',
    emojiPanel: 'border-[#d1d7db] bg-white text-[#111b21] shadow-lg',
    mic: 'border-0 bg-[#008069] text-white hover:bg-[#006d5b]',
    micActive: 'bg-[#e11d48] text-white hover:bg-[#be123c]',
    send: 'bg-[#008069] text-white hover:bg-[#006d5b]',
    ring: 'focus-visible:ring-[#25d366]/40',
    recordPanel: 'border-[#d1d7db] bg-white text-[#111b21]',
  },
  INSTAGRAM: {
    label: 'Instagram Direct',
    shell: 'border-[#dbdbdb] bg-white',
    header: 'border-[#efefef] bg-white text-[#262626]',
    headerTitle: 'text-[#262626]',
    headerSub: 'text-[#8e8e8e]',
    headerClose: 'border-[#dbdbdb] bg-white text-[#262626] hover:bg-[#fafafa]',
    toolbar: 'border-[#efefef] bg-[#fafafa]',
    toolbarBtn:
      'border-[#dbdbdb] bg-white text-[#262626] hover:bg-[#fafafa] focus-visible:ring-[#3797f0]/30',
    thread: 'bg-white',
    empty: 'text-[#8e8e8e]',
    bubbleMine: 'rounded-[22px] bg-[#3797f0] text-white',
    bubbleTheirs: 'rounded-[22px] bg-[#efefef] text-[#262626]',
    labelMine: 'text-white/85',
    labelTheirs: 'text-[#8e8e8e]',
    timeMine: 'text-white/70',
    timeTheirs: 'text-[#8e8e8e]',
    daySeparator: 'text-[12px] font-semibold text-[#8e8e8e]',
    composer: 'border-[#efefef] bg-white',
    input:
      'rounded-full border border-[#dbdbdb] bg-white text-[#262626] placeholder:text-[#8e8e8e] focus-visible:ring-[#3797f0]/30',
    emojiBtn: 'border border-[#dbdbdb] bg-white text-[#262626] hover:bg-[#fafafa]',
    emojiPanel: 'border-[#dbdbdb] bg-white text-[#262626] shadow-lg',
    mic: 'border border-[#dbdbdb] bg-white text-[#262626] hover:bg-[#fafafa]',
    micActive: 'border-[#f9a8d4] bg-[#fce7f3] text-[#be185d]',
    send: 'bg-[#3797f0] text-white hover:bg-[#2d86d9]',
    ring: 'focus-visible:ring-[#3797f0]/40',
    recordPanel: 'border-[#dbdbdb] bg-[#fafafa] text-[#262626]',
  },
};

/** Principais emojis usados em chats WhatsApp / Instagram. */
const CHAT_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗',
  '😋', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
  '🤔', '🤐', '🤨', '😐', '😑', '😶', '🙄', '😏',
  '😣', '😥', '😮', '😯', '😪', '😫', '🥱', '😴',
  '🤤', '😒', '😓', '😔', '😕', '🙃', '😲', '☹️',
  '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦',
  '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵',
  '🥶', '😳', '😵', '😡', '😠', '🤬', '😷', '🤒',
  '🤕', '🤢', '🤮', '🤧', '😈', '👿', '💀', '☠️',
  '💩', '🤡', '👻', '👽', '🤖', '😺', '😸', '😹',
  '😻', '😼', '😽', '🙀', '😿', '😾', '👍', '👎',
  '👏', '🙌', '👐', '🤝', '🙏', '💪', '✌️', '🤞',
  '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆',
  '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙',
  '🫡', '🫶', '💯', '🔥', '✨', '⭐', '🌟', '💥',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '💘', '💝', '✅', '❌', '❗', '❓', '💬', '👀',
  '🎉', '🎊', '🥳', '😎', '☀️', '🌙', '🌈', '☕',
] as const;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayKeyFromIso(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDaySeparator(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(date);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((today - target) / dayMs);

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function formatBubbleTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function EmojiIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10h.01M15.5 10h.01" />
      <path d="M8.5 14.5s1.5 2 3.5 2 3.5-2 3.5-2" />
    </svg>
  );
}

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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 5h3.5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm6.5 0H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function formatAudioClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function ChatVoiceNotePlayer({
  src,
  mine,
  channel,
}: {
  src: string;
  mine: boolean;
  channel: CrmChatChannel;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return;
    node.playbackRate = 2;

    const onLoaded = () => {
      if (Number.isFinite(node.duration)) setDuration(node.duration);
    };
    const onTime = () => setCurrent(node.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };

    node.addEventListener('loadedmetadata', onLoaded);
    node.addEventListener('durationchange', onLoaded);
    node.addEventListener('timeupdate', onTime);
    node.addEventListener('play', onPlay);
    node.addEventListener('pause', onPause);
    node.addEventListener('ended', onEnded);
    return () => {
      node.removeEventListener('loadedmetadata', onLoaded);
      node.removeEventListener('durationchange', onLoaded);
      node.removeEventListener('timeupdate', onTime);
      node.removeEventListener('play', onPlay);
      node.removeEventListener('pause', onPause);
      node.removeEventListener('ended', onEnded);
    };
  }, [src]);

  async function togglePlayback() {
    const node = audioRef.current;
    if (!node) return;
    if (node.paused) {
      node.playbackRate = 2;
      try {
        await node.play();
      } catch {
        /* autoplay / interactivity bloqueada — o utilizador pode tentar de novo */
      }
      return;
    }
    node.pause();
  }

  function seek(event: ReactMouseEvent<HTMLDivElement>) {
    const node = audioRef.current;
    if (!node || !Number.isFinite(duration) || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    node.currentTime = ratio * duration;
    setCurrent(node.currentTime);
  }

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const clock = formatAudioClock(playing || current > 0 ? current : duration);
  const isWhatsapp = channel === 'WHATSAPP';
  const playBtn = mine
    ? isWhatsapp
      ? 'bg-[#008069] text-white'
      : 'bg-white/25 text-white'
    : isWhatsapp
      ? 'bg-[#008069] text-white'
      : 'bg-[#3797f0] text-white';
  const track = mine
    ? isWhatsapp
      ? 'bg-[#008069]/25'
      : 'bg-white/30'
    : isWhatsapp
      ? 'bg-[#111b21]/15'
      : 'bg-[#262626]/15';
  const fill = mine
    ? isWhatsapp
      ? 'bg-[#008069]'
      : 'bg-white'
    : isWhatsapp
      ? 'bg-[#008069]'
      : 'bg-[#3797f0]';
  const meta = mine
    ? isWhatsapp
      ? 'text-[#667781]'
      : 'text-white/80'
    : isWhatsapp
      ? 'text-[#667781]'
      : 'text-[#8e8e8e]';

  return (
    <div className="flex min-w-[11rem] max-w-full items-center gap-2 py-0.5">
      <button
        type="button"
        onClick={() => void togglePlayback()}
        className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full ${playBtn}`}
        aria-label={playing ? 'Pausar nota de voz' : 'Reproduzir nota de voz'}
      >
        {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          role="slider"
          aria-label="Progresso do áudio"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, Math.floor(duration))}
          aria-valuenow={Math.floor(current)}
          tabIndex={0}
          className={`relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full ${track}`}
          onClick={seek}
        >
          <span className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${progress}%` }} />
        </div>
        <p className={`mt-1 text-[10px] leading-none tabular-nums ${meta}`}>{clock}</p>
      </div>
      <audio ref={audioRef} preload="metadata" src={src} className="hidden" />
    </div>
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

function SendIcon({ className }: { className?: string }) {
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
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9l20-7z" />
    </svg>
  );
}

function VideoCallIcon({ className }: { className?: string }) {
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
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function leadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function LeadMessageAvatar({
  name,
  imageUrl,
  size = 'sm',
}: {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = !imgFailed && imageUrl ? resolveUploadsUrl(imageUrl) : '';
  const dim = size === 'md' ? 'h-10 w-10 text-xs' : 'h-6 w-6 text-[10px]';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full border border-black/10 bg-white object-cover`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full bg-[#25d366] font-semibold text-white`}
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
  onAdminReplied,
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
  /** Admin enviou texto/áudio/link — limpa o badge de não respondidas desse canal. */
  onAdminReplied?: () => void;
}) {
  const titleId = useId();
  const emojiPanelId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const [messages, setMessages] = useState<CrmChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
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
  const afterStopActionRef = useRef<'discard' | 'send' | null>(null);
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
    setEmojiOpen(false);
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
    afterStopActionRef.current = null;
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
        const action = afterStopActionRef.current;
        afterStopActionRef.current = null;
        const blob = new Blob(mediaChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        mediaChunksRef.current = [];
        setRecording(false);
        if (action === 'discard') {
          clearRecordingPreview();
          return;
        }
        if (blob.size < 1) {
          setError('Não foi possível gravar o áudio.');
          clearRecordingPreview();
          return;
        }
        if (action === 'send') {
          void sendAudioBlob(blob);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        recordedUrlRef.current = objectUrl;
        setRecordedBlob(blob);
        setRecordedUrl(objectUrl);
      };
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((current) => {
          if (current >= 119) {
            // Limite: para e deixa pré-escuta (sem enviar automaticamente).
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

  function discardRecording() {
    if (sendingAudio) return;
    if (recording) {
      afterStopActionRef.current = 'discard';
      stopRecording();
      return;
    }
    clearRecordingPreview();
  }

  function sendRecording() {
    if (sendingAudio) return;
    if (recording) {
      afterStopActionRef.current = 'send';
      stopRecording();
      return;
    }
    if (recordedBlob) void sendAudioBlob(recordedBlob);
  }

  async function sendAudioBlob(blob: Blob) {
    if (sendingAudio) return;
    setSendingAudio(true);
    setError('');
    try {
      const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
      const result =
        source.kind === 'rafacall'
          ? await api.admin.rafacall.sendCrmAudio(
              source.bookingId,
              channel,
              blob,
              `nota-de-voz.${ext}`,
            )
          : await api.admin.chatbots.crm.sendAudio(
              source.slug,
              source.leadId,
              channel,
              blob,
              `nota-de-voz.${ext}`,
            );
      stickToBottom.current = true;
      setMessages((current) => mergeMessages(current, [result.message]));
      clearRecordingPreview();
      if (result.botPaused) onBotPaused?.();
      onAdminReplied?.();
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, { context: 'Ao enviar áudio' }));
      const objectUrl = URL.createObjectURL(blob);
      recordedUrlRef.current = objectUrl;
      setRecordedBlob(blob);
      setRecordedUrl(objectUrl);
    } finally {
      setSendingAudio(false);
    }
  }

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const closeOnMobile = () => {
      if (media.matches) setEmojiOpen(false);
    };
    closeOnMobile();
    media.addEventListener('change', closeOnMobile);
    return () => media.removeEventListener('change', closeOnMobile);
  }, []);

  useEffect(() => {
    if (suspendEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (emojiOpen) {
        setEmojiOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [emojiOpen, onClose, suspendEscape]);

  function insertEmoji(emoji: string) {
    const node = draftRef.current;
    const max = 4000;
    if (!node) {
      setDraft((current) => (current + emoji).slice(0, max));
      return;
    }
    const start = node.selectionStart ?? draft.length;
    const end = node.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, max);
    const cursor = Math.min(start + emoji.length, next.length);
    setDraft(next);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(cursor, cursor);
    });
  }

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
      onAdminReplied?.();
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, { context: 'Ao enviar' }));
    } finally {
      setSending(false);
      setSendingLink(false);
    }
  }

  const isWhatsapp = channel === 'WHATSAPP';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none bg-black/50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.25rem,env(safe-area-inset-top))] sm:items-center sm:p-3">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex h-[calc(100dvh-0.75rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] max-h-[calc(100dvh-0.75rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] w-full max-w-4xl flex-col overflow-hidden overflow-x-hidden border shadow-lg sm:h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-1.5rem)] ${
          isWhatsapp ? 'rounded-[18px]' : 'rounded-[24px]'
        } ${theme.shell}`}
      >
        <header className={`min-w-0 shrink-0 border-b px-3 py-2.5 sm:px-4 ${theme.header}`}>
          <div className="flex min-w-0 items-center gap-3">
            <LeadMessageAvatar name={title} imageUrl={leadImageUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p id={titleId} className={`truncate text-[15px] font-semibold leading-tight ${theme.headerTitle}`}>
                {title}
              </p>
              <p className={`text-[12px] font-medium leading-tight ${theme.headerSub}`}>{theme.label}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 ${theme.headerClose} ${theme.ring}`}
              aria-label="Fechar"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          {badges || actions ? (
            <div className={`mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border px-2 py-2 ${theme.toolbar}`}>
              {badges}
              {actions}
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit({ template: 'scheduling-link' })}
                className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${theme.toolbarBtn}`}
              >
                <VideoCallIcon className="h-3.5 w-3.5 shrink-0" />
                {sendingLink ? 'A enviar…' : 'Agendar chamada'}
              </button>
            </div>
          ) : null}
        </header>

        <div
          ref={listRef}
          className={`min-h-0 min-w-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 ${theme.thread}`}
          onScroll={(event) => {
            const node = event.currentTarget;
            const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
            stickToBottom.current = distance < 48;
          }}
        >
          {loading ? <p className={`text-sm ${theme.empty}`}>A carregar conversa…</p> : null}
          {!loading && messages.length === 0 ? (
            <p className={`text-sm ${theme.empty}`}>Ainda não há mensagens neste canal.</p>
          ) : null}
          {messages.map((message, index) => {
            const mine = message.author !== 'LEAD';
            const label =
              message.author === 'ADMIN'
                ? 'Rafa'
                : message.author === 'BOT'
                  ? botName
                  : title;
            const time = formatBubbleTime(message.createdAt);
            const dayKey = dayKeyFromIso(message.createdAt);
            const previousDayKey =
              index > 0 ? dayKeyFromIso(messages[index - 1]?.createdAt ?? '') : null;
            const dayLabel = dayKey && dayKey !== previousDayKey ? formatDaySeparator(message.createdAt) : '';
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
              <div key={message.id} className="min-w-0 space-y-1.5">
                {dayLabel ? (
                  <div className="flex justify-center py-1.5">
                    <span className={theme.daySeparator}>{dayLabel}</span>
                  </div>
                ) : null}
                <div
                  className={`flex min-w-0 items-end gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  {!mine ? avatar : <span className="w-6 shrink-0" aria-hidden />}
                  <div
                    className={`min-w-0 max-w-[min(78%,28rem)] break-words px-2.5 py-1.5 text-[14px] leading-snug ${
                      mine ? theme.bubbleMine : theme.bubbleTheirs
                    }`}
                  >
                    <p className={`mb-0.5 text-[10px] font-semibold ${mine ? theme.labelMine : theme.labelTheirs}`}>
                      {label}
                    </p>
                    {message.kind === 'AUDIO' && message.mediaUrl ? (
                      <div className="min-w-0 overflow-hidden">
                        <ChatVoiceNotePlayer
                          src={resolveUploadsUrl(message.mediaUrl)}
                          mine={mine}
                          channel={channel}
                        />
                      </div>
                    ) : message.kind === 'AUDIO_TRANSCRIPT' ? (
                      <p className="flex items-start gap-1.5 break-words">
                        <MicIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0">{message.body}</span>
                      </p>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    )}
                    {time ? (
                      <p className={`mt-1 text-right text-[10px] leading-none ${mine ? theme.timeMine : theme.timeTheirs}`}>
                        {time}
                      </p>
                    ) : null}
                  </div>
                  {mine ? avatar : <span className="w-6 shrink-0" aria-hidden />}
                </div>
              </div>
            );
          })}
        </div>

        <form
          className={`min-w-0 shrink-0 overflow-x-hidden border-t p-2.5 sm:p-3 ${theme.composer}`}
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
            <div className={`mb-2 flex min-w-0 flex-col gap-2 rounded-2xl border px-3 py-2 ${theme.recordPanel}`}>
              {recording ? (
                <p className="text-sm font-medium text-red-700">
                  A gravar… {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                  {String(recordSeconds % 60).padStart(2, '0')}
                </p>
              ) : recordedUrl ? (
                <div className="min-w-0 overflow-hidden">
                  <ChatVoiceNotePlayer src={recordedUrl} mine channel={channel} />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sendingAudio}
                  onClick={discardRecording}
                  className="inline-flex h-9 cursor-pointer items-center rounded-full border border-current/20 px-3 text-xs font-semibold disabled:opacity-50"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  disabled={sendingAudio}
                  onClick={sendRecording}
                  className={`inline-flex h-9 cursor-pointer items-center rounded-full px-3 text-xs font-semibold disabled:opacity-50 ${theme.send}`}
                >
                  {sendingAudio ? 'A enviar…' : 'Enviar'}
                </button>
              </div>
            </div>
          ) : null}
          {emojiOpen ? (
            <div
              id={emojiPanelId}
              role="dialog"
              aria-label="Emojis"
              className={`mb-2 hidden max-h-52 min-w-0 overflow-y-auto overscroll-contain rounded-2xl border p-2 md:block ${theme.emojiPanel}`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold opacity-70">Emojis</p>
                <button
                  type="button"
                  onClick={() => setEmojiOpen(false)}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
                  aria-label="Fechar emojis"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-10">
                {CHAT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    disabled={busy}
                    onClick={() => insertEmoji(emoji)}
                    className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-lg text-xl leading-none transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Inserir ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex min-w-0 items-end gap-2">
            <button
              type="button"
              disabled={busy}
              aria-expanded={emojiOpen}
              aria-controls={emojiPanelId}
              onClick={() => setEmojiOpen((open) => !open)}
              className={`hidden h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex ${theme.emojiBtn}`}
              aria-label={emojiOpen ? 'Fechar emojis' : 'Abrir emojis'}
            >
              <EmojiIcon className="h-5 w-5" />
            </button>
            <label className="sr-only" htmlFor={`${titleId}-draft`}>
              Mensagem
            </label>
            <textarea
              ref={draftRef}
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
              placeholder="Mensagem"
              className={`min-h-[3.25rem] min-w-0 flex-1 resize-none px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 ${theme.input} ${theme.ring}`}
            />
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmojiOpen(false);
                  void startRecording();
                }}
                className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50 ${
                  recording ? theme.micActive : theme.mic
                }`}
                aria-label="Gravar nota de voz"
              >
                <MicIcon className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={busy || draft.trim().length === 0}
                className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50 ${theme.send}`}
                aria-label={sending ? 'A enviar' : 'Enviar'}
              >
                {sending ? (
                  <span className="text-xs font-semibold">…</span>
                ) : (
                  <SendIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
