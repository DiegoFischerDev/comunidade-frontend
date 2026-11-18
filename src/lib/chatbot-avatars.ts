import type { AdminChatbotSlug } from '@/lib/api';

/** Avatares em `/public` para Joana / Bruna / Gabi. */
export const CHATBOT_AVATAR_SRC: Partial<Record<AdminChatbotSlug, string>> = {
  joana: '/joana.png',
  bruna: '/Bruna.png',
  gabi: '/Gabi.png',
};

export function chatbotAvatarSrc(
  slug: AdminChatbotSlug | string,
): string | null {
  return CHATBOT_AVATAR_SRC[slug as AdminChatbotSlug] ?? null;
}
