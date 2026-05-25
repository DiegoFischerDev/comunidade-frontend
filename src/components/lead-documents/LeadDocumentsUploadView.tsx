'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { api, getUserFacingApiError, type ApiHttpError } from '@/lib/api';
import {
  DISPONIBILIDADES_FIADOR,
  DOC_DESCRIPTIONS,
  DOC_STANDARD_NAMES,
  ESTADOS_CIVIS,
  type DocFieldName,
  type EstadoCivil,
  type DisponibilidadeFiador,
  VINCULOS_LABORAIS,
  type VinculoLaboral,
  bytesToHumanReadable,
  digitsOnly,
  getRequiredDocFields,
  labelForMode,
  type LeadDocumentSubmissionMode,
  MAX_FILE_BYTES,
} from '@/lib/lead-documents';
import {
  clearLeadStorage,
  deleteFile,
  listSavedFields,
  readFile,
  readFormState,
  saveFile,
  saveFormState,
} from '@/lib/lead-documents-storage';
import { DocumentBlock } from './DocumentBlock';

type PartnerInfo = {
  id: string;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  shortDescription: string | null;
  email: string | null;
};

type LeadInfo = { id: string; name: string; email: string };

type Phase = 'gate' | 'form' | 'sent';

type StoredFormState = {
  estadoCivil: EstadoCivil | '';
  numDependentes: string;
  anosEmprego: string;
  vinculoLaboral: VinculoLaboral | '';
  disponibilidadeFiador: DisponibilidadeFiador | '';
  financiamento100: boolean;
  mensagem: string;
  semDocsLabels: string[];
  consent: boolean;
  nome: string;
  email: string;
};

const DEFAULT_FORM_STATE: StoredFormState = {
  estadoCivil: '',
  numDependentes: '',
  anosEmprego: '',
  vinculoLaboral: '',
  disponibilidadeFiador: '',
  financiamento100: false,
  mensagem: '',
  semDocsLabels: [],
  consent: false,
  nome: '',
  email: '',
};

function fileTooLarge(file: File): boolean {
  return file.size > MAX_FILE_BYTES;
}

