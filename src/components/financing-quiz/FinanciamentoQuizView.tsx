'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { KiwiFloatInput } from '@/components/membership/KiwiFloatInput';
import { api, type ApiHttpError, getUserFacingApiError } from '@/lib/api';
import {
  answeredSteps,
  applyAnswer,
  clearAnswer,
  estimateProgress,
  nextStep,
  renderQuestion,
  type FinancingAnswers,
  type QuizStepId,
} from '@/lib/financing-quiz';

type Phase = 'intro' | 'quiz' | 'result' | 'sent';

type SubmitResult = Awaited<ReturnType<typeof api.financingQuiz.submit>>;

export function FinanciamentoQuizView() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<FinancingAnswers>({});
  const [currentStep, setCurrentStep] = useState<QuizStepId>('AWAIT_RESIDENCE');

  // Classificação devolvida pelo backend.
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form do "quero falar com a gestora" (exibido dentro do resultado).
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [atendimentoSubmitting, setAtendimentoSubmitting] = useState(false);
  const [atendimentoError, setAtendimentoError] = useState('');

  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentStep(nextStep(answers));
  }, [answers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep, phase]);

  const progress = useMemo(() => estimateProgress(answers), [answers]);

  function handleChoose(stepId: QuizStepId, value: string) {
    setAnswers((prev) => applyAnswer(prev, stepId, value));
  }

  function handleBack() {
    const answered = answeredSteps(answers);
    const last = answered[answered.length - 1];
    if (!last) {
      setPhase('intro');
      return;
    }
    setAnswers((prev) => clearAnswer(prev, last));
  }

  async function submitQuiz(after: FinancingAnswers) {
    setSubmitError('');
    setSubmitLoading(true);
    try {
      const res = await api.financingQuiz.submit({
        answers: {
          residencePt: after.residencePt!,
          mode: after.mode!,
          q2: after.q2,
          q3: after.q3,
          q5: after.q5,
          q7: after.q7,
          capitalOk: after.capitalOk,
          foreignCtef: after.foreignCtef,
          foreignCapital: after.foreignCapital,
        },
      });
      setResult(res);
      setPhase('result');
    } catch (err) {
      setSubmitError(
        getUserFacingApiError(err as ApiHttpError, {
          context: 'Ao calcular o resultado',
        }),
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  function validateAtendimento(): boolean {
    let ok = true;
    if (name.trim().length < 2) {
      setNameError('Diz-nos o teu nome.');
      ok = false;
    } else {
      setNameError('');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Indica um email válido.');
      ok = false;
    } else {
      setEmailError('');
    }
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 8) {
      setWhatsappError('Indica um número de WhatsApp válido.');
      ok = false;
    } else {
      setWhatsappError('');
    }
    return ok;
  }

  async function handleRequestAtendimento(e: React.FormEvent) {
    e.preventDefault();
    if (!result || !validateAtendimento()) return;

    setAtendimentoError('');
    setAtendimentoSubmitting(true);
    try {
      await api.financingQuiz.requestAtendimento({
        name: name.trim(),
        email: email.trim(),
        whatsapp,
        answers: {
          residencePt: answers.residencePt!,
          mode: answers.mode!,
          q2: answers.q2,
          q3: answers.q3,
          q5: answers.q5,
          q7: answers.q7,
          capitalOk: answers.capitalOk,
          foreignCtef: answers.foreignCtef,
          foreignCapital: answers.foreignCapital,
        },
      });
      setPhase('sent');
    } catch (err) {
      setAtendimentoError(
        getUserFacingApiError(err as ApiHttpError, {
          context: 'Ao solicitar a gestora',
        }),
      );
    } finally {
      setAtendimentoSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Financiar casa em Portugal
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Questionário gratuito para descobrir se tem viabilidade de crédito habitação.
        </p>
      </header>

      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      >
        {phase === 'intro' ? (
          <IntroPanel onStart={() => setPhase('quiz')} />
        ) : phase === 'quiz' ? (
          <QuizPanel
            currentStep={currentStep}
            answers={answers}
            progress={progress}
            loading={submitLoading}
            error={submitError}
            onChoose={(value) => {
              if (submitLoading) return;
              const after = applyAnswer(answers, currentStep, value);
              setAnswers(after);
              if (nextStep(after) === 'DONE') {
                void submitQuiz(after);
              }
            }}
            onBack={handleBack}
          />
        ) : phase === 'result' ? (
          <ResultPanel
            result={result!}
            name={name}
            setName={(v) => {
              setName(v);
              if (nameError) setNameError('');
            }}
            email={email}
            setEmail={(v) => {
              setEmail(v);
              if (emailError) setEmailError('');
            }}
            whatsapp={whatsapp}
            setWhatsapp={(v) => {
              setWhatsapp(v);
              if (whatsappError) setWhatsappError('');
            }}
            nameError={nameError}
            emailError={emailError}
            whatsappError={whatsappError}
            submitting={atendimentoSubmitting}
            error={atendimentoError}
            onSubmit={handleRequestAtendimento}
          />
        ) : (
          <SentPanel email={email} />
        )}
      </div>

      <p className="text-center text-xs text-zinc-500">
        Os resultados são indicativos e não substituem a análise de um gestor de crédito.
      </p>
    </div>
  );
}

// ===== Sub-painéis =====

function IntroPanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="px-6 py-10 sm:px-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
        Questionário gratuito
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        Consigo financiar uma casa em Portugal?
      </h2>
      <p className="mt-4 text-base leading-relaxed text-zinc-700">
        Em menos de 1 minuto descobre, em termos gerais, se tem viabilidade para crédito habitação
        — e que percentagem do imóvel costuma ser financiada para o seu perfil.
      </p>

      <ul className="mt-6 space-y-3 text-sm text-zinc-700">
        <Bullet>Apenas 4 a 6 perguntas, todas simples (Sim/Não).</Bullet>
        <Bullet>Resultado imediato, com um exemplo prático.</Bullet>
        <Bullet>
          Se quiseres avançar, deixas o teu email e recebes a foto + contactos da gestora.
        </Bullet>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-amber-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
      >
        Começar questionário
      </button>
    </div>
  );
}

