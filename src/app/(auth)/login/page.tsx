"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LoginMethodSwitchLink,
  type LoginMethod,
} from "@/components/auth/LoginMethodSwitchLink";
import { LoginWhatsappFields } from "@/components/auth/LoginWhatsappFields";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_NAME_FULL } from "@/lib/site-branding";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/lib/auth-ui-events";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard-home";
import {
  LOGIN_PASSWORD_STORAGE_KEY,
  persistLoginPasswordToStorage,
} from "@/lib/login-phone-storage";

function isSafeInternalNextPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("whatsapp");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordHydrated, setPasswordHydrated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(LOGIN_PASSWORD_STORAGE_KEY);
      if (saved) setPassword(saved);
    } catch {
      // noop
    }
    setPasswordHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !passwordHydrated) return;
    try {
      if (password) {
        localStorage.setItem(LOGIN_PASSWORD_STORAGE_KEY, password);
      } else {
        localStorage.removeItem(LOGIN_PASSWORD_STORAGE_KEY);
      }
    } catch {
      // noop
    }
  }, [passwordHydrated, password]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== LOGIN_PASSWORD_STORAGE_KEY) {
        return;
      }
      setPassword(e.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (loginMethod === "email") {
        await login({ email: email.trim(), password });
      } else {
        await login({ whatsapp, password });
      }
      if (next && isSafeInternalNextPath(next)) {
        router.replace(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-card p-8 shadow-sm ring-1 ring-zinc-200">
      <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
      <p className="mt-1 text-sm text-muted">{SITE_NAME_FULL}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {loginMethod === "whatsapp" ? (
          <LoginWhatsappFields
            idPrefix="page-login"
            value={whatsapp}
            onChange={setWhatsapp}
            disabled={loading}
            labelAction={
              <LoginMethodSwitchLink
                method={loginMethod}
                onSwitch={(method) => {
                  setLoginMethod(method);
                  setError("");
                }}
                disabled={loading}
              />
            }
          />
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="page-login-email" className="text-sm font-medium text-foreground/90">
                E-mail
              </label>
              <LoginMethodSwitchLink
                method={loginMethod}
                onSwitch={(method) => {
                  setLoginMethod(method);
                  setError("");
                }}
                disabled={loading}
              />
            </div>
            <input
              id="page-login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25 disabled:opacity-50"
            />
          </div>
        )}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground/90">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => {
              const v = e.target.value;
              setPassword(v);
              if (passwordHydrated) persistLoginPasswordToStorage(v);
            }}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-primary py-2.5 font-medium text-white hover:bg-brand-primary-dark disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
            router.push(DASHBOARD_HOME_PATH);
          }}
          className="cursor-pointer font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          Ativar membro VIP
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl bg-card p-8 text-center text-sm text-muted ring-1 ring-zinc-200">
          A carregar…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
