'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function RegistroPage() {
  const { register, login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [preferEmail, setPreferEmail] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [info, setInfo] = useState('');

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
        email,
        password,
        name,
        contactMethod: preferEmail ? 'email' : 'whatsapp',
        affiliateCode: refTrimmed,
      });
      if (res.requiresWhatsappVerification && res.whatsappOpenUrl) {
        window.open(res.whatsappOpenUrl, '_blank', 'noopener,noreferrer');
        setInfo(
          'Abriu o WhatsApp noutro separador. Envie a mensagem e aguarde a resposta automática. Depois pode entrar com o seu e-mail e senha.',
        );
        return;
      }
      setStep('verify');
      setInfo(
        'Enviámos um código de confirmação para o seu e-mail. Introduza o código abaixo para concluir o registo.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await api.auth.verifyEmail(email, verificationCode);
      await login(email, password);
      setInfo('E-mail confirmado com sucesso. A entrar na sua conta…');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao confirmar o e-mail. Verifique o código e tente novamente.',
      );
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
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">
              Quero ser contactado via:
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={!preferEmail}
                  onChange={() => setPreferEmail(false)}
                  className="h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-zinc-900">
                  WhatsApp
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={preferEmail}
                  onChange={() => setPreferEmail(true)}
                  className="h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-zinc-900">
                  E-mail
                </span>
              </label>
            </div>
          </div>
          {!preferEmail && (
            <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-sm leading-snug text-blue-950">
              Ao clicar em <span className="font-semibold">Ativar conta</span>, será
              redirecionado para o <span className="font-semibold">WhatsApp</span> com uma
              mensagem já preparada. Envie-a para concluir a ativação da conta na Comunidade
              RPM.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? 'A processar…'
              : preferEmail
                ? 'Criar conta'
                : 'Ativar conta'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <p className="text-sm text-zinc-600">
            Introduza o código de 6 dígitos que recebeu em{' '}
            <span className="font-medium">{email}</span>.
          </p>
          <div>
            <label
              htmlFor="verificationCode"
              className="block text-sm font-medium text-zinc-700"
            >
              Código de confirmação
            </label>
            <input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              maxLength={10}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Confirmando…' : 'Confirmar e-mail e entrar'}
          </button>
        </form>
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
