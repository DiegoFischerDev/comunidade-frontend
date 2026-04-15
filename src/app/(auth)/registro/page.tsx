'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  WHATSAPP_REGISTRATION_POLL_MAX_MS,
  WHATSAPP_REGISTRATION_POLL_TIMEOUT_MESSAGE,
} from '@/lib/whatsapp-registration-poll';

function formatWhatsappRegistrationDisplay(digits: string) {
  const d = digits.replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('351')) {
    const rest = d.slice(3);
    return `+351 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`.trim();
  }
  return d ? `+${d}` : '';
}

export default function RegistroPage() {
  const router = useRouter();
  const { register, loginWithToken } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'whatsappVerify'>('form');
  const [info, setInfo] = useState('');
  const [waCode, setWaCode] = useState('');
  const [waOpenUrl, setWaOpenUrl] = useState('');
  const [waRegistrationNumber, setWaRegistrationNumber] = useState('');
  const [waBrowserSessionToken, setWaBrowserSessionToken] = useState('');
  const waPollStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (step === 'whatsappVerify' && waBrowserSessionToken) {
      waPollStartedAtRef.current = Date.now();
    } else {
      waPollStartedAtRef.current = null;
    }
  }, [step, waBrowserSessionToken]);

  useEffect(() => {
    if (step !== 'whatsappVerify' || !waBrowserSessionToken) return;
    let cancelled = false;
    const tick = async () => {
      const started = waPollStartedAtRef.current;
      if (
        started != null &&
        Date.now() - started > WHATSAPP_REGISTRATION_POLL_MAX_MS
      ) {
        if (!cancelled) {
          setError(WHATSAPP_REGISTRATION_POLL_TIMEOUT_MESSAGE);
          setWaBrowserSessionToken('');
          setStep('form');
        }
        return;
      }
      try {
        const r = await api.auth.pollWhatsappRegistration(waBrowserSessionToken);
        if (cancelled) return;
        if (r.status === 'ready') {
          try {
            sessionStorage.setItem('comunidade_welcome_after_wa', '1');
          } catch {
            // noop
          }
          await loginWithToken(r.token);
          router.push('/dashboard');
          return;
        }
        if (r.status === 'expired') {
          setError(
            'O tempo para ativar a conta neste passo expirou. Crie a conta de novo.',
          );
          setWaBrowserSessionToken('');
          setStep('form');
          return;
        }
        if (r.status === 'consumed') {
          setError(
            'Esta sessão já foi utilizada. Entre com o WhatsApp e a palavra-passe em Entrar.',
          );
          setWaBrowserSessionToken('');
          setStep('form');
          return;
        }
        if (r.status === 'invalid') {
          setError(
            'Não encontrámos o pedido de registo. Volte atrás e tente criar a conta outra vez.',
          );
          setWaBrowserSessionToken('');
          setStep('form');
        }
      } catch {
        // próximo intervalo
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [step, waBrowserSessionToken, loginWithToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const refRaw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('comunidade_ref_affiliate')
          : null;
      const refTrimmed =
        refRaw && refRaw !== 'nenhum' && refRaw.trim().length > 0
          ? refRaw.trim()
          : undefined;

      const res = await register({
        name,
        password,
        affiliateCode: refTrimmed,
      });
      if (
        res.requiresWhatsappVerification &&
        res.whatsappOpenUrl &&
        res.whatsappVerificationCode &&
        res.whatsappRegistrationNumber &&
        res.whatsappBrowserSessionToken
      ) {
        setWaCode(res.whatsappVerificationCode);
        setWaOpenUrl(res.whatsappOpenUrl);
        setWaRegistrationNumber(res.whatsappRegistrationNumber);
        setWaBrowserSessionToken(res.whatsappBrowserSessionToken);
        setStep('whatsappVerify');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
      <h1 className="text-2xl font-semibold text-zinc-900">Criar conta</h1>
      <p className="mt-1 text-sm text-zinc-500">Comunidade RPM</p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {info && !error && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {info}
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
              Nome
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              Senha (mín. 6 caracteres)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="passwordConfirm"
              className="block text-sm font-medium text-zinc-700"
            >
              Confirmar senha
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'A processar…' : 'Criar conta'}
          </button>
        </form>
      )}

      {step === 'whatsappVerify' && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Ativar conta no WhatsApp
          </h2>
          <p className="text-sm text-zinc-500">
            Assim que a mensagem for confirmada, vamos iniciar sessão automaticamente e
            levá-lo ao painel.
          </p>
          <p className="text-sm leading-relaxed text-zinc-700">
            Para ativar a sua conta, envie o código de verificação pelo WhatsApp para{' '}
            <span className="font-semibold text-zinc-900">
              {formatWhatsappRegistrationDisplay(waRegistrationNumber)}
            </span>
            .
          </p>
          <div>
            <p className="text-sm font-medium text-zinc-600">Código de verificação</p>
            <p className="mt-1 select-all rounded-lg border border-zinc-200 bg-zinc-50 py-3 text-center text-2xl font-bold tracking-[0.2em] text-zinc-900">
              {waCode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (waOpenUrl) {
                window.open(waOpenUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            className="w-full rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] py-2.5 font-medium text-white hover:from-[#c07c01] hover:to-[#e7a01f]"
          >
            Enviar
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setWaCode('');
              setWaOpenUrl('');
              setWaRegistrationNumber('');
              setWaBrowserSessionToken('');
            }}
            className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Voltar ao registo
          </button>
        </div>
      )}

      <p className="mt-4 text-center text-sm text-zinc-600">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
