"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginWhatsappFields } from "@/components/auth/LoginWhatsappFields";
import { useAuth } from "@/contexts/AuthContext";
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

  const [whatsapp, setWhatsapp] = useState("");
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

  const registroHref =
    next && isSafeInternalNextPath(next)
      ? `/registro?next=${encodeURIComponent(next)}`
      : "/registro";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(whatsapp, password);
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
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
      <h1 className="text-2xl font-semibold text-zinc-900">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-500">Comunidade Rafa Portugal</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <LoginWhatsappFields
          idPrefix="page-login"
          value={whatsapp}
          onChange={setWhatsapp}
          disabled={loading}
        />
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
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
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        Não tem conta?{" "}
        <Link href={registroHref} className="font-medium text-blue-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          A carregar…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
