'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function RegistroPage() {
  const { register, login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'email'>(
    'whatsapp',
  );
  const [affiliateCode, setAffiliateCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('comunidade_ref_affiliate');
    if (stored && stored !== 'nenhum') {
      setAffiliateCode(stored);
    }
  }, []);

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
      const res = await register({
        email,
        password,
        name,
        contactMethod,
        whatsapp: contactMethod === 'email' ? whatsapp : undefined,
        affiliateCode: affiliateCode.trim() || undefined,
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
            <p className="mb-2 text-sm font-medium text-zinc-700">
              Quero ser contactado via:
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContactMethod('whatsapp')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  contactMethod === 'whatsapp'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setContactMethod('email')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  contactMethod === 'email'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                E-mail
              </button>
            </div>
          </div>
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
          {contactMethod === 'email' && (
            <div>
              <label
                htmlFor="whatsapp"
                className="block text-sm font-medium text-zinc-700"
              >
                WhatsApp
              </label>
              <input
                id="whatsapp"
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
                placeholder="Ex: 351256854756"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
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
          <div>
            <label htmlFor="affiliateCode" className="block text-sm font-medium text-zinc-700">
              @ de quem te indicou (opcional)
            </label>
            <input
              id="affiliateCode"
              type="text"
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value)}
              placeholder="Opcional"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? 'A processar…'
              : contactMethod === 'whatsapp'
                ? 'Ativar conta'
                : 'Criar conta'}
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
