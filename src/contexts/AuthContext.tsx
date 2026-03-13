'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api';

type User = {
  id: string;
  email: string;
  role: string;
  name?: string;
  whatsapp?: string;
} | null;

type AuthContextValue = {
  user: User;
  token: string | null;
  loading: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    name: string;
    whatsapp: string;
  }) => Promise<void>;
  logout: () => void;
  impersonateAsUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const ADMIN_BACKUP_TOKEN_KEY = 'comunidade_admin_token';

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
    if (typeof window !== 'undefined') {
      const backup = window.localStorage.getItem(ADMIN_BACKUP_TOKEN_KEY);
      if (backup) {
        setIsImpersonating(true);
      }
    }
    if (t) {
      loadUser(t).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: t } = await api.auth.login(email, password);
      setAuthToken(t);
      await loadUser(t);
      // não alteramos a rota: o utilizador permanece na página atual
    },
    [loadUser],
  );

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      name: string;
      whatsapp: string;
    }) => {
      await api.auth.register(params);
    },
    [],
  );

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_BACKUP_TOKEN_KEY);
    }
    clearAuthToken();
    setUser(null);
    setTokenState(null);
    setIsImpersonating(false);
  }, []);

  const impersonateAsUser = useCallback(
    async (userId: string) => {
      const currentToken = getAuthToken();
      if (!currentToken) {
        throw new Error('Sessão de administrador não encontrada.');
      }
      const { token: impersonatedToken } = await api.auth.impersonate(userId);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ADMIN_BACKUP_TOKEN_KEY, currentToken);
      }

      setAuthToken(impersonatedToken);
      await loadUser(impersonatedToken);
      setIsImpersonating(true);
    },
    [loadUser],
  );

  const stopImpersonation = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const backup = window.localStorage.getItem(ADMIN_BACKUP_TOKEN_KEY);
    if (!backup) {
      return;
    }
    window.localStorage.removeItem(ADMIN_BACKUP_TOKEN_KEY);
    setAuthToken(backup);
    await loadUser(backup);
    setIsImpersonating(false);
  }, [loadUser]);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    isImpersonating,
    login,
    register,
    logout,
    impersonateAsUser,
    stopImpersonation,
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
