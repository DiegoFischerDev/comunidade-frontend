const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('comunidade_token');
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('comunidade_token', token);
  }
};

export const clearAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('comunidade_token');
  }
};

export const getAuthToken = getToken;

type RequestOptions = RequestInit & { token?: string | null };

/** Mensagem antiga da API que não queremos mostrar ao utilizador (ex.: stage ainda no deploy anterior). */
function shouldHideApiMessage(text: string): boolean {
  return text.includes('Perfil de afiliado não encontrado');
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token = getToken(), ...init } = options;
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
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Erro ${res.status}`;
    msg = typeof msg === 'string' ? msg : String(msg);
    if (shouldHideApiMessage(msg)) {
      throw new Error('');
    }
    throw new Error(msg);
  }
  return data as T;
}

export const api = {
  auth: {
    register: (params: {
      name: string;
      password: string;
      affiliateCode?: string;
    }) =>
      request<{
        user: {
          id: string;
          role: string;
          name: string;
          whatsapp?: string;
          createdAt: string;
        };
        requiresEmailVerification: boolean;
        requiresWhatsappVerification?: boolean;
        whatsappVerificationCode?: string;
        whatsappRegistrationNumber?: string;
        whatsappOpenUrl?: string;
        whatsappBrowserSessionToken?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    login: (whatsapp: string, password: string) =>
      request<{ user: { id: string; email: string | null; whatsapp: string | null; role: string }; token: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ whatsapp, password }) },
      ),
    /** Polling após registo com WhatsApp: JWT quando a conta estiver criada. */
    pollWhatsappRegistration: (browserSessionToken: string) =>
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
      >(
        `/auth/whatsapp/registration-poll?token=${encodeURIComponent(browserSessionToken)}`,
        { method: 'GET' },
      ),
    // Endpoints de verificação por e-mail são mantidos apenas para retrocompatibilidade.
    verifyEmail: (email: string, code: string) =>
      request<{ success: boolean }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      }),
    resendVerification: (email: string) =>
      request<{ success: boolean }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    forgotPassword: (whatsapp: string) =>
      request<{ success: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ whatsapp }),
      }),
    resetPassword: (params: {
      whatsapp: string;
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
      request<{ eurCents: number; pixCentavos: number }>('/stripe/membership-amounts', {
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
        days: { date: string; slots: { startsAt: string; endsAt: string }[] }[];
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
      updateTier: (id: string, body: { tier: 'VISITOR' | 'MEMBER' }) =>
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
    partners: {
      list: () =>
        request<
          {
            id: string;
            name: string;
            whatsapp: string;
            logoUrl: string | null;
            createdAt: string;
            user: { id: string; email: string; role: string };
            category: { id: string; name: string; slug: string } | null;
          }[]
        >('/partners', { method: 'GET' }),
      create: (input: {
        email: string;
        password: string;
        name: string;
        whatsapp: string;
        logoUrl?: string;
      }) =>
        request<{
          user: { id: string; email: string; role: string };
          partner: {
            id: string;
            name: string;
            whatsapp: string;
            logoUrl: string | null;
            createdAt: string;
          };
        }>('/partners', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      delete: (id: string) =>
        request<void>(`/partners/${id}`, { method: 'DELETE' }),
      update: (id: string, input: { categoryId?: string | null }) =>
        request<{
          id: string;
          name: string;
          whatsapp: string;
          logoUrl: string | null;
          createdAt: string;
          user: { id: string; email: string; role: string };
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
    categories: {
      list: () =>
        request<
          {
            id: string;
            slug: string;
            name: string;
            description?: string;
            backgroundImageUrl?: string;
            sortOrder: number;
          }[]
        >('/partners/admin/categories', { method: 'GET' }),
      create: (input: {
        slug: string;
        name: string;
        description?: string;
        backgroundImageUrl?: string;
        sortOrder?: number;
      }) =>
        request<{
          id: string;
          slug: string;
          name: string;
          description?: string;
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
          description?: string;
          backgroundImageUrl?: string;
          sortOrder?: number;
        },
      ) =>
        request<{
          id: string;
          slug: string;
          name: string;
          description?: string;
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
        instagram: string | null;
        billingName?: string | null;
        billingNif?: string | null;
        billingAddress?: string | null;
        billingPostalCode?: string | null;
      }>('/partners/me', { method: 'GET' }),
    updateMe: (input: {
      logoUrl?: string;
      shortDescription?: string;
      fullDescription?: string;
      backgroundImageUrl?: string;
      catalogImageUrls?: string[];
      instagram?: string;
      billingName?: string | null;
      billingNif?: string | null;
      billingAddress?: string | null;
      billingPostalCode?: string | null;
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
        instagram: string | null;
        billingName?: string | null;
        billingNif?: string | null;
        billingAddress?: string | null;
        billingPostalCode?: string | null;
      }>('/partners/me', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    services: {
      list: () =>
        request<
          {
            id: string;
            title: string;
            description: string | null;
            price: string | null;
            priceOnRequest: boolean;
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
          createdAt: string;
        }>(`/partners/me/services/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      delete: (id: string) =>
        request<void>(`/partners/me/services/${id}`, { method: 'DELETE' }),
    },
    leads: {
      list: () =>
        request<
          {
            id: string;
            createdAt: string;
            user: { name: string | null; email: string; whatsapp: string | null };
          }[]
        >('/partners/me/leads', { method: 'GET' }),
    },
  },
  marketplace: {
    categoriesWithPartners: () =>
      request<
        {
          id: string;
          slug: string;
          name: string;
          description?: string;
          backgroundImageUrl?: string;
          partners: {
            id: string;
            name: string;
            backgroundImageUrl: string | null;
            shortDescription: string | null;
          }[];
        }[]
      >('/partners/categories-with-partners', { method: 'GET' }),
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
        instagram: string | null;
        category?: { id: string; name: string; slug: string } | null;
        user: { email: string };
        services: {
          id: string;
          title: string;
          description: string | null;
          price: string | null;
          priceOnRequest: boolean;
        }[];
      }>(`/partners/${id}/public`, { method: 'GET' }),
    registerLead: (partnerId: string) =>
      request<{ id: string }>(`/partners/${partnerId}/leads`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
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
          tier: 'VISITOR' | 'MEMBER';
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
          referredUser: { id: string; name: string; email: string; tier: 'VISITOR' | 'MEMBER' };
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
            tier: 'VISITOR' | 'MEMBER';
            instagram: string | null;
          };
          totals: { pending: number; paid: number };
          referralsByTier: { visitor: number; member: number; partner: number; admin: number };
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
    adminPay: (affiliateId: string, file: File, commissionIds?: string[]) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      if (commissionIds?.length) {
        commissionIds.forEach((id) => form.append('commissionIds', id));
      }
      return fetch(`${API_URL}/affiliate/admin/${affiliateId}/pay`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = Array.isArray(data.message)
            ? data.message[0]
            : data.message || data.error || `Erro ${res.status}`;
          throw new Error(msg);
        }
        return data as { paidCount: number; paymentProofUrl: string };
      });
    },
  },

  support: {
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
