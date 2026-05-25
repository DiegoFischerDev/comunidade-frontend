import {
  fallbackHttpErrorMessagePt,
  getUserFacingApiError,
  inferMultipartContext,
  inferUserMessageContext,
  rethrowAsUserFacingError,
  type HttpErrorLike,
} from './api-error-message';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** JWT atual (partilhado entre abas do mesmo site via `localStorage`). */
export const AUTH_TOKEN_STORAGE_KEY = 'comunidade_token';

/**
 * Cópia do JWT para "manter sessão neste dispositivo" após logout + refresh.
 * Não substitui boas práticas em computadores partilhados (limpar dados do site remove).
 */
export const AUTH_DEVICE_SESSION_STORAGE_KEY = 'comunidade_device_session_token';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
};

export const clearAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

export function setDeviceSessionToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_DEVICE_SESSION_STORAGE_KEY, token);
  }
}

export function getDeviceSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_DEVICE_SESSION_STORAGE_KEY);
}

export function clearDeviceSessionToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_DEVICE_SESSION_STORAGE_KEY);
  }
}

export const getAuthToken = getToken;

/** Erros HTTP da API com código de estado (ex.: 413) para o UI decidir mensagens. */
export type ApiHttpError = HttpErrorLike;
export { getUserFacingApiError } from './api-error-message';

function enrichApiHttpError(
  err: ApiHttpError,
  res: Response,
  data: unknown,
): ApiHttpError {
  err.status = res.status;
  const d = data as { code?: unknown };
  if (typeof d?.code === 'string') {
    err.code = d.code;
  }
  return err;
}

type RequestOptions = RequestInit & {
  token?: string | null;
  /** UUID v4 persistente no browser (cabeçalho `X-Partner-Device-Id`). */
  partnerDeviceId?: string | null;
  /** Prefixo da mensagem de erro em português (ex.: «Ao guardar o anúncio»). */
  userMessageContext?: string;
};

