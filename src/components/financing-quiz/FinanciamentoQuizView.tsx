'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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

type Phase = 'intro' | 'quiz' | 'result';

type SubmitResult = Awaited<ReturnType<typeof api.financingQuiz.submit>>;

export function FinanciamentoQuizView() {
  const router = useRouter();
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

  // Gate inicial: o utilizador indica o WhatsApp antes do quiz. Se já houver um lead com
  // esse número, redirecionamos diretamente para a página de upload/atendimento; caso
  // contrário, mantemos o número e seguimos para o quiz.
  const [introChecking, setIntroChecking] = useState(false);
  const [introError, setIntroError] = useState('');

  const [managers, setManagers] = useState<
    Array<{ id: string; name: string; logoUrl: string | null }>
  >([]);

  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentStep(nextStep(answers));
  }, [answers]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.partner.publicFinancingManagers();
        setManagers(
          res.items.map((m) => ({ id: m.id, name: m.name, logoUrl: m.logoUrl })),
        );
      } catch {
        setManagers([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep, phase]);

  const progress = useMemo(() => estimateProgress(answers), [answers]);

  /**
   * Verifica se o WhatsApp indicado já corresponde a um lead existente. Em caso afirmativo
   * encaminhamos o utilizador para a página de upload/atendimento; caso contrário avançamos
   * para o quiz, mantendo o número para reaproveitar no `request-atendimento` no fim.
   */
  async function handleIntroSubmit() {
    const wa = whatsapp.replace(/\D+/g, '');
    if (wa.length < 8) {
      setWhatsappError('Indica um WhatsApp válido.');
      return;
    }
    setWhatsappError('');
    setIntroError('');
    setIntroChecking(true);
    try {
      await api.leadDocuments.verify({ whatsapp: wa });
      // Lead encontrado — vai direto para a página de upload (auto-verifica pelo query param).
      router.push(`/financiamento/documentos?whatsapp=${encodeURIComponent(wa)}`);
    } catch (err) {
      const e = err as ApiHttpError;
      if (e.status === 404) {
        // Ainda não fez o questionário — segue para o quiz, com o WhatsApp já preenchido.
        setPhase('quiz');
        setIntroChecking(false);
        return;
      }
      setIntroError(
        getUserFacingApiError(e, { context: 'Ao verificar o teu WhatsApp' }),
      );
      setIntroChecking(false);
    }
    // Sem `finally` no caminho feliz: mantemos `introChecking` activo até a navegação
    // concretizar para evitar duplos cliques durante o push do router.
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
      const res = await api.financingQuiz.requestAtendimento({
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
      // Não enviamos email com os dados do parceiro — encaminhamos o lead diretamente para
      // a página de upload, onde verá os contactos da gestora e poderá anexar a documentação.
      router.push(`/financiamento/documentos?whatsapp=${encodeURIComponent(res.whatsapp)}`);
    } catch (err) {
      setAtendimentoError(
        getUserFacingApiError(err as ApiHttpError, {
          context: 'Ao solicitar a gestora',
        }),
      );
      setAtendimentoSubmitting(false);
    }
    // Não fazemos `finally` porque, no caminho feliz, vamos sair desta página via router.push
    // — manter `submitting` activo evita o utilizador clicar duas vezes durante a navegação.
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
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
        ) : (
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
        )}
      </div>

      {phase === 'intro' ? (
        <AtendimentoPanel
          whatsapp={whatsapp}
          setWhatsapp={(v) => {
            setWhatsapp(v);
            if (whatsappError) setWhatsappError('');
            if (introError) setIntroError('');
          }}
          whatsappError={whatsappError}
          loading={introChecking}
          error={introError}
          onSubmit={handleIntroSubmit}
        />
      ) : null}

      {phase === 'intro' && managers.length ? <ManagersStrip items={managers} /> : null}

      {phase === 'intro' ? <StepsSection /> : null}

    </div>
  );
}

