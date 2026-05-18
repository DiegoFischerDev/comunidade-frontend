'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  setDeviceSessionToken,
  getDeviceSessionToken,
  clearDeviceSessionToken,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_DEVICE_SESSION_STORAGE_KEY,
} from '@/lib/api';

type User = {
  id: string;
  email: string | null;
  role: string;
  name?: string;
  whatsapp?: string;
  tier?: string;
  membershipExpiresAt?: string | null;
  instagram?: string | null;
  profileImageUrl?: string | null;
} | null;

type AuthContextValue = {
  user: User;
  token: string | null;
  loading: boolean;
  isImpersonating: boolean;
  login: (whatsapp: string, password: string) => Promise<void>;
  /** Após pagamento confirmado, aplica o JWT devolvido pelo claim da sessão Stripe. */
  loginWithToken: (token: string) => Promise<void>;
  /** Termina a sessão neste browser (tokens em localStorage são limpos). */
  logout: () => void;
  refreshUser: () => Promise<void>;
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
      clearDeviceSessionToken();
      setUser(null);
      setTokenState(null);
    }
  }, []);

  const loadUserRef = useRef(loadUser);
  loadUserRef.current = loadUser;

  /**
   * Só na montagem inicial do provider (equivale ao primeiro load / refresh da página).
   * Depende de `[]` para não voltar a correr se as referências de callbacks mudarem — caso contrário,
   * após “Sair” (só `comunidade_token` apagado) o efeito podia repetir-se e copiar de novo o JWT
   * de `comunidade_device_session_token` para `comunidade_token`.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let t = getAuthToken();
      if (!t) {
        const device = getDeviceSessionToken();
        if (device) {
          setAuthToken(device);
          t = device;
        }
      }
      if (typeof window !== 'undefined') {
        setIsImpersonating(
          Boolean(window.localStorage.getItem(ADMIN_BACKUP_TOKEN_KEY)),
        );
      }
      if (cancelled) return;
      if (t) {
        await loadUserRef.current(t);
      } else {
        setUser(null);
        setTokenState(null);
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: apenas hidratação inicial
  }, []);

  /**
   * Outras abas (evento `storage`): atualiza React a partir do JWT já em `localStorage`.
   * Não promove token de dispositivo → senão, ao “Sair”, outra aba ou o mesmo fluxo relogava no mesmo segundo.
   */
  const syncAuthStateFromStorageEvent = useCallback(async () => {
    const t = getAuthToken();
    if (typeof window !== 'undefined') {
      setIsImpersonating(
        Boolean(window.localStorage.getItem(ADMIN_BACKUP_TOKEN_KEY)),
      );
    }
    if (t) {
      await loadUser(t);
    } else {
      setUser(null);
      setTokenState(null);
    }
  }, [loadUser]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let debounceId: ReturnType<typeof setTimeout> | undefined;
    const syncFromOtherTab = () => {
      if (debounceId !== undefined) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = undefined;
        void syncAuthStateFromStorageEvent();
      }, 0);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      const relevant =
        e.key === null ||
        e.key === AUTH_TOKEN_STORAGE_KEY ||
        e.key === AUTH_DEVICE_SESSION_STORAGE_KEY ||
        e.key === ADMIN_BACKUP_TOKEN_KEY;
      if (!relevant) return;
      syncFromOtherTab();
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      if (debounceId !== undefined) clearTimeout(debounceId);
    };
  }, [syncAuthStateFromStorageEvent]);

  const login = useCallback(
    async (whatsapp: string, password: string) => {
      const { token: t } = await api.auth.login(whatsapp, password);
      setAuthToken(t);
      setDeviceSessionToken(t);
      await loadUser(t);
      // não alteramos a rota: o utilizador permanece na página atual
    },
    [loadUser],
  );

  const loginWithToken = useCallback(
    async (t: string) => {
      setAuthToken(t);
      setDeviceSessionToken(t);
      await loadUser(t);
    },
    [loadUser],
  );

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_BACKUP_TOKEN_KEY);
    }
    clearAuthToken();
    clearDeviceSessionToken();
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

  const refreshUser = useCallback(async () => {
    const t = getAuthToken();
    if (t) await loadUser(t);
  }, [loadUser]);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    isImpersonating,
    login,
    loginWithToken,
    logout,
    refreshUser,
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