/** Mensagem antiga da API que não queremos mostrar ao utilizador (ex.: stage ainda no deploy anterior). */
function shouldHideApiMessage(text: string): boolean {
  return text.includes('Perfil de afiliado não encontrado');
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    token = getToken(),
    partnerDeviceId,
    userMessageContext,
    ...init
  } = options;
  const method = (init.method ?? 'GET').toString().toUpperCase();
  const headers: HeadersInit = {
    ...(init.headers as Record<string, string>),
  };
  if (method !== 'GET' && method !== 'HEAD') {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  if (partnerDeviceId) {
    (headers as Record<string, string>)['X-Partner-Device-Id'] = partnerDeviceId;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (e) {
    rethrowAsUserFacingError(e, path, { context: userMessageContext });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = Array.isArray(data.message)
      ? data.message[0]
      : data.message || data.error || fallbackHttpErrorMessagePt(res.status);
    msg = typeof msg === 'string' ? msg : String(msg);
    if (shouldHideApiMessage(msg)) {
      const err = new Error(
        getUserFacingApiError(
          { message: '', status: res.status } as ApiHttpError,
          { context: userMessageContext },
        ),
      ) as ApiHttpError;
      throw enrichApiHttpError(err, res, data);
    }
    const err = new Error(
      getUserFacingApiError(
        Object.assign(new Error(msg), { status: res.status }),
        { context: userMessageContext },
      ),
    ) as ApiHttpError;
    throw enrichApiHttpError(err, res, data);
  }
  return data as T;
}

async function requestFormData<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestOptions, 'body' | 'headers'> & { headers?: HeadersInit } = {},
): Promise<T> {
  const { token = getToken(), userMessageContext, ...init } = options;
  const headers: HeadersInit = {
    ...(init.headers as Record<string, string>),
  };
  // NÃO definir Content-Type: o browser define boundary para multipart/form-data
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const msgContext = userMessageContext ?? inferUserMessageContext(path);
  const isMultipart = inferMultipartContext(path);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      method: (init.method ?? 'POST') as RequestInit['method'],
      headers,
      body: formData,
    });
  } catch (e) {
    rethrowAsUserFacingError(e, path, {
      context: msgContext,
      isMultipart,
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = Array.isArray((data as { message?: unknown }).message)
      ? (data as { message: string[] }).message[0]
      : (data as { message?: string; error?: string }).message ||
        (data as { error?: string }).error ||
        fallbackHttpErrorMessagePt(res.status);
    msg = typeof msg === 'string' ? msg : String(msg);
    if (shouldHideApiMessage(msg)) {
      const err = new Error(
        getUserFacingApiError(
          { message: '', status: res.status } as ApiHttpError,
          { context: msgContext, isMultipart },
        ),
      ) as ApiHttpError;
      throw enrichApiHttpError(err, res, data);
    }
    const err = new Error(
      getUserFacingApiError(
        Object.assign(new Error(msg), { status: res.status }),
        { context: msgContext, isMultipart },
      ),
    ) as ApiHttpError;
    throw enrichApiHttpError(err, res, data);
  }
  return data as T;
}

export const api = {
  auth: {
    login: (params: {
      password: string;
      whatsapp?: string;
      email?: string;
    }) =>
      request<{ user: { id: string; email: string | null; whatsapp: string | null; role: string }; token: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(params) },
      ),
    forgotPassword: (email: string) =>
      request<{ success: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }),
    resetPassword: (params: {
      email: string;
      code: string;
      newPassword: string;
    }) =>
      request<{ success: boolean }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    updateMe: (body: {
      name?: string;
      email?: string;
      whatsapp?: string;
      instagram?: string;
      profileImageUrl?: string;
    }) =>
      request<{
        id: string;
        email: string;
        role: string;
        name?: string;
        whatsapp?: string;
        tier?: string;
        membershipExpiresAt?: string | null;
        instagram?: string | null;
        profileImageUrl?: string | null;
      }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    me: (token: string) =>
      request<{ id: string; email: string; role: string; name?: string; whatsapp?: string; tier?: string; membershipExpiresAt?: string | null }>(
        '/auth/me',
        {
          method: 'GET',
          token,
          cache: 'no-store',
        },
      ),
    impersonate: (userId: string) =>
      request<{
        user: { id: string; email: string; role: string; name?: string; whatsapp?: string; tier?: string; membershipExpiresAt?: string | null };
        token: string;
      }>('/auth/impersonate', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
  },
  stripe: {
    getMembershipAmounts: () =>
      request<{
        eurCents: number;
        pixCentavos: number;
      }>('/stripe/membership-amounts', {
        method: 'GET',
      }),
    createCheckoutSession: (params: { successUrl: string; cancelUrl: string }) =>
      request<{ url: string }>('/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    createMbWayCheckoutSession: (params: { successUrl: string; cancelUrl: string }) =>
      request<{ url: string }>('/stripe/create-mbway-checkout-session', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    createPixCheckoutSession: (params: { successUrl: string; cancelUrl: string }) =>
      request<{ url: string }>('/stripe/create-pix-checkout-session', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    createGuestMembershipCheckout: (params: {
      name: string;
      email: string;
      whatsapp: string;
      password: string;
      passwordConfirm: string;
      successUrl: string;
      cancelUrl: string;
      paymentMethod: 'card' | 'mbway' | 'pix';
      affiliateCode?: string;
    }) =>
      request<{ url: string }>('/stripe/create-guest-membership-checkout', {
        method: 'POST',
        body: JSON.stringify(params),
        token: null,
      }),
    createGuestRafacallCheckout: (params: {
      name: string;
      email: string;
      whatsapp: string;
      password: string;
      passwordConfirm: string;
      successUrl: string;
      cancelUrl: string;
      paymentMethod: 'card' | 'mbway' | 'pix';
    }) =>
      request<{ url: string }>('/stripe/create-guest-rafacall-checkout', {
        method: 'POST',
        body: JSON.stringify(params),
        token: null,
      }),
    claimGuestRafacall: (sessionId: string) =>
      request<
        | { status: 'pending' }
        | {
            status: 'ready';
            token: string;
            user: {
              id: string;
              email: string | null;
              role: string;
              whatsapp: string;
            };
          }
        | { status: 'expired' }
        | { status: 'consumed' }
        | { status: 'invalid' }
      >(`/stripe/claim-guest-rafacall?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        token: null,
      }),
    claimGuestMembership: (sessionId: string) =>
      request<
        | { status: 'pending' }
        | {
            status: 'ready';
            token: string;
            user: {
              id: string;
              email: string | null;
              role: string;
              whatsapp: string;
            };
          }
        | { status: 'expired' }
        | { status: 'consumed' }
        | { status: 'invalid' }
      >(`/stripe/claim-guest-membership?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        token: null,
      }),
    getRafaCallAmounts: () =>
      request<{ eurCents: number; pixCentavos: number }>('/stripe/rafa-call-amounts', {
        method: 'GET',
      }),
    createRafaCallUnlockSession: (params: { successUrl: string; cancelUrl: string }) =>
      request<{ url: string }>('/stripe/create-rafa-call-unlock-session', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    createRafaCallUnlockMbWaySession: (params: { successUrl: string; cancelUrl: string }) =>
      request<{ url: string }>('/stripe/create-rafa-call-unlock-mbway-session', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    createRafaCallUnlockPixSession: (params: { successUrl: string; cancelUrl: string }) =>
      request<{ url: string }>('/stripe/create-rafa-call-unlock-pix-session', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    /**
     * Fluxo guest v2 do RafaCall — só Nome + WhatsApp, sem criar conta.
     */
    createGuestRafacallSession: (params: {
      name: string;
      whatsapp: string;
      successUrl: string;
      cancelUrl: string;
      paymentMethod: 'card' | 'mbway' | 'pix';
    }) =>
      request<{ url: string } | { skipPayment: true; unlockId: string }>(
        '/stripe/create-guest-rafacall-session',
        {
          method: 'POST',
          body: JSON.stringify(params),
          token: null,
        },
      ),
    claimGuestRafacallSession: (sessionId: string) =>
      request<
        | { status: 'pending' }
        | { status: 'ready'; unlockId: string; name: string; whatsapp: string }
        | { status: 'expired' }
        | { status: 'consumed' }
        | { status: 'invalid' }
      >(`/stripe/claim-guest-rafacall-session?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        token: null,
      }),
  },
  rafacall: {
    status: () =>
      request<{
        isMember: boolean;
        schedulingUnlocked: boolean;
        slotStartsAt: string | null;
        slotEndsAt: string | null;
        canOpenCalEmbed: boolean;
      }>('/rafacall/status', { method: 'GET' }),
    booking: () =>
      request<{
        booking:
          | {
              id: string;
              status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
              startsAt: string;
              endsAt: string;
              timezone: string;
            }
          | null;
      }>('/rafacall/booking', { method: 'GET' }),
    availability: (params: { from: string; to: string; tz: string }) => {
      const q = new URLSearchParams({
        from: params.from,
        to: params.to,
        tz: params.tz,
      });
      return request<{
        tz: string;
        days: {
          date: string;
          slots: { startsAt: string; endsAt: string }[];
          adminBlockedSlots: { startsAt: string; endsAt: string }[];
        }[];
      }>(`/rafacall/availability?${q.toString()}`, { method: 'GET' });
    },
    book: (body: { startsAtUtcIso: string; tz: string }) =>
      request<{
        id: string;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
        startsAt: string;
        endsAt: string;
        timezone: string;
      }>('/rafacall/book', { method: 'POST', body: JSON.stringify(body) }),
    reschedule: (body: { bookingId: string; newStartsAtUtcIso: string; tz: string }) =>
      request<{
        id: string;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
        startsAt: string;
        endsAt: string;
        timezone: string;
      }>('/rafacall/reschedule', { method: 'POST', body: JSON.stringify(body) }),
    cancel: (body: { bookingId: string; reason?: string | null }) =>
      request<{
        id: string;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
      }>('/rafacall/cancel', { method: 'POST', body: JSON.stringify(body) }),
    // ===== Fluxo guest (sem auth) =====
    guestUnlock: (id: string) =>
      request<{
        id: string;
        name: string;
        whatsapp: string;
        paid: boolean;
        consumed: boolean;
        expired: boolean;
        consumedBookingId: string | null;
      }>(`/rafacall/guest/unlock/${encodeURIComponent(id)}`, {
        method: 'GET',
        token: null,
      }),
    guestAvailability: (params: { from: string; to: string; tz: string; excludeBookingId?: string }) => {
      const q = new URLSearchParams({
        from: params.from,
        to: params.to,
        tz: params.tz,
      });
      if (params.excludeBookingId) q.set('excludeBookingId', params.excludeBookingId);
      return request<{
        tz: string;
        days: {
          date: string;
          slots: { startsAt: string; endsAt: string }[];
          adminBlockedSlots: { startsAt: string; endsAt: string }[];
        }[];
      }>(`/rafacall/guest/availability?${q.toString()}`, { method: 'GET', token: null });
    },
    guestBook: (body: { unlockId: string; startsAtUtcIso: string; tz: string }) =>
      request<{
        id: string;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
        startsAt: string;
        endsAt: string;
        timezone: string;
      }>('/rafacall/guest/book', {
        method: 'POST',
        body: JSON.stringify(body),
        token: null,
      }),
    guestBooking: (id: string, whatsapp: string) => {
      const q = new URLSearchParams({ whatsapp });
      return request<{
        id: string;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
        startsAt: string;
        endsAt: string;
        timezone: string;
        name: string | null;
        whatsapp: string | null;
      }>(`/rafacall/guest/booking/${encodeURIComponent(id)}?${q.toString()}`, {
        method: 'GET',
        token: null,
      });
    },
    guestReschedule: (body: {
      bookingId: string;
      whatsapp: string;
      newStartsAtUtcIso: string;
      tz: string;
    }) =>
      request<{
        id: string;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
        startsAt: string;
        endsAt: string;
        timezone: string;
        name: string | null;
        whatsapp: string | null;
      }>('/rafacall/guest/reschedule', {
        method: 'POST',
        body: JSON.stringify(body),
        token: null,
      }),
    guestCancel: (body: { bookingId: string; whatsapp: string; reason?: string | null }) =>
      request<{
        id: string;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
      }>('/rafacall/guest/cancel', {
        method: 'POST',
        body: JSON.stringify(body),
        token: null,
      }),
  },
  recommendedServices: {
    list: () =>
      request<
        {
          id: string;
          title: string;
          cardImageUrl: string | null;
          slug: string;
          linkTitle: string;
          whatsappPhrase: string;
          redirectPath: string;
        }[]
      >('/recommended-services', { method: 'GET' }),
  },
  admin: {
    users: {
      stats: () =>
        request<{
          totalUsers: number;
          partners: number;
          visitors: number;
          members: number;
          totalMembershipRevenueEur: number;
          subscriptionsCount: number;
          membershipPaymentsCount: number;
          membershipPriceEurUsed: number;
          totalRafacallUnlockRevenueEur: number;
          rafaUnlockPaymentsCount: number;
          rafacallFeeEurUsed: number;
        }>('/users/admin/stats', { method: 'GET' }),
      list: () =>
        request<
          {
            id: string;
            name: string;
            email: string | null;
            whatsapp: string;
            role: string;
            tier: string;
            membershipExpiresAt: string | null;
            rafaCallSchedulingUnlocked: boolean;
            rafaCallSlotStartsAt: string | null;
            rafaCallSlotEndsAt: string | null;
            createdAt: string;
          }[]
        >(
          '/users',
          { method: 'GET' },
        ),
      update: (
        id: string,
        input: { name?: string; email?: string; whatsapp?: string },
      ) =>
        request<{
          id: string;
          name: string;
          email: string | null;
          whatsapp: string;
          role: string;
          tier: string;
          membershipExpiresAt: string | null;
          rafaCallSchedulingUnlocked: boolean;
          rafaCallSlotStartsAt: string | null;
          rafaCallSlotEndsAt: string | null;
          createdAt: string;
        }>(`/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      updateRole: (id: string, role: 'USER' | 'PARTNER' | 'ADMIN') =>
        request<{
          id: string;
          name: string;
          email: string | null;
          whatsapp: string;
          role: string;
          tier: string;
          membershipExpiresAt: string | null;
          rafaCallSchedulingUnlocked: boolean;
          rafaCallSlotStartsAt: string | null;
          rafaCallSlotEndsAt: string | null;
          createdAt: string;
        }>(
          `/users/${id}/role`,
          { method: 'PATCH', body: JSON.stringify({ role }) },
        ),
      updateTier: (id: string, body: { tier: 'MEMBER' }) =>
        request<{
          id: string;
          name: string;
          email: string | null;
          whatsapp: string;
          role: string;
          tier: string;
          membershipExpiresAt: string | null;
          rafaCallSchedulingUnlocked: boolean;
          rafaCallSlotStartsAt: string | null;
          rafaCallSlotEndsAt: string | null;
          createdAt: string;
        }>(`/users/${id}/tier`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      updateRafacall: (
        id: string,
        body: {
          rafaCallSchedulingUnlocked?: boolean;
          rafaCallSlotEndsAt?: string | null;
        },
      ) =>
        request<{
          id: string;
          name: string;
          email: string | null;
          whatsapp: string;
          role: string;
          tier: string;
          membershipExpiresAt: string | null;
          rafaCallSchedulingUnlocked: boolean;
          rafaCallSlotStartsAt: string | null;
          rafaCallSlotEndsAt: string | null;
          createdAt: string;
        }>(`/users/${id}/rafacall`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      delete: (id: string) =>
        request<void>(`/users/${id}`, { method: 'DELETE' }),
    },
    rafacall: {
      schedule: (tz?: string) => {
        const q = tz ? `?tz=${encodeURIComponent(tz)}` : '';
        return request<{
          tz: string;
          days: {
            date: string; // YYYY-MM-DD no tz do admin
            items: {
              id: string;
              status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
              startsAt: string;
              endsAt: string;
              userId: string;
              userName: string;
              whatsappDigits: string;
              bookingTimezone: string;
              bookingOrigin: 'USER_PAID' | 'AFFILIATE_FREE';
              affiliateInstagram: string | null;
            }[];
          }[];
        }>(`/admin/rafacall/schedule${q}`, { method: 'GET' });
      },
      blocks: (params: { fromUtcIso: string; toUtcIso: string }) => {
        const q = new URLSearchParams({
          from: params.fromUtcIso,
          to: params.toUtcIso,
        });
        return request<{
          blocks: {
            id: string;
            startsAt: string;
            endsAt: string;
            reason: string | null;
            createdAt: string;
            createdByUserId: string;
          }[];
        }>(`/admin/rafacall/blocks?${q.toString()}`, { method: 'GET' });
      },
      createBlock: (body: { startsAtUtcIso: string; endsAtUtcIso: string; reason?: string }) =>
        request<{ id: string; startsAt: string; endsAt: string; reason: string | null }>(
          '/admin/rafacall/blocks',
          { method: 'POST', body: JSON.stringify(body) },
        ),
      deleteBlock: (id: string) =>
        request<{ ok: true }>(`/admin/rafacall/blocks/${id}`, { method: 'DELETE' }),
      cancelBooking: (bookingId: string, reason?: string | null) =>
        request<{ id: string; status: 'CANCELLED' }>(
          `/admin/rafacall/bookings/${bookingId}/cancel`,
          { method: 'POST', body: JSON.stringify({ reason }) },
        ),
      completeBooking: (bookingId: string) =>
        request<{ id: string; status: 'COMPLETED' }>(
          `/admin/rafacall/bookings/${bookingId}/complete`,
          { method: 'POST', body: JSON.stringify({}) },
        ),
    },
    grupoTeste: {
      list: () =>
        request<
          {
            id: string;
            description: string;
            imageUrls: string[];
            videoUrl: string | null;
            targetGroupJid: string | null;
            status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
            sentAt: string | null;
            whatsappError: string | null;
            createdAt: string;
            createdBy: { id: string; name: string };
          }[]
        >('/admin/grupo-teste', { method: 'GET' }),
      create: (input: {
        description: string;
        targetGroupJid?: string;
        images: File[];
        video?: File | null;
      }) => {
        const fd = new FormData();
        fd.append('description', input.description.trim());
        const tg = input.targetGroupJid?.trim();
        if (tg) fd.append('targetGroupJid', tg);
        for (const f of input.images.slice(0, 6)) fd.append('images', f);
        if (input.video) fd.append('video', input.video);
        return requestFormData<{
          id: string;
          description: string;
          imageUrls: string[];
          videoUrl: string | null;
          targetGroupJid: string | null;
          status: 'PENDING';
          createdAt: string;
        }>('/admin/grupo-teste', fd, { method: 'POST' });
      },
      send: (id: string, groupJid: string) =>
        request<{ ok: true; id: string; status: 'SENT' }>(
          `/admin/grupo-teste/${encodeURIComponent(id)}/send`,
          { method: 'POST', body: JSON.stringify({ groupJid: groupJid.trim() }) },
        ),
    },
    checklist: {
      getByUserId: (userId: string) =>
        request<{
          updatedAt: string | null;
          version: number;
          meta: Record<string, unknown>;
        }>(`/checklist/admin/${encodeURIComponent(userId)}`, { method: 'GET' }),
    },
    partners: {
      list: () =>
        request<
          {
            id: string;
            name: string;
            whatsapp: string;
            logoUrl: string | null;
            advertisingBalanceEurCents: number;
            user: { id: string; email: string | null; role: string };
            category: { id: string; name: string; slug: string } | null;
            heroShareLink: {
              id: string;
              slug: string;
              _count: { clicks: number };
            } | null;
            services: { id: string; partnerShareLinkId: string | null }[];
          }[]
        >('/partners', { method: 'GET' }),
      getContactLinks: (partnerId: string) =>
        request<{
          partnerId: string;
          hero: {
            id: string;
            slug: string;
            title: string;
            clickCount: number;
            redirectPath: string;
          } | null;
          services: {
            id: string;
            title: string;
            link: {
              id: string;
              slug: string;
              title: string;
              clickCount: number;
              redirectPath: string;
            } | null;
          }[];
          servicesWithLink: number;
          servicesTotal: number;
        }>(`/partners/admin/${encodeURIComponent(partnerId)}/contact-links`, {
          method: 'GET',
        }),
      setupContactLinks: (partnerId: string) =>
        request<{
          partnerId: string;
          hero: { slug: string; redirectPath: string };
          services: {
            id: string;
            title: string;
            slug: string;
            redirectPath: string;
          }[];
        }>(`/partners/admin/${encodeURIComponent(partnerId)}/contact-links/setup`, {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      getAdvertisingBalance: (partnerId: string) =>
        request<{ balanceEurCents: number }>(
          `/partners/admin/${encodeURIComponent(partnerId)}/advertising-balance`,
          { method: 'GET' },
        ),
      creditAdvertisingBalance: (
        partnerId: string,
        body: { amountEurCents: number; note?: string },
      ) =>
        request<{ balanceEurCents: number }>(
          `/partners/admin/${encodeURIComponent(partnerId)}/advertising-balance/credit`,
          { method: 'POST', body: JSON.stringify(body) },
        ),
      setAdvertisingBalance: (
        partnerId: string,
        body: { balanceEurCents: number; note?: string },
      ) =>
        request<{ balanceEurCents: number }>(
          `/partners/admin/${encodeURIComponent(partnerId)}/advertising-balance`,
          { method: 'PATCH', body: JSON.stringify(body) },
        ),
      create: (input: {
        password: string;
        name: string;
        email?: string;
        whatsapp: string;
        logoUrl?: string;
      }) =>
        request<{
          user: { id: string; email: string | null; role: string };
          partner: {
            id: string;
            name: string;
            whatsapp: string;
            logoUrl: string | null;
          };
        }>('/partners', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      delete: (id: string) =>
        request<void>(`/partners/${id}`, { method: 'DELETE' }),
      update: (
        id: string,
        input: { categoryId?: string | null },
      ) =>
        request<{
          id: string;
          name: string;
          whatsapp: string;
          logoUrl: string | null;
          user: { id: string; email: string | null; role: string };
          category: { id: string; name: string; slug: string } | null;
        }>(`/partners/admin/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      listCategories: () =>
        request<
          {
            id: string;
            slug: string;
            name: string;
            sortOrder: number;
          }[]
        >('/partners/admin/categories', { method: 'GET' }),
    },
    services: {
      listGrouped: () =>
        request<
          {
            id: string;
            name: string;
            services: {
              id: string;
              title: string;
              price: string | null;
              priceOnRequest: boolean;
              rpmCommissionEur: string | null;
            }[];
          }[]
        >('/partners/admin/services', { method: 'GET' }),
      updateCommission: (serviceId: string, rpmCommissionEur: string | null) =>
        request<{ id: string; rpmCommissionEur: string | null }>(
          `/partners/admin/services/${serviceId}/commission`,
          {
            method: 'PATCH',
            body: JSON.stringify({ rpmCommissionEur }),
          },
        ),
    },
    sales: {
      list: () =>
        request<
          {
            id: string;
            createdAt: string;
            amountEur: string;
            commissionPaymentStatus: 'PENDING' | 'PAID';
            commissionPaidEur: string | null;
            wantsInvoice: boolean;
            partner: { id: string; name: string };
            user: {
              id: string;
              name: string | null;
              email: string | null;
              whatsapp: string | null;
              tier: 'MEMBER';
            };
            service: { id: string; title: string };
          }[]
        >('/partners/admin/sales', { method: 'GET' }),
    },
    shareLinks: {
      overview: (opts?: { from?: string; to?: string }) => {
        const q = new URLSearchParams();
        if (opts?.from) q.set('from', opts.from);
        if (opts?.to) q.set('to', opts.to);
        const qs = q.toString();
        return request<{
          customLinks: {
            id: string;
            slug: string;
            title: string;
            whatsappDigits: string;
            whatsappPhrase: string;
            destinationUrl: string | null;
            ogImageUrl: string | null;
            clickCount: number;
            createdAt: string;
            entryUrl: string;
            exitUrlPreview: string;
          }[];
          houseLinks: {
            id: string;
            houseId: number;
            title: string;
            priceEur: string;
            partnerName: string;
            previewImageUrl: string | null;
            clickCount: number;
            entryUrl: string;
            messagePreview: string;
          }[];
          clickPeriod: { from: string; to: string } | null;
        }>(`/redirect-links/admin/overview${qs ? `?${qs}` : ''}`, { method: 'GET' });
      },
      createCustom: (body: {
        title: string;
        destinationUrl?: string;
        whatsapp?: string;
        whatsappPhrase?: string;
      }) =>
        request<{
          id: string;
          slug: string;
          title: string;
          whatsappDigits: string;
          whatsappPhrase: string;
          destinationUrl: string | null;
          ogImageUrl: string | null;
          createdAt: string;
          entryUrl: string;
          exitUrlPreview: string;
        }>('/redirect-links/admin/custom', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      deleteCustom: (id: string) =>
        request<{ ok: true }>(
          `/redirect-links/admin/custom/${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        ),
      updateCustom: (
        id: string,
        body: {
          title?: string;
          whatsapp?: string;
          whatsappPhrase?: string;
          destinationUrl?: string;
        },
      ) =>
        request<{
          id: string;
          slug: string;
          title: string;
          whatsappDigits: string;
          whatsappPhrase: string;
          destinationUrl: string | null;
          ogImageUrl: string | null;
          createdAt: string;
          entryUrl: string;
          exitUrlPreview: string;
        }>(`/redirect-links/admin/custom/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      getCustom: (id: string) =>
        request<{
          id: string;
          title: string;
          slug: string;
          ogImageUrl: string | null;
          entryUrl: string;
        }>(`/redirect-links/admin/custom/${encodeURIComponent(id)}`, {
          method: 'GET',
        }),
      uploadCustomOgImage: (id: string, file: File) => {
        const fd = new FormData();
        fd.set('file', file);
        return requestFormData<{ ogImageUrl: string }>(
          `/redirect-links/admin/custom/${encodeURIComponent(id)}/og-image`,
          fd,
          { method: 'POST' },
        );
      },
      deleteCustomOgImage: (id: string) =>
        request<{ ok: true; ogImageUrl: null }>(
          `/redirect-links/admin/custom/${encodeURIComponent(id)}/og-image`,
          { method: 'DELETE' },
        ),
      clearCustomClicks: (id: string) =>
        request<{ deleted: number }>(
          `/redirect-links/admin/custom/${encodeURIComponent(id)}/clicks`,
          { method: 'DELETE' },
        ),
      clickHistory: (opts?: {
        kind?: 'CUSTOM_LINK' | 'HOUSE';
        partnerShareLinkId?: string;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
      }) => {
        const q = new URLSearchParams();
        if (opts?.kind) q.set('kind', opts.kind);
        if (opts?.partnerShareLinkId)
          q.set('partnerShareLinkId', opts.partnerShareLinkId);
        if (opts?.from) q.set('from', opts.from);
        if (opts?.to) q.set('to', opts.to);
        if (opts?.limit != null) q.set('limit', String(opts.limit));
        if (opts?.offset != null) q.set('offset', String(opts.offset));
        const qs = q.toString();
        return request<{
          items: {
            id: string;
            kind: 'CUSTOM_LINK' | 'HOUSE';
            clickedAt: string;
            visitorKey: string | null;
            visitorCountryCode: string | null;
            customLink: {
              id: string;
              title: string;
              slug: string;
            } | null;
            house: {
              id: string;
              houseId: number;
              title: string;
              partnerName: string;
            } | null;
          }[];
          total: number;
          limit: number;
          offset: number;
          hasMore: boolean;
        }>(`/redirect-links/admin/clicks${qs ? `?${qs}` : ''}`, {
          method: 'GET',
        });
      },
    },
    recommendedServices: {
      list: () =>
        request<
          {
            id: string;
            title: string;
            cardImageUrl: string | null;
            sortOrder: number;
            active: boolean;
            createdAt: string;
            redirectPath: string;
            partnerShareLink: {
              id: string;
              slug: string;
              title: string;
              whatsappDigits: string;
            };
          }[]
        >('/recommended-services/admin', { method: 'GET' }),
      availableLinks: () =>
        request<
          {
            id: string;
            slug: string;
            title: string;
            whatsappDigits: string;
            createdAt: string;
            alreadyUsed: boolean;
          }[]
        >('/recommended-services/admin/available-links', { method: 'GET' }),
      create: (body: {
        title: string;
        partnerShareLinkId: string;
        sortOrder?: number;
        active?: boolean;
      }) =>
        request<{
          id: string;
          title: string;
          sortOrder: number;
          active: boolean;
        }>('/recommended-services/admin', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (
        id: string,
        body: {
          title?: string;
          partnerShareLinkId?: string;
          sortOrder?: number;
          active?: boolean;
        },
      ) =>
        request(`/recommended-services/admin/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      delete: (id: string) =>
        request<{ ok: true }>(
          `/recommended-services/admin/${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        ),
      uploadCardImage: (id: string, file: File) => {
        const fd = new FormData();
        fd.set('file', file);
        return requestFormData<{ cardImageUrl: string }>(
          `/recommended-services/admin/${encodeURIComponent(id)}/card-image`,
          fd,
          { method: 'POST' },
        );
      },
      deleteCardImage: (id: string) =>
        request<{ ok: true; cardImageUrl: null }>(
          `/recommended-services/admin/${encodeURIComponent(id)}/card-image`,
          { method: 'DELETE' },
        ),
    },
    houses: {
      list: () =>
        request<
          {
            id: string;
            houseId: number;
            title: string;
            city: string;
            businessType: 'RENT' | 'SALE';
            typology: string;
            featured: boolean;
            publicationStatus: 'PUBLISHED' | 'HIDDEN';
            publishedUntil: string | null;
            lastPublishedAt: string | null;
            availableFrom: string;
            priceEur: string;
            imageUrls: string[];
            videoUrl: string | null;
            videoPosterUrl?: string | null;
            whatsappSentAt: string | null;
            whatsappSends?: { sentAt: string }[];
            whatsappError: string | null;
            createdAt: string;
            partner: {
              id: string;
              name: string;
              category: { slug: string; name: string } | null;
            };
            _count: { redirectClicks: number };
          }[]
        >('/partners/admin/houses', { method: 'GET' }),
      get: (houseId: string) =>
        request<{
          id: string;
          houseId: number;
          title: string;
          description: string;
          businessType: 'RENT' | 'SALE';
          typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          city: string;
          availableFrom: string;
          priceEur: string;
          relocationFeeEur: string;
          caucoesCount: number;
          rendasEntradaCount: number;
          furnished: boolean;
          publicationStatus: 'PUBLISHED' | 'HIDDEN';
          publishedUntil: string | null;
          lastPublishedAt: string | null;
          featured: boolean;
          whatsappSentAt: string | null;
          whatsappError: string | null;
          imageUrls: string[];
          coverImageUrl: string | null;
          videoUrl: string | null;
          videoPosterUrl?: string | null;
          createdAt: string;
          updatedAt: string;
          partner: {
            id: string;
            name: string;
            category: { slug: string; name: string } | null;
          };
        }>(`/partners/admin/houses/${encodeURIComponent(houseId)}`, { method: 'GET' }),
      create: (input: {
        images?: File[];
        video?: File;
        thumbnail?: File;
        title?: string;
        description?: string;
        businessType?: 'RENT' | 'SALE';
        typology?: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
        city?: string;
        availableFrom?: string;
        priceEur?: string;
        relocationFeeEur?: string;
        caucoesCount?: string;
        rendasEntradaCount?: string;
        furnished?: boolean;
        coverImageIndex?: number;
        /** Parceiro relocation titular; omitir = conta relocation interna do admin */
        partnerId?: string;
      }) => {
        const fd = new FormData();
        if (input.video) fd.append('video', input.video);
        if (input.thumbnail) fd.append('thumbnail', input.thumbnail);
        if (input.images?.length) {
          for (const file of input.images) fd.append('images', file);
        }
        if (input.images?.length && input.coverImageIndex != null) {
          fd.append('coverImageIndex', String(input.coverImageIndex));
        }
        if (input.title !== undefined) fd.append('title', input.title);
        if (input.description !== undefined) fd.append('description', input.description);
        if (input.businessType != null) fd.append('businessType', input.businessType);
        if (input.typology != null) fd.append('typology', input.typology);
        if (input.city !== undefined) fd.append('city', input.city);
        if (input.availableFrom !== undefined) fd.append('availableFrom', input.availableFrom);
        if (input.priceEur !== undefined) fd.append('priceEur', input.priceEur);
        if (input.relocationFeeEur !== undefined) {
          fd.append('relocationFeeEur', input.relocationFeeEur.trim());
        }
        if (input.caucoesCount !== undefined) fd.append('caucoesCount', input.caucoesCount);
        if (input.rendasEntradaCount !== undefined) fd.append('rendasEntradaCount', input.rendasEntradaCount);
        if (input.furnished != null) fd.append('furnished', input.furnished ? 'true' : 'false');
        const pid = input.partnerId?.trim();
        if (pid) fd.append('partnerId', pid);
        return requestFormData<{
          id: string;
          houseId: number;
          title: string;
          description: string;
          businessType: 'RENT' | 'SALE';
          typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          city: string;
          availableFrom: string;
          priceEur: string;
          relocationFeeEur: string;
          caucoesCount: number;
          rendasEntradaCount: number;
          furnished: boolean;
          publicationStatus: 'PUBLISHED' | 'HIDDEN';
          publishedUntil: string | null;
          lastPublishedAt: string | null;
          whatsappSentAt: string | null;
          whatsappError: string | null;
          imageUrls: string[];
          coverImageUrl: string | null;
          videoUrl: string | null;
          createdAt: string;
          updatedAt: string;
        }>('/partners/admin/houses', fd, { method: 'POST' });
      },
      update: (
        houseId: string,
        input: {
          images?: File[];
          video?: File;
          thumbnail?: File;
          removeVideo?: boolean;
          keepImageUrls?: string[];
          title?: string;
          description?: string;
          typology?: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          businessType?: 'RENT' | 'SALE';
          city?: string;
          availableFrom?: string;
          priceEur?: string;
          relocationFeeEur?: string;
          caucoesCount?: string;
          rendasEntradaCount?: string;
          furnished?: boolean;
          coverImageIndex?: number;
          partnerId?: string;
        },
      ) => {
        const fd = new FormData();
        if (input.video) fd.append('video', input.video);
        if (input.thumbnail) fd.append('thumbnail', input.thumbnail);
        if (input.images?.length) {
          for (const file of input.images) fd.append('images', file);
        }
        if (input.keepImageUrls != null) {
          fd.append('keepImageUrls', JSON.stringify(input.keepImageUrls));
        }
        if (input.removeVideo) fd.append('removeVideo', 'true');
        if (input.title != null) fd.append('title', input.title);
        if (input.description != null) fd.append('description', input.description);
        if (input.typology != null) fd.append('typology', input.typology);
        if (input.businessType != null) fd.append('businessType', input.businessType);
        if (input.city != null) fd.append('city', input.city);
        if (input.availableFrom != null) fd.append('availableFrom', input.availableFrom);
        if (input.priceEur != null) fd.append('priceEur', input.priceEur);
        if (input.relocationFeeEur != null) fd.append('relocationFeeEur', input.relocationFeeEur.trim());
        if (input.caucoesCount != null) fd.append('caucoesCount', input.caucoesCount);
        if (input.rendasEntradaCount != null) fd.append('rendasEntradaCount', input.rendasEntradaCount);
        if (input.furnished != null) fd.append('furnished', input.furnished ? 'true' : 'false');
        if (input.coverImageIndex != null) fd.append('coverImageIndex', String(input.coverImageIndex));
        if (input.partnerId != null) fd.append('partnerId', input.partnerId);
        return requestFormData<{
          id: string;
          houseId: number;
          title: string;
          description: string;
          businessType: 'RENT' | 'SALE';
          typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          city: string;
          availableFrom: string;
          priceEur: string;
          relocationFeeEur: string;
          caucoesCount: number;
          rendasEntradaCount: number;
          furnished: boolean;
          publicationStatus: 'PUBLISHED' | 'HIDDEN';
          publishedUntil: string | null;
          lastPublishedAt: string | null;
          whatsappSentAt: string | null;
          whatsappError: string | null;
          imageUrls: string[];
          coverImageUrl: string | null;
          videoUrl: string | null;
          createdAt: string;
          updatedAt: string;
        }>(`/partners/admin/houses/${encodeURIComponent(houseId)}`, fd, { method: 'PATCH' });
      },
      delete: (houseId: string) =>
        request<{ ok: true }>(
          `/partners/admin/houses/${encodeURIComponent(houseId)}`,
          { method: 'DELETE' },
        ),
      setFeatured: (houseId: string, featured: boolean) =>
        request<{ id: string; featured: boolean }>(
          `/partners/admin/houses/${encodeURIComponent(houseId)}/featured`,
          { method: 'PATCH', body: JSON.stringify({ featured }) },
        ),
      sendToWhatsappGroups: (houseId: string) =>
        request<{
          ok: true;
          sentToGroups: number;
          failed: string[];
        }>(
          `/partners/admin/houses/${encodeURIComponent(houseId)}/send-whatsapp-groups`,
          { method: 'POST', body: JSON.stringify({}) },
        ),
    },
    relocationCities: {
      list: () =>
        request<{ cities: string[] }>('/partners/admin/relocation-cities', {
          method: 'GET',
        }),
    },
    houseWhatsappGroups: {
      list: () =>
        request<
          {
            id: string;
            name: string;
            groupJid: string;
            businessType: 'RENT' | 'SALE';
            active: boolean;
            sortOrder: number;
            createdAt: string;
            updatedAt: string;
          }[]
        >('/partners/admin/house-whatsapp-groups', { method: 'GET' }),
      create: (body: { name: string; groupJid: string; businessType: 'RENT' | 'SALE' }) =>
        request<{
          id: string;
          name: string;
          groupJid: string;
          businessType: 'RENT' | 'SALE';
          active: boolean;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        }>('/partners/admin/house-whatsapp-groups', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      update: (
        id: string,
        body: { name?: string; active?: boolean; businessType?: 'RENT' | 'SALE' },
      ) =>
        request<{
          id: string;
          name: string;
          groupJid: string;
          businessType: 'RENT' | 'SALE';
          active: boolean;
          sortOrder: number;
          createdAt: string;
          updatedAt: string;
        }>(`/partners/admin/house-whatsapp-groups/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      delete: (id: string) =>
        request<{ ok: true }>(
          `/partners/admin/house-whatsapp-groups/${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        ),
    },
    categories: {
      list: () =>
        request<
          {
            id: string;
            slug: string;
            name: string;
            shortDescription?: string;
            fullDescription?: string;
            backgroundImageUrl?: string;
            sortOrder: number;
          }[]
        >('/partners/admin/categories', { method: 'GET' }),
      create: (input: {
        slug: string;
        name: string;
        shortDescription?: string;
        fullDescription?: string;
        backgroundImageUrl?: string;
        sortOrder?: number;
      }) =>
        request<{
          id: string;
          slug: string;
          name: string;
          shortDescription?: string;
          fullDescription?: string;
          backgroundImageUrl?: string;
          sortOrder: number;
        }>('/partners/admin/categories', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: (
        id: string,
        input: {
          slug?: string;
          name?: string;
          shortDescription?: string;
          fullDescription?: string;
          backgroundImageUrl?: string;
          sortOrder?: number;
        },
      ) =>
        request<{
          id: string;
          slug: string;
          name: string;
          shortDescription?: string;
          fullDescription?: string;
          backgroundImageUrl?: string;
          sortOrder: number;
        }>(`/partners/admin/categories/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      delete: (id: string) =>
        request<void>(`/partners/admin/categories/${id}`, {
          method: 'DELETE',
        }),
    },
    support: {
      tickets: (take?: number) => {
        const q = take ? `?take=${encodeURIComponent(String(take))}` : '';
        return request<{
          items: {
            id: string;
            createdAt: string;
            updatedAt: string;
            status: 'REGISTERED' | 'IN_REVIEW' | 'DONE';
            message: string;
            adminReply?: string | null;
            user: { id: string; name: string; whatsapp: string };
          }[];
        }>(`/admin/support/tickets${q}`, { method: 'GET' });
      },
      deleteTicket: (id: string) =>
        request<{ ok: true }>(`/admin/support/tickets/${id}`, { method: 'DELETE' }),
      updateTicket: (
        id: string,
        body: { status?: 'REGISTERED' | 'IN_REVIEW' | 'DONE'; adminReply?: string | null },
      ) =>
        request<{
          id: string;
          createdAt: string;
          updatedAt: string;
          status: 'REGISTERED' | 'IN_REVIEW' | 'DONE';
          message: string;
          adminReply?: string | null;
        }>(`/admin/support/tickets/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
    },
  },
  uploads: {
    post: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return requestFormData<{ url: string }>('/uploads', fd, { method: 'POST' });
    },
  },
  partner: {
    me: () =>
      request<{
        id: string;
        name: string;
        whatsapp: string;
        logoUrl: string | null;
        shortDescription: string | null;
        fullDescription: string | null;
        backgroundImageUrl: string | null;
        catalogImageUrls: string[];
        catalogVideoUrl?: string | null;
        instagram: string | null;
        billingName?: string | null;
        billingNif?: string | null;
        billingAddress?: string | null;
        billingPostalCode?: string | null;
        category?: { id: string; slug: string; name: string } | null;
        publicSlug?: string | null;
      }>('/partners/me', { method: 'GET' }),
    contactLinks: () =>
      request<{
        partnerId: string;
        hero: {
          id: string;
          slug: string;
          title: string;
          clickCount: number;
          redirectPath: string;
        } | null;
        services: {
          id: string;
          title: string;
          link: {
            id: string;
            slug: string;
            title: string;
            clickCount: number;
            redirectPath: string;
          } | null;
        }[];
        servicesWithLink: number;
        servicesTotal: number;
      }>('/partners/me/contact-links', { method: 'GET' }),
    updateMe: (input: {
      name?: string;
      whatsapp?: string;
      logoUrl?: string;
      shortDescription?: string;
      fullDescription?: string;
      backgroundImageUrl?: string;
      catalogImageUrls?: string[];
      catalogVideoUrl?: string;
      instagram?: string;
      billingName?: string | null;
      billingNif?: string | null;
      billingAddress?: string | null;
      billingPostalCode?: string | null;
      publicSlug?: string | null;
    }) =>
      request<{
        id: string;
        name: string;
        whatsapp: string;
        logoUrl: string | null;
        shortDescription: string | null;
        fullDescription: string | null;
        backgroundImageUrl: string | null;
        catalogImageUrls: string[];
        catalogVideoUrl?: string | null;
        instagram: string | null;
        billingName?: string | null;
        billingNif?: string | null;
        billingAddress?: string | null;
        billingPostalCode?: string | null;
        category?: { id: string; slug: string; name: string } | null;
        publicSlug?: string | null;
      }>('/partners/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    uploadCatalogVideo: (file: File) => {
      const fd = new FormData();
      fd.append('video', file);
      return requestFormData<{
        id: string;
        name: string;
        whatsapp: string;
        logoUrl: string | null;
        shortDescription: string | null;
        fullDescription: string | null;
        backgroundImageUrl: string | null;
        catalogImageUrls: string[];
        catalogVideoUrl?: string | null;
        instagram: string | null;
        billingName?: string | null;
        billingNif?: string | null;
        billingAddress?: string | null;
        billingPostalCode?: string | null;
        category?: { id: string; slug: string; name: string } | null;
      }>('/partners/me/catalog-video', fd, { method: 'POST' });
    },
    services: {
      list: () =>
        request<
          {
            id: string;
            title: string;
            description: string | null;
            price: string | null;
            priceOnRequest: boolean;
            rpmCommissionEur: string | null;
            createdAt: string;
          }[]
        >('/partners/me/services', { method: 'GET' }),
      create: (input: {
        title: string;
        description: string;
        priceOnRequest?: boolean;
        price?: string;
      }) =>
        request<{
          id: string;
          title: string;
          description: string | null;
          price: string | null;
          priceOnRequest: boolean;
          rpmCommissionEur: string | null;
          createdAt: string;
        }>('/partners/me/services', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: (
        id: string,
        input: {
          title?: string;
          description?: string;
          priceOnRequest?: boolean;
          price?: string;
        },
      ) =>
        request<{
          id: string;
          title: string;
          description: string | null;
          price: string | null;
          priceOnRequest: boolean;
          rpmCommissionEur: string | null;
          createdAt: string;
        }>(`/partners/me/services/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      delete: (id: string) =>
        request<void>(`/partners/me/services/${id}`, { method: 'DELETE' }),
    },
    advertising: {
      getBalance: () =>
        request<{ balanceEurCents: number }>('/partners/me/advertising-balance', {
          method: 'GET',
        }),
      startTopupCheckout: (body: {
        amountEurCents: number;
        successUrl?: string;
        cancelUrl?: string;
      }) =>
        request<{ url: string; sessionId: string }>(
          '/partners/me/advertising-topup-checkout',
          { method: 'POST', body: JSON.stringify(body) },
        ),
    },
    houses: {
      list: () =>
        request<
          {
            id: string;
            houseId: number;
            title: string;
            description: string;
            businessType: 'RENT' | 'SALE';
            typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
            city: string;
            availableFrom: string;
            priceEur: string;
            relocationFeeEur: string;
            caucoesCount: number;
            rendasEntradaCount: number;
            furnished: boolean;
            publicationStatus: 'PUBLISHED' | 'HIDDEN';
            publishedUntil: string | null;
            lastPublishedAt: string | null;
            whatsappSentAt: string | null;
            whatsappError: string | null;
            whatsappSends?: { sentAt: string }[];
            imageUrls: string[];
            coverImageUrl: string | null;
            videoUrl: string | null;
            videoPosterUrl?: string | null;
            createdAt: string;
            updatedAt: string;
            _count: { redirectClicks: number };
          }[]
        >('/partners/me/houses', { method: 'GET' }),
      get: (id: string) =>
        request<{
          id: string;
          houseId: number;
          title: string;
          description: string;
          businessType: 'RENT' | 'SALE';
          typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          city: string;
          availableFrom: string;
          priceEur: string;
          relocationFeeEur: string;
          caucoesCount: number;
          rendasEntradaCount: number;
          furnished: boolean;
          publicationStatus: 'PUBLISHED' | 'HIDDEN';
          publishedUntil: string | null;
          lastPublishedAt: string | null;
          whatsappSentAt: string | null;
          whatsappError: string | null;
          imageUrls: string[];
          coverImageUrl: string | null;
          videoUrl: string | null;
          videoPosterUrl?: string | null;
          createdAt: string;
          updatedAt: string;
        }>(`/partners/me/houses/${encodeURIComponent(id)}`, { method: 'GET' }),
      create: (input: {
        images?: File[];
        video?: File;
        thumbnail?: File;
        title: string;
        description: string;
        businessType?: 'RENT' | 'SALE';
        typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
        city: string;
        availableFrom: string;
        priceEur: string;
        relocationFeeEur: string;
        caucoesCount: string;
        rendasEntradaCount: string;
        furnished: boolean;
        coverImageIndex?: number;
      }) => {
        const fd = new FormData();
        if (input.video) fd.append('video', input.video);
        if (input.thumbnail) fd.append('thumbnail', input.thumbnail);
        if (input.images?.length) {
          for (const file of input.images) fd.append('images', file);
        }
        if (input.images?.length && input.coverImageIndex != null) {
          fd.append('coverImageIndex', String(input.coverImageIndex));
        }
        fd.append('title', input.title);
        fd.append('description', input.description);
        if (input.businessType != null) fd.append('businessType', input.businessType);
        fd.append('typology', input.typology);
        fd.append('city', input.city);
        fd.append('availableFrom', input.availableFrom);
        fd.append('priceEur', input.priceEur);
        fd.append('relocationFeeEur', input.relocationFeeEur.trim());
        fd.append('caucoesCount', input.caucoesCount);
        fd.append('rendasEntradaCount', input.rendasEntradaCount);
        fd.append('furnished', input.furnished ? 'true' : 'false');
        return requestFormData<{
          id: string;
          houseId: number;
          title: string;
          description: string;
          businessType: 'RENT' | 'SALE';
          typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          city: string;
          availableFrom: string;
          priceEur: string;
          relocationFeeEur: string;
          caucoesCount: number;
          rendasEntradaCount: number;
          furnished: boolean;
          publicationStatus: 'PUBLISHED' | 'HIDDEN';
          publishedUntil: string | null;
          lastPublishedAt: string | null;
          whatsappSentAt: string | null;
          whatsappError: string | null;
          imageUrls: string[];
          coverImageUrl: string | null;
          videoUrl: string | null;
          createdAt: string;
          updatedAt: string;
        }>('/partners/me/houses', fd, { method: 'POST' });
      },
      update: (
        id: string,
        input: {
          images?: File[];
          video?: File;
          thumbnail?: File;
          removeVideo?: boolean;
          keepImageUrls?: string[];
          title?: string;
          description?: string;
          typology?: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          businessType?: 'RENT' | 'SALE';
          city?: string;
          availableFrom?: string;
          priceEur?: string;
          relocationFeeEur?: string;
          caucoesCount?: string;
          rendasEntradaCount?: string;
          furnished?: boolean;
          coverImageIndex?: number;
        },
      ) => {
        const fd = new FormData();
        if (input.video) fd.append('video', input.video);
        if (input.thumbnail) fd.append('thumbnail', input.thumbnail);
        if (input.images?.length) {
          for (const file of input.images) fd.append('images', file);
        }
        if (input.keepImageUrls != null) {
          fd.append('keepImageUrls', JSON.stringify(input.keepImageUrls));
        }
        if (input.removeVideo) fd.append('removeVideo', 'true');
        if (input.title != null) fd.append('title', input.title);
        if (input.description != null) fd.append('description', input.description);
        if (input.typology != null) fd.append('typology', input.typology);
        if (input.businessType != null) fd.append('businessType', input.businessType);
        if (input.city != null) fd.append('city', input.city);
        if (input.availableFrom != null) fd.append('availableFrom', input.availableFrom);
        if (input.priceEur != null) fd.append('priceEur', input.priceEur);
        if (input.relocationFeeEur != null) fd.append('relocationFeeEur', input.relocationFeeEur.trim());
        if (input.caucoesCount != null) fd.append('caucoesCount', input.caucoesCount);
        if (input.rendasEntradaCount != null) fd.append('rendasEntradaCount', input.rendasEntradaCount);
        if (input.furnished != null) fd.append('furnished', input.furnished ? 'true' : 'false');
        if (input.coverImageIndex != null) fd.append('coverImageIndex', String(input.coverImageIndex));
        return requestFormData<{
          id: string;
          houseId: number;
          title: string;
          description: string;
          businessType: 'RENT' | 'SALE';
          typology: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'QUARTO_AP_COMPARTILHADO';
          city: string;
          availableFrom: string;
          priceEur: string;
          relocationFeeEur: string;
          caucoesCount: number;
          rendasEntradaCount: number;
          furnished: boolean;
          publicationStatus: 'PUBLISHED' | 'HIDDEN';
          publishedUntil: string | null;
          whatsappSentAt: string | null;
          whatsappError: string | null;
          imageUrls: string[];
          coverImageUrl: string | null;
          videoUrl: string | null;
          createdAt: string;
          updatedAt: string;
        }>(`/partners/me/houses/${encodeURIComponent(id)}`, fd, { method: 'PATCH' });
      },
      publish: (id: string) =>
        request<{
          ok: true;
          publishedUntil: string;
          balanceEurCents: number;
          sentToGroups?: number;
          failed?: string[];
        }>(`/partners/me/houses/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
      unpublish: (id: string) =>
        request<{
          ok: true;
          publicationStatus: 'HIDDEN';
          publishedUntil: string | null;
        }>(`/partners/me/houses/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }),
      delete: (id: string) =>
        request<{ ok: true }>(
          `/partners/me/houses/${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        ),
    },
    sales: {
      list: () =>
        request<
          {
            id: string;
            createdAt: string;
            paidAt?: string | null;
            amountEur: string;
            commissionPaymentStatus: 'PENDING' | 'PAID';
            commissionSuggestedEur: string | null;
            commissionPaidEur: string | null;
            wantsInvoice: boolean;
            user: {
              id: string;
              name: string | null;
              email: string | null;
              whatsapp: string | null;
              tier: 'MEMBER';
            };
            service: { id: string; title: string; rpmCommissionEur: string | null };
          }[]
        >('/partners/me/sales', { method: 'GET' }),
      create: (body: { leadUserId: string; serviceId: string; amountEur: string }) =>
        request<{
          id: string;
          createdAt: string;
          paidAt?: string | null;
          amountEur: string;
          commissionPaymentStatus: 'PENDING' | 'PAID';
          commissionSuggestedEur: string | null;
          commissionPaidEur: string | null;
          wantsInvoice: boolean;
          user: {
            id: string;
            name: string | null;
            email: string | null;
            whatsapp: string | null;
            tier: 'MEMBER';
          };
          service: { id: string; title: string; rpmCommissionEur: string | null };
        }>('/partners/me/sales', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      delete: (id: string) =>
        request<{ ok: true }>(`/partners/me/sales/${id}`, { method: 'DELETE' }),
      payCommission: (saleId: string, body: { commissionEur: string; wantsInvoice: boolean }) =>
        request<{ url: string }>(`/partners/me/sales/${saleId}/pay-commission`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      payCommissionMbWay: (saleId: string, body: { commissionEur: string; wantsInvoice: boolean }) =>
        request<{ url: string }>(`/partners/me/sales/${saleId}/pay-commission-mbway`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
    },
  },
  marketplace: {
    categoriesWithPartners: () =>
      request<
        {
          id: string;
          slug: string;
          name: string;
          shortDescription?: string;
          fullDescription?: string;
          backgroundImageUrl?: string;
          partners: {
            id: string;
            name: string;
            logoUrl: string | null;
            backgroundImageUrl: string | null;
            shortDescription: string | null;
            engagement: {
              likeCount: number;
              dislikeCount: number;
              commentCount: number;
              shareCount: number;
            };
          }[];
        }[]
      >('/partners/categories-with-partners', { method: 'GET' }),
    partnerEngagement: (id: string, opts?: { partnerDeviceId?: string | null }) =>
      request<{
        likeCount: number;
        dislikeCount: number;
        commentCount: number;
        shareCount: number;
        myReaction: 'LIKE' | 'DISLIKE' | null;
        hasDeviceComment: boolean;
      }>(`/partners/${id}/engagement`, {
        method: 'GET',
        partnerDeviceId: opts?.partnerDeviceId,
      }),
    partnerComments: (id: string, params?: { take?: number; partnerDeviceId?: string | null }) => {
      const q = new URLSearchParams();
      if (params?.take != null) q.set('take', String(params.take));
      const s = q.toString();
      return request<{
        items: {
          id: string;
          body: string;
          createdAt: string;
          parentId: string | null;
          user: { id: string; name: string } | null;
          guestName: string | null;
          ownedByRequestDevice: boolean;
        }[];
        hasMore: boolean;
        total: number;
      }>(`/partners/${id}/comments${s ? `?${s}` : ''}`, {
        method: 'GET',
        partnerDeviceId: params?.partnerDeviceId,
      });
    },
    setPartnerReaction: (
      id: string,
      body: { type: 'LIKE' | 'DISLIKE' | null },
      opts?: { partnerDeviceId?: string | null },
    ) =>
      request<{ myReaction: 'LIKE' | 'DISLIKE' | null }>(
        `/partners/${id}/engagement/reaction`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
          partnerDeviceId: opts?.partnerDeviceId,
        },
      ),
    createPartnerComment: (
      id: string,
      body: { body: string; parentId?: string; guestName?: string },
      opts?: { partnerDeviceId?: string | null },
    ) =>
      request<{
        id: string;
        body: string;
        createdAt: string;
        parentId: string | null;
        user: { id: string; name: string } | null;
        guestName: string | null;
        ownedByRequestDevice: boolean;
      }>(`/partners/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify(body),
        partnerDeviceId: opts?.partnerDeviceId,
      }),
    deletePartnerComment: (
      partnerId: string,
      commentId: string,
      opts?: { partnerDeviceId?: string | null },
    ) =>
      request<{ ok: true; partnerId: string }>(
        `/partners/${partnerId}/comments/${commentId}`,
        { method: 'DELETE', partnerDeviceId: opts?.partnerDeviceId },
      ),
    recordPartnerShare: (id: string) =>
      request<{ shareCount: number }>(`/partners/${id}/share`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    partnerDetails: (id: string) =>
      request<{
        id: string;
        name: string;
        whatsapp: string;
        logoUrl: string | null;
        shortDescription: string | null;
        fullDescription: string | null;
        backgroundImageUrl: string | null;
        catalogImageUrls: string[];
        catalogVideoUrl?: string | null;
        instagram: string | null;
        category?: { id: string; name: string; slug: string } | null;
        user: { email: string };
        services: {
          id: string;
          title: string;
          description: string | null;
          price: string | null;
          priceOnRequest: boolean;
          contactRedirectPath?: string | null;
        }[];
        heroContactRedirectPath?: string | null;
        publicSlug?: string | null;
      }>(`/partners/${id}/public`, { method: 'GET' }),
    houseContact: (houseId: string) =>
      request<{
        id: string;
        houseId: number;
        publicationStatus: 'PUBLISHED' | 'HIDDEN';
        publishedUntil: string | null;
        partnerId: string;
        title: string;
        city: string;
        businessType: 'RENT' | 'SALE';
        typology: string;
        priceEur: string;
        furnished: boolean;
      }>(`/partners/houses/${encodeURIComponent(houseId)}/contact`, { method: 'GET' }),
    /** Página do anúncio; com JWT, admin/parceiro vê imóveis ocultos. */
    housePublic: (houseId: string) =>
      request<import('@/lib/house-public-server').PublicHousePageData>(
        `/partners/houses/${encodeURIComponent(houseId)}/public`,
        { method: 'GET' },
      ),
    relocationHouses: (query?: {
      partnerId?: string;
      city?: string;
      typology?: string;
      businessType?: 'RENT' | 'SALE';
      minPriceEur?: string;
      maxPriceEur?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (query?.partnerId?.trim()) q.set('partnerId', query.partnerId.trim());
      if (query?.city?.trim()) q.set('city', query.city.trim());
      if (query?.typology?.trim()) q.set('typology', query.typology.trim());
      if (query?.businessType?.trim()) q.set('businessType', query.businessType.trim());
      if (query?.minPriceEur?.trim()) q.set('minPriceEur', query.minPriceEur.trim());
      if (query?.maxPriceEur?.trim()) q.set('maxPriceEur', query.maxPriceEur.trim());
      if (typeof query?.page === 'number' && Number.isFinite(query.page)) {
        q.set('page', String(query.page));
      }
      if (typeof query?.pageSize === 'number' && Number.isFinite(query.pageSize)) {
        q.set('pageSize', String(query.pageSize));
      }
      const qs = q.toString();
      return request<{
        items: {
          id: string;
          houseId: number;
          title: string;
          description: string;
          businessType: 'RENT' | 'SALE';
          typology: string;
          city: string;
          availableFrom: string;
          priceEur: string;
          relocationFeeEur: string;
          caucoesCount: number;
          rendasEntradaCount: number;
          furnished: boolean;
          imageUrls: string[];
          coverImageUrl: string | null;
          videoUrl: string | null;
          videoPosterUrl: string | null;
          partnerId: string;
          featured: boolean;
          publicationStatus: 'PUBLISHED' | 'HIDDEN';
          publishedUntil: string | null;
          lastPublishedAt: string | null;
          partner: {
            id: string;
            name: string;
            whatsapp: string;
            logoUrl: string | null;
            shortDescription: string | null;
          };
        }[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/partners/relocation/houses${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    /** Público: sem Bearer (evita 401 com JWT expirado em rotas @Public). */
    relocationCategory: () =>
      request<{
        slug: string;
        name: string;
        backgroundImageUrl: string | null;
      }>('/partners/relocation/category', { method: 'GET', token: null }),
    },
  checklist: {
    me: () =>
      request<{ data: Record<string, unknown>; version: number; updatedAt: string | null }>('/checklist/me', {
        method: 'GET',
      }),
    updateMe: (body: { data: Record<string, unknown>; version?: number }) =>
      request<{ data: Record<string, unknown>; version: number; updatedAt: string }>(
        '/checklist/me',
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      ),
  },
  affiliate: {
    enroll: (body: {
      instagramHandle: string;
      termsAccepted: boolean;
      payoutMethod: 'MBWAY' | 'PIX';
      mbwayNumber?: string;
      mbwayName?: string;
      pixKey?: string;
      pixName?: string;
    }) =>
      request<{
        id: string;
        instagramHandle: string;
        affiliateCode: string;
        payoutMethod: 'MBWAY' | 'PIX';
        mbwayNumber?: string | null;
        mbwayName?: string | null;
        pixKey?: string | null;
        pixName?: string | null;
        createdAt: string;
      }>('/affiliate/enroll', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () =>
      request<{
        id: string;
        affiliateCode: string;
        instagramHandle: string;
        payoutMethod: 'MBWAY' | 'PIX';
        mbwayNumber?: string | null;
        mbwayName?: string | null;
        pixKey?: string | null;
        pixName?: string | null;
        totals: { pending: number; paid: number };
      } | null>('/affiliate/me', { method: 'GET' }),
    updatePayout: (body: {
      payoutMethod: 'MBWAY' | 'PIX';
      mbwayNumber?: string;
      mbwayName?: string;
      pixKey?: string;
      pixName?: string;
    }) =>
      request<{
        id: string;
        payoutMethod: 'MBWAY' | 'PIX';
        mbwayNumber?: string | null;
        mbwayName?: string | null;
        pixKey?: string | null;
        pixName?: string | null;
      }>('/affiliate/me/payout', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    myReferrals: () =>
      request<{
        affiliateCode: string;
        referrals: {
          id: string;
          name: string;
          instagram: string | null;
          tier: 'MEMBER';
          membershipExpiresAt: string | null;
          role: 'USER' | 'PARTNER' | 'ADMIN';
          createdAt: string;
          commission: { amount: number; currency: 'EUR' | 'BRL' } | null;
        }[];
      }>('/affiliate/my-referrals', { method: 'GET' }),
    myCommissions: () =>
      request<{
        totals: { pending: number; paid: number };
        commissions: {
          id: string;
          amount: number;
          currency: 'EUR' | 'BRL';
          status: 'PENDING' | 'PAID';
          paymentProofUrl?: string | null;
          paidAt?: string | null;
          createdAt: string;
          referredUser: { id: string; name: string; email: string; tier: 'MEMBER' };
        }[];
      }>('/affiliate/my-commissions', { method: 'GET' }),
    adminList: () =>
      request<
        {
          id: string;
          affiliateCode: string;
          instagramHandle: string;
          payoutMethod: 'MBWAY' | 'PIX';
          mbwayNumber?: string | null;
          mbwayName?: string | null;
          pixKey?: string | null;
          pixName?: string | null;
          user: {
            id: string;
            name: string;
            email: string;
            role: 'USER' | 'PARTNER' | 'ADMIN';
            tier: 'MEMBER';
            instagram: string | null;
          };
          totals: { pending: number; paid: number };
          referralsByTier: { inactive: number; member: number; partner: number; admin: number };
        }[]
      >('/affiliate/admin/list', { method: 'GET' }),
    adminPaidCommissions: (affiliateId: string) =>
      request<
        {
          id: string;
          amount: number;
          currency: 'EUR' | 'BRL';
          paidAt: string | null;
          createdAt: string;
          paymentProofUrl: string | null;
        }[]
      >(`/affiliate/admin/${affiliateId}/paid-commissions`, { method: 'GET' }),
    adminDelete: (affiliateId: string) =>
      request<{ ok: true }>(`/affiliate/admin/${encodeURIComponent(affiliateId)}`, {
        method: 'DELETE',
      }),
    adminPay: (affiliateId: string, file: File, commissionIds?: string[]) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      if (commissionIds?.length) {
        commissionIds.forEach((id) => form.append('commissionIds', id));
      }
      const path = `/affiliate/admin/${affiliateId}/pay`;
      return (async () => {
        let res: Response;
        try {
          res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: form,
          });
        } catch (e) {
          rethrowAsUserFacingError(e, path, { isMultipart: true });
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const raw = Array.isArray((data as { message?: unknown }).message)
            ? (data as { message: string[] }).message[0]
            : (data as { message?: string; error?: string }).message ||
              (data as { error?: string }).error ||
              fallbackHttpErrorMessagePt(res.status);
          throw new Error(
            getUserFacingApiError(
              Object.assign(new Error(String(raw)), { status: res.status }),
              { isMultipart: true },
            ),
          );
        }
        return data as { paidCount: number; paymentProofUrl: string };
      })();
    },
  },

  support: {
    createGuestTicket: (params: { name: string; whatsapp: string; message: string }) =>
      request<{ id: string; message: string; createdAt: string }>(`/support/tickets/guest`, {
        method: 'POST',
        body: JSON.stringify(params),
        token: null,
      }),
    createTicket: (message: string) =>
      request<{ id: string; message: string; createdAt: string }>(`/support/tickets`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    myTickets: () =>
      request<{
        items: {
          id: string;
          createdAt: string;
          updatedAt: string;
          status: 'REGISTERED' | 'IN_REVIEW' | 'DONE';
          message: string;
          adminReply?: string | null;
        }[];
      }>(`/support/tickets/me`, { method: 'GET' }),
    updateMyTicket: (id: string, message: string) =>
      request<{
        id: string;
        createdAt: string;
        updatedAt: string;
        status: 'REGISTERED' | 'IN_REVIEW' | 'DONE';
        message: string;
        adminReply?: string | null;
      }>(`/support/tickets/me/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ message }),
      }),
    deleteMyTicket: (id: string) =>
      request<{ ok: true }>(`/support/tickets/me/${id}`, { method: 'DELETE' }),
  },
};