function QuizPanel({
  currentStep,
  answers,
  progress,
  loading,
  error,
  onChoose,
  onBack,
}: {
  currentStep: QuizStepId;
  answers: FinancingAnswers;
  progress: number;
  loading: boolean;
  error: string;
  onChoose: (value: string) => void;
  onBack: () => void;
}) {
  const question = renderQuestion(currentStep, answers);
  if (!question) {
    // Última pergunta respondida; à espera do POST /submit.
    return (
      <div className="px-6 py-12 text-center sm:px-10">
        <p className="text-sm text-zinc-700">A calcular o teu resultado…</p>
      </div>
    );
  }
  const stepNumber = answeredSteps(answers).length + 1;

  return (
    <div>
      <div className="h-1.5 w-full bg-zinc-100">
        <div
          className="h-full bg-amber-500 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(progress * 100, 8)}%` }}
        />
      </div>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Pergunta {stepNumber}
          </p>
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline disabled:opacity-50"
          >
            ← Voltar
          </button>
        </div>

        <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-zinc-900 sm:text-3xl">
          {question.title}
        </h2>
        {question.subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{question.subtitle}</p>
        ) : null}

        <div className="mt-8 grid gap-3">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChoose(opt.value)}
              disabled={loading}
              className="group flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left transition hover:border-amber-400 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-base font-medium text-zinc-900">{opt.label}</span>
              <span
                aria-hidden
                className="text-amber-500 transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  name,
  setName,
  email,
  setEmail,
  whatsapp,
  setWhatsapp,
  nameError,
  emailError,
  whatsappError,
  submitting,
  error,
  onSubmit,
}: {
  result: SubmitResult;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  whatsapp: string;
  setWhatsapp: (v: string) => void;
  nameError: string;
  emailError: string;
  whatsappError: string;
  submitting: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const isInviavel = result.outcome.key === 'inviavel';
  const accent = isInviavel
    ? 'border-red-200 bg-red-50'
    : result.outcome.key === '100'
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-amber-200 bg-amber-50';

  return (
    <div className="px-6 py-8 sm:px-10 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
        Resultado do questionário
      </p>

      <div
        className={`mt-4 whitespace-pre-line rounded-xl border p-5 text-sm leading-relaxed text-zinc-800 ${accent}`}
      >
        {result.outcome.body}
      </div>

      {result.example ? (
        <div className="mt-6">
          {result.example.intro ? (
            <p className="mb-2 text-sm leading-relaxed text-zinc-700">{result.example.intro}</p>
          ) : null}
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-5 font-sans text-sm leading-relaxed text-zinc-800">
            {result.example.body}
          </pre>
        </div>
      ) : null}

      {result.eligibleForAtendimento ? (
        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-8 rounded-xl border border-amber-300 bg-amber-50/60 p-5"
        >
          <p className="text-sm font-semibold text-amber-900">
            Quer falar com uma gestora de crédito gratuitamente?
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            Indica o teu nome, email e WhatsApp. Vais receber por email a foto, os contactos da
            gestora atribuída e o link para enviar a tua documentação.
          </p>

          <div className="mt-4 space-y-3">
            <KiwiFloatInput
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              error={nameError}
              disabled={submitting}
            />
            <KiwiFloatInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              error={emailError}
              disabled={submitting}
            />
            <LoginWhatsappFields
              idPrefix="financiamento"
              value={whatsapp}
              onChange={setWhatsapp}
              disabled={submitting}
              error={whatsappError}
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-amber-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'A enviar email…' : 'Receber dados da gestora por email'}
          </button>
          <p className="mt-2 text-center text-[11px] text-amber-900/80">
            O serviço da gestora é gratuito — quem paga a comissão são os bancos.
          </p>
        </form>
      ) : (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-700">
          Se as condições mudarem, volta a esta página e refaz o questionário. Entretanto, fica
          à vontade para entrares no nosso grupo gratuito de imóveis a venda em Portugal:&nbsp;
          <a
            href="https://chat.whatsapp.com/EneiignxdnuHVy17rh5MTX"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-amber-800 underline-offset-2 hover:underline"
          >
            entrar no grupo
          </a>
          .
        </div>
      )}
    </div>
  );
}

function SentPanel({ email }: { email: string }) {
  return (
    <div className="px-6 py-12 text-center sm:px-10 sm:py-14">
      <div
        aria-hidden
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="M4 4h16v16H4z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900">
        Email enviado!
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700">
        Acabámos de enviar para <strong className="text-zinc-900">{email}</strong> a foto, os
        contactos da gestora atribuída e o link para enviar os teus documentos. A gestora entra em
        contacto pelo WhatsApp em até 4 dias úteis após receber a documentação.
      </p>
      <p className="mt-4 text-xs text-zinc-500">
        Se não vires o email em alguns minutos, verifica a pasta de spam ou promoções.
      </p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