export function LeadDocumentsUploadView() {
  const searchParams = useSearchParams();
  const initialWhatsapp = useMemo(() => {
    const raw = searchParams?.get('whatsapp') ?? '';
    return digitsOnly(raw);
  }, [searchParams]);

  const [phase, setPhase] = useState<Phase>('gate');
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  /** WhatsApp já validado pelo backend — usado como chave do IndexedDB e no submit. */
  const [verifiedWhatsapp, setVerifiedWhatsapp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [docsSentAt, setDocsSentAt] = useState<string | null>(null);
  const [mode, setMode] = useState<LeadDocumentSubmissionMode>('main');

  const [form, setForm] = useState<StoredFormState>(DEFAULT_FORM_STATE);
  const [files, setFiles] = useState<Partial<Record<DocFieldName, File | null>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<DocFieldName, string>>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Restaurar estado guardado quando entramos no formulário.
  useEffect(() => {
    if (phase !== 'form' || !verifiedWhatsapp) return;
    (async () => {
      try {
        const saved = await readFormState(verifiedWhatsapp);
        if (saved && typeof saved === 'object') {
          setForm((prev) => ({ ...prev, ...(saved as Partial<StoredFormState>) }));
        }
        const fields = await listSavedFields(verifiedWhatsapp);
        const restored: Partial<Record<DocFieldName, File | null>> = {};
        for (const f of fields) {
          const file = await readFile(verifiedWhatsapp, f);
          if (file) restored[f as DocFieldName] = file;
        }
        if (Object.keys(restored).length) {
          setFiles((prev) => ({ ...prev, ...restored }));
        }
      } catch {
        // Sem persistência local — não é fatal.
      }
    })();
  }, [verifiedWhatsapp, phase]);

  // Persistir estado do formulário sempre que mudar.
  useEffect(() => {
    if (phase !== 'form' || !verifiedWhatsapp) return;
    saveFormState(
      verifiedWhatsapp,
      form as unknown as Record<string, unknown>,
    ).catch(() => undefined);
  }, [verifiedWhatsapp, phase, form]);

  const requiredFields = useMemo<DocFieldName[]>(() => {
    if (!form.vinculoLaboral) return [];
    return getRequiredDocFields({
      vinculo: form.vinculoLaboral,
      financiamento100: form.financiamento100,
    });
  }, [form.vinculoLaboral, form.financiamento100]);

  const attachedCount = useMemo(
    () => requiredFields.filter((f) => !!files[f]).length,
    [requiredFields, files],
  );

  const showFiadorQuestion =
    form.vinculoLaboral === 'Contrato temporário' ||
    form.vinculoLaboral === 'Recibos verdes';

  const handleVerify = useCallback(
    async (rawWhatsapp?: string) => {
      const wa = digitsOnly(rawWhatsapp ?? whatsapp);
      if (wa.length < 6) {
        setVerifyError('Indica o teu número de WhatsApp.');
        return;
      }
      setVerifying(true);
      setVerifyError('');
      try {
        const data = await api.leadDocuments.verify({ whatsapp: wa });
        setVerifiedWhatsapp(wa);
        setLead(data.lead);
        setPartner(data.partner);
        setDocsSentAt(data.docsSentAt);
        setForm((prev) => ({
          ...prev,
          nome: prev.nome || data.lead.name,
          email: prev.email || data.lead.email,
        }));
        setPhase('form');
      } catch (err) {
        const e = err as ApiHttpError;
        if (e.status === 404) {
          setVerifyError(
            'Não encontrámos nenhum pedido de financiamento para este número. Confirma se introduziste o mesmo WhatsApp que usaste no questionário — se ainda não fizeste, faz o questionário primeiro em /financiamento.',
          );
        } else {
          setVerifyError(
            getUserFacingApiError(e, { context: 'Ao confirmar o teu WhatsApp' }),
          );
        }
      } finally {
        setVerifying(false);
      }
    },
    [whatsapp],
  );

  // Auto-verify quando a página é aberta com `?whatsapp=...` (vindo do final do quiz).
  const autoVerifyAttempted = useRef(false);
  useEffect(() => {
    if (autoVerifyAttempted.current) return;
    if (!initialWhatsapp || initialWhatsapp.length < 6) return;
    autoVerifyAttempted.current = true;
    void handleVerify(initialWhatsapp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWhatsapp]);

  const handlePickFile = useCallback(
    async (field: DocFieldName, file: File) => {
      setFileErrors((prev) => ({ ...prev, [field]: undefined }));
      if (fileTooLarge(file)) {
        setFileErrors((prev) => ({
          ...prev,
          [field]: `Ficheiro com ${bytesToHumanReadable(file.size)} excede o limite de 15 MB.`,
        }));
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
        setFileErrors((prev) => ({
          ...prev,
          [field]: 'Formato não aceite. Usa PDF, JPG ou PNG.',
        }));
        return;
      }
      setFiles((prev) => ({ ...prev, [field]: file }));
      if (!verifiedWhatsapp) return;
      try {
        await saveFile(verifiedWhatsapp, field, file);
      } catch {
        // IndexedDB indisponível — o ficheiro continua em memória, perde-se ao recarregar.
      }
    },
    [verifiedWhatsapp],
  );

  const handleRemoveFile = useCallback(
    async (field: DocFieldName) => {
      setFiles((prev) => ({ ...prev, [field]: null }));
      setFileErrors((prev) => ({ ...prev, [field]: undefined }));
      if (!verifiedWhatsapp) return;
      try {
        await deleteFile(verifiedWhatsapp, field);
      } catch {
        // ignore
      }
    },
    [verifiedWhatsapp],
  );

  const handleToggleSemDocs = useCallback((label: string, checked: boolean) => {
    setForm((prev) => {
      const set = new Set(prev.semDocsLabels);
      if (checked) set.add(label);
      else set.delete(label);
      return { ...prev, semDocsLabels: Array.from(set) };
    });
  }, []);

  const validate = useCallback((): string | null => {
    if (!form.nome.trim()) return 'Indica o teu nome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Indica um email válido.';
    }
    if (!form.vinculoLaboral) return 'Indica o teu vínculo laboral.';
    if (!form.estadoCivil) return 'Indica o teu estado civil.';
    if (!form.consent) {
      return 'Tens de aceitar partilhar os documentos com o parceiro para continuar.';
    }
    if (showFiadorQuestion && !form.disponibilidadeFiador) {
      return 'Indica se terias disponibilidade para apresentar um fiador.';
    }
    const anyAttached = requiredFields.some((f) => !!files[f]);
    if (!anyAttached) {
      return 'Anexa pelo menos um documento antes de enviar.';
    }
    return null;
  }, [
    form.nome,
    form.email,
    form.vinculoLaboral,
    form.estadoCivil,
    form.consent,
    form.disponibilidadeFiador,
    showFiadorQuestion,
    requiredFields,
    files,
  ]);

  const handleSubmit = useCallback(async () => {
    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }
    if (!verifiedWhatsapp) {
      setSubmitError('Sessão expirada. Confirma o teu WhatsApp novamente.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('whatsapp', verifiedWhatsapp);
      fd.append('mode', mode);
      fd.append('nome', form.nome);
      fd.append('email', form.email);
      fd.append('estado_civil', form.estadoCivil);
      fd.append('num_dependentes', form.numDependentes);
      fd.append('anos_emprego_atual', form.anosEmprego);
      fd.append('vinculo_laboral', form.vinculoLaboral);
      fd.append('disponibilidade_fiador', form.disponibilidadeFiador);
      fd.append('financiamento_100', form.financiamento100 ? '1' : '0');
      fd.append('mensagem_gestora', form.mensagem);
      if (form.semDocsLabels.length) {
        fd.append('sem_docs_labels', form.semDocsLabels.join(','));
      }
      for (const field of requiredFields) {
        const f = files[field];
        if (f) fd.append(field, f, f.name);
      }
      await api.leadDocuments.submit(fd);
      try {
        await clearLeadStorage(verifiedWhatsapp);
      } catch {
        // ignore
      }
      setFiles({});
      setForm((prev) => ({
        ...prev,
        semDocsLabels: [],
        mensagem: '',
        consent: false,
      }));
      setPhase('sent');
    } catch (err) {
      setSubmitError(
        getUserFacingApiError(err as ApiHttpError, {
          context: 'Ao enviar os documentos',
          isMultipart: true,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }, [validate, verifiedWhatsapp, mode, form, requiredFields, files]);

  const handleStartNewMode = useCallback(
    (nextMode: LeadDocumentSubmissionMode) => {
      setMode(nextMode);
      setFiles({});
      setForm({
        ...DEFAULT_FORM_STATE,
        nome: lead?.name ?? '',
        email: lead?.email ?? '',
      });
      setSubmitError('');
      setFileErrors({});
      setPhase('form');
    },
    [lead],
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Comunidade Rafa Portugal
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">
            Envio de documentos
          </h1>
        </header>

        {phase === 'gate' ? (
          <GatePanel
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            error={verifyError}
            loading={verifying}
            onSubmit={handleVerify}
          />
        ) : null}

        {phase === 'form' && lead && partner ? (
          <FormPanel
            partner={partner}
            docsSentAt={docsSentAt}
            mode={mode}
            form={form}
            setForm={setForm}
            requiredFields={requiredFields}
            attachedCount={attachedCount}
            files={files}
            fileErrors={fileErrors}
            onPick={handlePickFile}
            onRemove={handleRemoveFile}
            onToggleSemDocs={handleToggleSemDocs}
            showFiadorQuestion={showFiadorQuestion}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        ) : null}

        {phase === 'sent' && partner ? (
          <SentPanel partner={partner} onStartNewMode={handleStartNewMode} mode={mode} />
        ) : null}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subcomponentes
// -----------------------------------------------------------------------------

function GatePanel(props: {
  whatsapp: string;
  setWhatsapp: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: () => void;
}) {
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      props.onSubmit();
    }
  }
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Confirma o teu WhatsApp</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Para abrirmos a tua página de envio, confirma o número de WhatsApp que usaste no
        questionário de financiamento.
      </p>
      <div className="mt-4" onKeyDown={onKeyDown}>
        <LoginWhatsappFields
          idPrefix="lead-docs"
          value={props.whatsapp}
          onChange={props.setWhatsapp}
          disabled={props.loading}
          error={props.error}
        />
      </div>
      {props.error ? null : (
        <p className="mt-2 text-xs text-zinc-500">
          Usamos este número apenas para te identificar — não enviamos mensagens.
        </p>
      )}
      <button
        type="button"
        onClick={props.onSubmit}
        disabled={props.loading}
        className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
      >
        {props.loading ? 'A confirmar…' : 'Confirmar e continuar'}
      </button>
    </section>
  );
}

function PartnerCard({ partner }: { partner: PartnerInfo }) {
  const wa = digitsOnly(partner.whatsapp);
  const initial = (partner.name?.trim()?.charAt(0) ?? 'P').toUpperCase();
  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 via-white to-white shadow-sm">
      <div className="border-b border-amber-100 px-6 py-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
          A tua gestora de crédito
        </p>
      </div>
      <div className="px-6 py-8 text-center sm:px-10 sm:py-10">
        {partner.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logoUrl}
            alt={partner.name}
            className="mx-auto h-32 w-32 rounded-2xl border border-amber-200 bg-white object-contain p-3 shadow-sm sm:h-40 sm:w-40"
          />
        ) : (
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl border border-amber-200 bg-white text-4xl font-semibold text-amber-700 shadow-sm sm:h-40 sm:w-40">
            {initial}
          </div>
        )}
        <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          {partner.name}
        </h3>
        {partner.shortDescription ? (
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
            {partner.shortDescription}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M19.05 4.91A10 10 0 0 0 4.1 18.39L2 22l3.7-1.97a10 10 0 0 0 13.35-15.12Zm-7.04 15.31a8.34 8.34 0 0 1-4.25-1.16l-.3-.18-2.2 1.17.59-2.27-.2-.3a8.36 8.36 0 1 1 6.36 2.74Zm4.6-6.21c-.25-.13-1.5-.74-1.73-.83-.23-.08-.4-.13-.57.13-.16.25-.65.83-.8 1-.14.16-.3.19-.55.06-.25-.13-1.07-.39-2.04-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.12-.12.25-.3.38-.45.13-.15.16-.25.25-.42.08-.16.04-.31-.02-.44-.06-.13-.57-1.38-.78-1.89-.21-.5-.42-.43-.57-.43h-.49c-.16 0-.42.06-.65.31s-.86.84-.86 2.05.88 2.39 1 2.55c.13.16 1.74 2.66 4.22 3.73.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.5-.61 1.71-1.2.21-.6.21-1.1.15-1.21-.06-.1-.23-.16-.49-.29Z" />
              </svg>
              WhatsApp
            </a>
          ) : null}
          {partner.email ? (
            <a
              href={`mailto:${partner.email}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              Email
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FormPanel(props: {
  partner: PartnerInfo;
  docsSentAt: string | null;
  mode: LeadDocumentSubmissionMode;
  form: StoredFormState;
  setForm: React.Dispatch<React.SetStateAction<StoredFormState>>;
  requiredFields: DocFieldName[];
  attachedCount: number;
  files: Partial<Record<DocFieldName, File | null>>;
  fileErrors: Partial<Record<DocFieldName, string>>;
  onPick: (field: DocFieldName, file: File) => void;
  onRemove: (field: DocFieldName) => void;
  onToggleSemDocs: (label: string, checked: boolean) => void;
  showFiadorQuestion: boolean;
  submitting: boolean;
  submitError: string;
  onSubmit: () => void;
}) {
  const {
    partner,
    docsSentAt,
    mode,
    form,
    setForm,
    requiredFields,
    attachedCount,
    files,
    fileErrors,
    onPick,
    onRemove,
    onToggleSemDocs,
    showFiadorQuestion,
    submitting,
    submitError,
    onSubmit,
  } = props;

  const totalRequired = requiredFields.length;
  const progressPct = totalRequired ? Math.round((attachedCount / totalRequired) * 100) : 0;

  // Documentos em falta = pedidos mas ainda não anexados.
  const missingForCheckboxes = useMemo(
    () =>
      requiredFields
        .filter((f) => !files[f])
        .map((f) => ({ field: f, label: DOC_STANDARD_NAMES[f] })),
    [requiredFields, files],
  );

  return (
    <div className="space-y-5">
      {docsSentAt ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Já recebemos um envio teu.</p>
          <p className="mt-1 text-emerald-800">
            Podes continuar a anexar documentos em falta — cada submissão envia um novo email
            ao teu parceiro com tudo o que anexares agora.
          </p>
        </div>
      ) : null}

      <PartnerCard partner={partner} />

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900">Os teus dados</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Confirma o nome e o email para a gestora — usamos estes dados no email da
            análise.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" htmlFor="lead-docs-nome">
            <input
              id="lead-docs-nome"
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              autoComplete="name"
            />
          </Field>

          <Field label="Email" htmlFor="lead-docs-email">
            <input
              id="lead-docs-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              autoComplete="email"
              placeholder="exemplo@email.com"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900">
            Sobre o teu perfil financeiro
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {labelForMode(mode)}. Estes dados ajudam a gestora a preparar a análise.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estado civil" htmlFor="lead-docs-estado-civil">
            <select
              id="lead-docs-estado-civil"
              value={form.estadoCivil}
              onChange={(e) =>
                setForm({ ...form, estadoCivil: e.target.value as EstadoCivil | '' })
              }
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="">Selecionar…</option>
              {ESTADOS_CIVIS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="N.º de dependentes" htmlFor="lead-docs-num-dep">
            <input
              id="lead-docs-num-dep"
              type="number"
              min={0}
              value={form.numDependentes}
              onChange={(e) => setForm({ ...form, numDependentes: e.target.value })}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="0"
            />
          </Field>

          <Field label="A quantos anos trabalha no emprego atual?" htmlFor="lead-docs-anos">
            <input
              id="lead-docs-anos"
              type="text"
              value={form.anosEmprego}
              onChange={(e) => setForm({ ...form, anosEmprego: e.target.value })}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="Ex.: 2 ou menos de 1"
            />
          </Field>

          <Field label="Vínculo laboral" htmlFor="lead-docs-vinculo">
            <select
              id="lead-docs-vinculo"
              value={form.vinculoLaboral}
              onChange={(e) =>
                setForm({
                  ...form,
                  vinculoLaboral: e.target.value as VinculoLaboral | '',
                  // Limpar disponibilidade fiador se mudámos para Efectivo.
                  disponibilidadeFiador:
                    e.target.value === 'Contrato Efetivo'
                      ? ''
                      : form.disponibilidadeFiador,
                })
              }
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="">Selecionar…</option>
              {VINCULOS_LABORAIS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          {showFiadorQuestion ? (
            <Field
              label="Disponibilidade para apresentar fiador"
              htmlFor="lead-docs-fiador"
              hint="Em algumas situações o banco pode exigir um fiador para aprovar o crédito."
            >
              <select
                id="lead-docs-fiador"
                value={form.disponibilidadeFiador}
                onChange={(e) =>
                  setForm({
                    ...form,
                    disponibilidadeFiador: e.target.value as DisponibilidadeFiador | '',
                  })
                }
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                <option value="">Selecionar…</option>
                {DISPONIBILIDADES_FIADOR.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm text-zinc-900">
          <input
            type="checkbox"
            checked={form.financiamento100}
            onChange={(e) =>
              setForm({ ...form, financiamento100: e.target.checked })
            }
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
          />
          <span>
            Solicito financiamento a <strong>100%</strong> para jovens com menos de 35 anos.
          </span>
        </label>
      </section>

      {form.vinculoLaboral ? (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Documentos obrigatórios</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Aceitamos PDF, JPG e PNG até 15 MB por ficheiro. Os documentos ficam guardados
                no teu dispositivo até clicares em «Enviar».
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {attachedCount} de {totalRequired} anexados
            </span>
          </header>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <ul className="space-y-3">
            {requiredFields.map((field, idx) => (
              <li key={field}>
                <DocumentBlock
                  index={idx + 1}
                  fieldName={field}
                  label={DOC_STANDARD_NAMES[field]}
                  description={DOC_DESCRIPTIONS[field]}
                  file={files[field] ?? null}
                  onPick={(f) => onPick(field, f)}
                  onRemove={() => onRemove(field)}
                  uploading={submitting}
                  error={fileErrors[field] ?? null}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {form.vinculoLaboral ? (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <header>
            <h2 className="text-lg font-semibold text-zinc-900">
              Mensagem para sua gestora
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Aproveita para falar um pouco mais sobre você e adicionar alguma informação que achar necessária.
            </p>
          </header>
          <textarea
            value={form.mensagem}
            onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
            rows={3}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="Alguma informação adicional…"
          />

          {missingForCheckboxes.length ? (
            <details
              open
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3"
            >
              <summary className="cursor-pointer text-sm font-medium text-zinc-800">
                Não tens algum destes documentos?
              </summary>
              <div className="mt-3 space-y-2">
                {missingForCheckboxes.map((m) => (
                  <label
                    key={m.field}
                    className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={form.semDocsLabels.includes(m.label)}
                      onChange={(e) => onToggleSemDocs(m.label, e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </details>
          ) : null}

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            <span>
              Autorizo o tratamento dos meus dados pessoais e dos documentos enviados para
              análise do meu pedido de crédito habitação pelo parceiro, em conformidade com o
              RGPD. Posso retirar este consentimento a qualquer momento.
            </span>
          </label>

          {submitError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting
              ? 'A enviar…'
              : `Enviar ${attachedCount} ${attachedCount === 1 ? 'documento' : 'documentos'} ao parceiro`}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function SentPanel(props: {
  partner: PartnerInfo;
  mode: LeadDocumentSubmissionMode;
  onStartNewMode: (mode: LeadDocumentSubmissionMode) => void;
}) {
  const { partner, mode, onStartNewMode } = props;
  const wa = digitsOnly(partner.whatsapp);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-200 text-2xl">
          ✓
        </div>
        <h2 className="mt-3 text-lg font-semibold text-emerald-900">
          Documentos enviados!
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          Os teus documentos foram enviados para o parceiro {partner.name}. Esperamos
          resposta em até <strong>4 dias úteis</strong>.
        </p>
      </section>

      <PartnerCard partner={partner} />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-zinc-900">
          Precisas de enviar mais alguma coisa?
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          Podes enviar documentos do(a) cônjuge ou complementar este envio com documentos em
          falta — sem precisar de confirmar o WhatsApp outra vez.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onStartNewMode('extra')}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Enviar mais documentos
          </button>
          <button
            type="button"
            onClick={() => onStartNewMode('spouse')}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Enviar documentos do cônjuge
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          (Anteriormente enviámos: {labelForMode(mode)}.)
        </p>
      </section>

      {wa ? (
        <p className="text-center text-sm text-zinc-700">
          Em caso de dúvida, fala diretamente com o teu parceiro pelo{' '}
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald-700 hover:underline"
          >
            WhatsApp
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}

function Field(props: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={props.htmlFor}
        className="block text-xs font-medium uppercase tracking-wide text-zinc-700"
      >
        {props.label}
      </label>
      <div className="mt-1">{props.children}</div>
      {props.hint ? <p className="mt-1 text-xs text-zinc-500">{props.hint}</p> : null}
    </div>
  );
}
