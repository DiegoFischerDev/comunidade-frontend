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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
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
      email: string;
      password: string;
      name: string;
      whatsapp: string;
      affiliateCode?: string;
    }) =>
      request<{
        user: {
          id: string;
          email: string;
          role: string;
          name: string;
          whatsapp: string;
          createdAt: string;
        };
        requiresEmailVerification: boolean;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string; role: string }; token: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
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
    forgotPassword: (email: string) =>
      request<{ success: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
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
  },
  admin: {
    users: {
      list: () =>
        request<
          {
            id: string;
            name: string;
            email: string;
            whatsapp: string;
            role: string;
            tier: string;
            membershipExpiresAt: string | null;
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
          email: string;
          whatsapp: string;
          role: string;
          tier: string;
          membershipExpiresAt: string | null;
          createdAt: string;
        }>(`/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      updateRole: (id: string, role: 'USER' | 'PARTNER' | 'ADMIN') =>
        request<{
          id: string;
          name: string;
          email: string;
          whatsapp: string;
          role: string;
          tier: string;
          membershipExpiresAt: string | null;
          createdAt: string;
        }>(
          `/users/${id}/role`,
          { method: 'PATCH', body: JSON.stringify({ role }) },
        ),
      updateTier: (id: string, body: { tier: 'VISITOR' | 'MEMBER' }) =>
        request<{
          id: string;
          name: string;
          email: string;
          whatsapp: string;
          role: string;
          tier: string;
          membershipExpiresAt: string | null;
          createdAt: string;
        }>(`/users/${id}/tier`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      delete: (id: string) =>
        request<void>(`/users/${id}`, { method: 'DELETE' }),
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
    services: {
      list: () =>
        request<
          {
            id: string;
            title: string;
            description: string | null;
            price: string | null;
            priceOnRequest: boolean;
            commission: string | null;
            cashbackEuro: number | null;
            pendingApproval: boolean;
            createdAt: string;
            partner: { id: string; name: string };
          }[]
        >('/partners/admin/services', { method: 'GET' }),
      listPending: () =>
        request<
          {
            id: string;
            title: string;
            description: string | null;
            price: string | null;
            priceOnRequest: boolean;
            commission: string | null;
            cashbackEuro: number | null;
            pendingApproval: boolean;
            createdAt: string;
            partner: { id: string; name: string };
          }[]
        >('/partners/admin/services/pending', { method: 'GET' }),
      updateCommission: (
        id: string,
        body: { commission?: string | null; cashbackEuro?: number | null },
      ) =>
        request<{
          id: string;
          commission: string | null;
          cashbackEuro: number | null;
        }>(`/partners/admin/services/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      approve: (id: string) =>
        request<{
          id: string;
          pendingApproval: boolean;
        }>(`/partners/admin/services/${id}/approve`, {
          method: 'PATCH',
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
            commission: string | null;
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
          commission: string | null;
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
          commission: string | null;
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
          commission: string | null;
          cashbackEuro: number | null;
          pendingApproval: boolean;
        }[];
      }>(`/partners/${id}/public`, { method: 'GET' }),
    registerLead: (partnerId: string) =>
      request<{ id: string }>(`/partners/${partnerId}/leads`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },
  sales: {
    partnerLookup: () =>
      request<{
        leads: {
          id: string;
          createdAt: string;
          user: { id: string; name: string | null; email: string; whatsapp: string | null };
        }[];
        services: {
          id: string;
          title: string;
          price: string | null;
          priceOnRequest: boolean;
          commission: string | null;
        }[];
      }>('/sales/partner/lookup', { method: 'GET' }),
    partnerCreate: (input: {
      leadId: string;
      serviceId: string;
      month: number;
      year: number;
      amount?: number;
    }) =>
      request<{
        id: string;
      }>('/sales/partner', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    partnerList: () =>
      request<{
        pending: any[];
        approved: any[];
        rejected: any[];
      }>('/sales/partner', { method: 'GET' }),
    partnerUpdateStatus: (id: string, status: 'APPROVED' | 'REJECTED') =>
      request<unknown>(`/sales/partner/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    partnerPayCommission: (
      saleId: string,
      body: {
        amountEuro: number;
        successUrl: string;
        cancelUrl: string;
        wantsInvoice?: boolean;
      },
    ) =>
      request<{ url: string }>(`/sales/partner/${saleId}/pay-commission`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    userLookup: () =>
      request<{
        partners: {
          id: string;
          name: string;
          category?: { name: string } | null;
        }[];
      }>('/sales/user/lookup', { method: 'GET' }),
    userPartnerServices: (partnerId: string) =>
      request<
        {
          id: string;
          title: string;
          price: string | null;
          priceOnRequest: boolean;
          commission: string | null;
          cashbackEuro: number | null;
        }[]
      >(`/sales/user/partners/${partnerId}/services`, { method: 'GET' }),
    userCreate: (input: {
      partnerId: string;
      serviceId: string;
      month: number;
      year: number;
      amount?: number;
    }) =>
      request<{ id: string }>('/sales/user', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    userList: () =>
      request<
        {
          id: string;
          partner: { id: string; name: string };
          service: { title: string; cashbackEuro: number | null } | null;
          month: number;
          year: number;
          amount: number;
          commissionEuro: number;
          status: string;
          commissionPaymentStatus: string;
          cashbackEligible: boolean;
          cashbackRequestedAt: string | null;
          cashbackPayoutMethod?: 'MBWAY' | 'PIX' | null;
          cashbackMbwayNumber: string | null;
          cashbackMbwayName: string | null;
          cashbackPixKey?: string | null;
          cashbackPixName?: string | null;
          cashbackPaidAt: string | null;
          createdAt: string;
        }[]
      >('/sales/user', { method: 'GET' }),
    userRequestCashback: (
      saleId: string,
      body:
        | { method: 'MBWAY'; mbwayNumber: string; mbwayName: string }
        | { method: 'PIX'; pixKey: string; pixName: string },
    ) =>
      request<{ id: string }>(`/sales/user/${saleId}/cashback`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    userAddPaymentProof: (saleId: string, body: { paymentProofUrl: string }) =>
      request<void>(`/sales/user/${saleId}/payment-proof`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    adminList: (params?: { partnerId?: string; status?: string; cashbackOnly?: boolean }) => {
      const search = new URLSearchParams();
      if (params?.partnerId) search.set('partnerId', params.partnerId);
      if (params?.status) search.set('status', params.status);
      if (params?.cashbackOnly) search.set('cashbackOnly', 'true');
      const q = search.toString();
      return request<
        {
          id: string;
          partnerId: string;
          userId: string | null;
          month: number;
          year: number;
          amount: number;
          status: string;
          commissionEuro: number;
          commissionPaymentStatus: string;
          commissionPaidEuro: number | null;
          wantsInvoice?: boolean;
          invoiceName?: string | null;
          invoiceNif?: string | null;
          invoiceAddress?: string | null;
          invoicePostalCode?: string | null;
          invoiceRequestedAt?: string | null;
          invoicePdfUrl?: string | null;
          invoiceSentAt?: string | null;
          cashbackRequestedAt: string | null;
          cashbackPayoutMethod?: 'MBWAY' | 'PIX' | null;
          cashbackMbwayNumber: string | null;
          cashbackMbwayName: string | null;
          cashbackPixKey?: string | null;
          cashbackPixName?: string | null;
          cashbackPaymentProofUrl?: string | null;
          cashbackPaidAt: string | null;
          user: { id: string; name: string; email: string } | null;
          partner: { id: string; name: string };
          service: { title: string; cashbackEuro: number | null } | null;
          serviceTitle: string | null;
        }[]
      >(`/sales/admin${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    adminSendInvoice: (saleId: string, file: File) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      return fetch(`${API_URL}/sales/admin/${saleId}/invoice`, {
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
        return data as {
          id: string;
          invoicePdfUrl: string | null;
          invoiceSentAt: string | null;
        };
      });
    },
    adminMarkCashbackPaid: (saleId: string) =>
      request<{ id: string }>(`/sales/admin/${saleId}/cashback-paid`, {
        method: 'PATCH',
      }),
    adminPayCashback: (saleId: string, file: File) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      return fetch(`${API_URL}/sales/admin/${saleId}/cashback/pay`, {
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
        return data as {
          id: string;
          cashbackPaidAt: string | null;
          cashbackPaymentProofUrl: string | null;
        };
      });
    },
    adminDeleteSale: (saleId: string) =>
      request<{ id: string }>(`/sales/admin/${saleId}`, {
        method: 'DELETE',
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
          user: { id: string; name: string; email: string; role: 'USER' | 'PARTNER' | 'ADMIN'; tier: 'VISITOR' | 'MEMBER' };
          totals: { pending: number; paid: number };
          referralsByTier: { visitor: number; member: number; partner: number; admin: number };
        }[]
      >('/affiliate/admin/list', { method: 'GET' }),
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
};
