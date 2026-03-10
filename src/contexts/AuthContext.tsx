'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api';

type User = { id: string; email: string; role: string; name?: string; whatsapp?: string } | null;

type AuthContextValue = {
  user: User;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    name: string;
    whatsapp: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async (t: string) => {
    try {
      const u = await api.auth.me(t);
      setUser(u);
      setTokenState(t);
    } catch {
      clearAuthToken();
      setUser(null);
      setTokenState(null);
    }
  }, []);

  useEffect(() => {
    const t = getAuthToken();
    if (t) {
      loadUser(t).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user: u, token: t } = await api.auth.login(email, password);
      setAuthToken(t);
      setUser(u);
      setTokenState(t);
      router.push('/dashboard');
    },
    [router],
  );

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      name: string;
      whatsapp: string;
    }) => {
      const { user: u, token: t } = await api.auth.register(params);
      setAuthToken(t);
      setUser(u);
      setTokenState(t);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setTokenState(null);
    router.push('/login');
  }, [router]);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
