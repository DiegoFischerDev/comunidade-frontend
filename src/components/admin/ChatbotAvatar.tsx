import Image from 'next/image';
import type { AdminChatbotSlug } from '@/lib/api';
import { chatbotAvatarSrc } from '@/lib/chatbot-avatars';

const SIZE_PX = {
  sm: 24,
  md: 32,
  lg: 40,
} as const;

type Size = keyof typeof SIZE_PX;

type Props = {
  slug: AdminChatbotSlug | string;
  name: string;
  size?: Size;
  className?: string;
  /** Anel branco quando o botão está seleccionado (fundo brand). */
  onBrand?: boolean;
};

export function ChatbotAvatar({
  slug,
  name,
  size = 'sm',
  className = '',
  onBrand = false,
}: Props) {
  const px = SIZE_PX[size];
  const src = chatbotAvatarSrc(slug);
  const ring = onBrand ? 'ring-2 ring-white/90' : 'ring-1 ring-black/5';

  if (!src) {
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-page text-[0.65rem] font-semibold uppercase text-muted ${ring} ${className}`}
        style={{ width: px, height: px }}
      >
        {name.trim().charAt(0) || '?'}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={px}
      height={px}
      className={`shrink-0 rounded-full object-cover ${ring} ${className}`}
      style={{ width: px, height: px }}
      sizes={`${px}px`}
    />
  );
}
