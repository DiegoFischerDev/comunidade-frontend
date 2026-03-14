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
    const msg = Array.isArray(data.message) ? data.message[0] : data.message || data.error || `Erro ${res.status}`;
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
    me: (token: string) =>
      request<{ id: string; email: string; role: string; name?: string; whatsapp?: string }>(
        '/auth/me',
        {
          method: 'GET',
          token,
        },
      ),
    impersonate: (userId: string) =>
      request<{
        user: { id: string; email: string; role: string; name?: string; whatsapp?: string };
        token: string;
      }>('/auth/impersonate', {
        method: 'POST',
        body: JSON.stringify({ userId }),
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
          createdAt: string;
        }>(
          `/users/${id}/role`,
          { method: 'PATCH', body: JSON.stringify({ role }) },
        ),
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
            createdAt: string;
            partner: { id: string; name: string };
          }[]
        >('/partners/admin/services', { method: 'GET' }),
      updateCommission: (
        id: string,
        body: { commission?: string | null },
      ) =>
        request<{
          id: string;
          commission: string | null;
        }>(`/partners/admin/services/${id}`, {
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
      }>('/partners/me', { method: 'GET' }),
    updateMe: (input: {
      logoUrl?: string;
      shortDescription?: string;
      fullDescription?: string;
      backgroundImageUrl?: string;
      catalogImageUrls?: string[];
      instagram?: string;
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
          service: { title: string };
          month: number;
          year: number;
          amount: number;
          commissionEuro: number;
          status: string;
          commissionPaymentStatus: string;
          cashbackEligible: boolean;
          createdAt: string;
        }[]
      >('/sales/user', { method: 'GET' }),
  },
};