function StepsSection() {
  const steps = [
    {
      num: '01',
      title: 'Análise',
      body: 'Primeiro contato, análise de viabilidade, recolha de documentos pessoais, esclarecimento de dúvidas e direcionamento completo.',
    },
    {
      num: '02',
      title: 'Propostas',
      body: 'Retorno da pré aprovação: Apresentação de mais de uma institição para comparar e garantir sempre a melhor proposta.',
    },
    {
      num: '03',
      title: 'Imóvel',
      body: 'Ajuda de consultor imobiliário parceiro, conferência e envio de documentação do imóvel e acompanhamento de avaliação.',
    },
    {
      num: '04',
      title: 'Escrituração',
      body: 'A tão desejada \"chave na mão\", acompanhamos e celebramos esse momento tão especial da sua vida.',
    },
  ];

  return (
    <section className="px-1 py-2 sm:px-0">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Conheça as Etapas
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Do primeiro contacto à chave na mão
        </h2>
      </header>

      <ol className="mt-6 grid gap-6 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.num} className="relative pl-12">
            <span
              aria-hidden
              className="absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800"
            >
              {s.num}
            </span>

            <h3 className="text-lg font-semibold text-zinc-900">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.body}</p>
            <div
              aria-hidden
              className="mt-4 h-px w-full bg-gradient-to-r from-zinc-200 via-zinc-200/40 to-transparent"
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function ManagersStrip(props: {
  items: Array<{ id: string; name: string; logoUrl: string | null }>;
}) {
  return (
    <section className="px-1 py-2 sm:px-0">
      <div className="rounded-2xl bg-gradient-to-b from-amber-50/70 via-transparent to-transparent px-4 py-5 sm:px-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Gestoras de crédito
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Conhece quem vai acompanhar gratuitamente o teu processo do início ao fim.
          </h2>
        </header>

        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {props.items.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl bg-white/70 px-4 py-5 text-center ring-1 ring-zinc-200/70 backdrop-blur-sm"
            >
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-white ring-1 ring-zinc-200 sm:h-40 sm:w-40">
                {m.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.logoUrl}
                    alt={m.name}
                    className="h-28 w-28 rounded-full bg-white object-contain sm:h-36 sm:w-36"
                  />
                ) : (
                  <span className="text-3xl font-semibold text-amber-800">
                    {(m.name?.trim()?.[0] ?? 'G').toUpperCase()}
                  </span>
                )}
              </div>
              <p className="mt-4 text-base font-semibold text-zinc-900">{m.name}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
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
        Rafa, Consigo financiar uma casa em Portugal?
      </h2>

      <ul className="mt-6 space-y-3 text-sm text-zinc-700">
        <Bullet>Apenas 4 a 6 perguntas, todas simples (Sim/Não).</Bullet>
        <Bullet>Resultado imediato, com um exemplo prático.</Bullet>
      </ul>


      <p className="mt-6 text-center text-xs text-zinc-500">
        Os resultados são indicativos e não substituem a análise de um gestor de crédito.
      </p>

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

/**
 * Container alternativo, mostrado abaixo do quiz, para utilizadores que querem ir direto
 * para o atendimento com a gestora de crédito. Pede o WhatsApp e:
 *  - se já houver lead → encaminha para a página de upload (`/financiamento/documentos`).
 *  - se não houver → abre o quiz, mantendo o WhatsApp já preenchido para o final.
 */
function AtendimentoPanel({
  whatsapp,
  setWhatsapp,
  whatsappError,
  loading,
  error,
  onSubmit,
}: {
  whatsapp: string;
  setWhatsapp: (v: string) => void;
  whatsappError: string;
  loading: boolean;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit();
      }}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
        Atendimento gratuito
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
        Quero iniciar o meu atendimento gratuito com uma gestora de crédito
      </h2>


      <div className="mt-5">
        <LoginWhatsappFields
          idPrefix="financiamento-atendimento"
          value={whatsapp}
          onChange={setWhatsapp}
          disabled={loading}
          error={whatsappError}
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'A verificar…' : 'Solicitrar atendimento'}
      </button>
    </form>
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
          className="mt-8 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/70 via-white to-white shadow-sm"
        >
          <div className="border-b border-emerald-100 bg-emerald-50/70 px-6 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Atendimento gratuito
            </p>
          </div>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              Quero iniciar o meu atendimento com a gestora de crédito
            </h3>

            <div className="mt-6 space-y-3">
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
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'A preparar a tua página…'
                : 'Iniciar atendimento gratuito'}
            </button>
          </div>
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


