'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  getUserFacingApiError,
  type AdminChatbotSlug,
  type ChatbotCrmBoard,
  type ChatbotCrmColumn,
  type ChatbotCrmLead,
  type RafacallCrmDocument,
} from '@/lib/api';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { ChatbotAvatar } from '@/components/admin/ChatbotAvatar';
import { CrmLeadNameField } from '@/components/admin/CrmLeadNameField';
import { CrmChannelChatModal } from '@/components/admin/CrmChannelChatModal';
import {
  HORIZONTAL_CAROUSEL_TRACK,
  HorizontalSnapCarousel,
} from '@/components/ui/horizontal-snap-carousel';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';
import {
  formatCrmEuroAmount,
  formatCrmPropertyTypologyLabels,
  normalizeCrmPropertyTypologies,
  RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS,
  RAFA_CALL_CRM_PROPERTY_TYPOLOGY_ORDER,
  type RafacallCrmColumnTone,
  type RafacallCrmPropertyTypology,
} from '@/lib/rafacall-crm';
import { toast } from '@/lib/toast';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import {
  CrmLeadNotesTooltip,
  CrmUnansweredBadge,
  SparklesIcon,
  SummarySpinner,
  crmActionIconBtnClass,
  crmActionIconClass,
  crmActionTextBtnClass,
  crmActionBarClass,
} from '@/components/admin/CrmLeadNotesTooltip';

const CRM_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;

type Props = {
  slug: Exclude<AdminChatbotSlug, 'joana'>;
  botName: string;
  onClientCount?: (slug: AdminChatbotSlug, count: number) => void;
};

type BoardColumn = ChatbotCrmColumn & { items: ChatbotCrmLead[] };

const COLUMN_MAX_WIDTH = 'max-w-[17.5rem] max-md:max-w-none';

const TONE_BY_KEY: Record<string, RafacallCrmColumnTone> = {
  slate: {
    column: 'bg-slate-500/[0.06]',
    header: 'bg-slate-500/10',
    border: 'border-slate-200/80',
    badge: 'bg-slate-500/15 text-slate-700',
    dot: 'bg-slate-400',
    dragRing: 'ring-slate-300/40',
  },
  sky: {
    column: 'bg-sky-500/[0.07]',
    header: 'bg-sky-500/12',
    border: 'border-sky-200/80',
    badge: 'bg-sky-500/15 text-sky-800',
    dot: 'bg-sky-400',
    dragRing: 'ring-sky-300/50',
  },
  emerald: {
    column: 'bg-emerald-500/[0.07]',
    header: 'bg-emerald-500/12',
    border: 'border-emerald-200/80',
    badge: 'bg-emerald-500/15 text-emerald-800',
    dot: 'bg-emerald-400',
    dragRing: 'ring-emerald-300/50',
  },
  violet: {
    column: 'bg-violet-500/[0.07]',
    header: 'bg-violet-500/12',
    border: 'border-violet-200/80',
    badge: 'bg-violet-500/15 text-violet-800',
    dot: 'bg-violet-400',
    dragRing: 'ring-violet-300/50',
  },
  amber: {
    column: 'bg-amber-500/[0.08]',
    header: 'bg-amber-500/12',
    border: 'border-amber-200/80',
    badge: 'bg-amber-500/15 text-amber-900',
    dot: 'bg-amber-400',
    dragRing: 'ring-amber-300/50',
  },
  orange: {
    column: 'bg-orange-500/[0.08]',
    header: 'bg-orange-500/12',
    border: 'border-orange-200/80',
    badge: 'bg-orange-500/15 text-orange-900',
    dot: 'bg-orange-400',
    dragRing: 'ring-orange-300/50',
  },
};

function columnTone(tone: string | null | undefined): RafacallCrmColumnTone {
  const key = (tone || 'slate').trim().toLowerCase();
  return TONE_BY_KEY[key] ?? TONE_BY_KEY.slate!;
}

function formatWhatsappDigits(digits: string | null | undefined): string {
  const d = String(digits ?? '').replace(/\D/g, '');
  if (!d) return '—';
  if (d.length === 12 && d.startsWith('351')) {
    const r = d.slice(3);
    return `+351 ${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`;
  }
  if (d.length === 13 && d.startsWith('55')) {
    const r = d.slice(2);
    return `+55 (${r.slice(0, 2)}) ${r.slice(2, 7)}-${r.slice(7)}`;
  }
  if (d.length === 9 && /^9\d{8}$/.test(d)) {
    return `+351 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return `+${d}`;
}

function getLeadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function formatUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatInstagramBadge(value: string | null): string | null {
  if (value === null) return null;
  if (value === '') return 'Sem Instagram';
  return value.startsWith('@') ? value : `@${value}`;
}

function GenericLeadBadgeRow({
  lead,
  slug,
  className = 'flex flex-wrap gap-1.5',
}: {
  lead: ChatbotCrmLead;
  slug: Exclude<AdminChatbotSlug, 'joana'>;
  className?: string;
}) {
  const isGabi = slug === 'gabi';
  const isBruna = slug === 'bruna';
  const isOutros = slug === 'outros';
  const name = leadDisplayName(lead, isGabi);
  const instagram = isGabi ? formatInstagramBadge(lead.instagramHandle) : null;
  const companyBadge =
    isGabi && lead.companyName?.trim() && name !== lead.companyName.trim()
      ? lead.companyName.trim()
      : null;
  const contactBadge =
    isGabi && lead.guestName?.trim() && name !== lead.guestName.trim()
      ? lead.guestName.trim()
      : null;
  const campaignObjective = isGabi ? lead.campaignObjective?.trim() || null : null;
  const houseValue =
    isBruna && lead.desiredHouseValue != null
      ? formatCrmEuroAmount(lead.desiredHouseValue)
      : null;
  const preferredCities = isBruna ? lead.preferredCities?.trim() || null : null;
  const propertyTypologyLabels = isBruna
    ? formatCrmPropertyTypologyLabels(lead.propertyTypology)
    : [];
  const subject = isOutros ? lead.subjectSummary?.trim() || 'Assunto por explicar' : null;
  const documentCount = lead.documents?.length ?? 0;
  const chips = [
    companyBadge,
    contactBadge,
    instagram,
    isGabi && lead.instagramHandle === null ? 'Instagram por preencher' : null,
    campaignObjective,
    isGabi && !campaignObjective && lead.instagramHandle !== null ? 'Objetivo por preencher' : null,
    houseValue,
    isBruna && lead.desiredHouseValue == null ? 'Valor da casa por preencher' : null,
    preferredCities,
    isBruna && !preferredCities ? 'Cidades por preencher' : null,
    ...propertyTypologyLabels,
    isBruna && propertyTypologyLabels.length === 0 ? 'Tipologia por preencher' : null,
    subject,
  ].filter((item): item is string => Boolean(item));

  if (chips.length === 0 && documentCount === 0) return null;
  return (
    <div className={className}>
      {documentCount > 0 ? (
        <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-[10px] font-semibold text-foreground">
          {documentCount} ficheiro{documentCount === 1 ? '' : 's'}
        </span>
      ) : null}
      {chips.map((label) => (
        <span
          key={label}
          className="inline-flex max-w-full items-center rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function leadDisplayName(lead: ChatbotCrmLead, isGabi: boolean): string {
  if (isGabi && lead.companyName?.trim()) return lead.companyName.trim();
  const guest = lead.guestName?.trim();
  if (guest) return guest;
  const handle = lead.instagramHandle?.trim();
  if (handle) return handle.startsWith('@') ? handle : `@${handle}`;
  const wa = (lead.whatsapp || '').replace(/\D/g, '');
  if (wa.length >= 3) return `Lead ${wa.slice(-3)}`;
  const ig = (lead.instagramUserId || '').trim();
  if (ig.length >= 4) return `Lead IG ${ig.slice(-4)}`;
  return 'Lead';
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

function BotOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 8V5" />
      <circle cx="12" cy="4" r="1" />
      <rect x="5" y="8" width="14" height="11" rx="2" />
      <path d="M9 13h.01M15 13h.01" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 8V5" />
      <circle cx="12" cy="4" r="1" />
      <rect x="5" y="8" width="14" height="11" rx="2" />
      <path d="M9 13h.01M15 13h.01" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function formatCrmDocumentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1).replace('.', ',')} MB`;
}

function formatCrmDocumentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === 'application/pdf' ||
    file.type === 'application/x-pdf' ||
    name.endsWith('.pdf')
  );
}

function isCrmImageFileName(fileName: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(fileName);
}

function GenericCrmDocumentsSection({
  slug,
  leadId,
  documents,
  disabled,
  onDocumentsChange,
}: {
  slug: Exclude<AdminChatbotSlug, 'joana'>;
  leadId: string;
  documents: RafacallCrmDocument[];
  disabled?: boolean;
  onDocumentsChange: (documents: RafacallCrmDocument[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const isBusy = Boolean(disabled || busy);
  const count = documents.length;

  const handleFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;

    setBusy(true);
    let next = documents;
    let attached = 0;
    try {
      for (const file of files) {
        if (!isPdfFile(file)) {
          toast.error(`${file.name} não é um PDF.`);
          continue;
        }
        if (file.size === 0) {
          toast.error(`${file.name} está vazio.`);
          continue;
        }
        if (file.size > CRM_DOCUMENT_MAX_BYTES) {
          toast.error(`${file.name} passa de 15 MB.`);
          continue;
        }
        try {
          const created = await api.admin.chatbots.crm.uploadDocument(
            slug,
            leadId,
            file,
          );
          next = [created, ...next.filter((document) => document.id !== created.id)];
          onDocumentsChange(next);
          attached += 1;
        } catch (err) {
          toast.error(
            getUserFacingApiError(err, { context: `Ao anexar ${file.name}` }),
          );
        }
      }
      if (attached === 1) toast.success('PDF anexado.');
      if (attached > 1) toast.success(`${attached} PDFs anexados.`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (pendingDeleteId !== documentId) {
      setPendingDeleteId(documentId);
      return;
    }
    setBusy(true);
    try {
      await api.admin.chatbots.crm.deleteDocument(slug, leadId, documentId);
      onDocumentsChange(documents.filter((document) => document.id !== documentId));
      setPendingDeleteId(null);
      toast.success('PDF removido.');
    } catch (err) {
      toast.error(getUserFacingApiError(err, { context: 'Ao remover o PDF' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={isBusy}
        onClick={() => {
          setOpen((prev) => !prev);
          setPendingDeleteId(null);
        }}
        className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          count > 0
            ? 'border-border bg-page text-foreground hover:border-brand-primary/30'
            : 'border-dashed border-border bg-card text-muted hover:border-brand-primary/40 hover:bg-page'
        }`}
        aria-expanded={open}
        aria-label="Documentos do cliente"
      >
        <FileIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Documentos
          </p>
          <p
            className={`mt-0.5 text-sm font-medium leading-snug ${
              count > 0 ? 'text-foreground' : 'italic text-muted'
            }`}
          >
            {count > 0
              ? `${count} ficheiro${count === 1 ? '' : 's'}`
              : 'Nenhum ficheiro — clica para anexar'}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted">
          {open ? 'Fechar' : 'Editar'}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 rounded-xl border border-border bg-page/60 px-3.5 py-3">
          {documents.length > 0 ? (
            <ul className="space-y-2">
              {documents.map((document) => {
                const href = resolveUploadsUrl(document.fileUrl);
                const isImage = isCrmImageFileName(document.fileName);
                return (
                  <li
                    key={document.id}
                    className="rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <div className="flex items-start gap-3">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={href}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-page text-brand-primary"
                          aria-hidden
                        >
                          <FileIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {document.fileName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {[
                            formatCrmDocumentSize(document.sizeBytes),
                            formatCrmDocumentDate(document.createdAt),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-page"
                        >
                          Abrir
                        </a>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(document.id)}
                          className="cursor-pointer rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {pendingDeleteId === document.id ? 'Confirmar' : 'Apagar'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted">Ainda não há ficheiros neste cliente.</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            aria-label="Anexar PDF"
            className="sr-only"
            tabIndex={-1}
            disabled={isBusy}
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-page disabled:opacity-50"
          >
            {busy ? 'A enviar…' : '+ Anexar PDF'}
          </button>
          <p className="text-[11px] leading-relaxed text-muted">
            Upload manual: só PDF, até 15 MB. Imagens e ficheiros enviados pelo
            cliente no WhatsApp dos chatbots também aparecem aqui.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function LeadAvatar({
  name,
  imageUrl,
  size = 'sm',
}: {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'lg';
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = !imgFailed && imageUrl ? resolveUploadsUrl(imageUrl) : '';
  const sizeClass = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-6 w-6 text-[10px]';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border border-border object-cover bg-page`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-brand-primary font-semibold text-white shadow-sm`}
      aria-hidden
    >
      {getLeadInitials(name)}
    </div>
  );
}

function GenericLeadCard({
  lead,
  slug,
  botName,
  isDragging,
  isSaving,
  isSummarizing,
  onOpenDetails,
  onRequestDelete,
  onGenerateSummary,
  onToggleBot,
  onOpenChat,
  activeChannel,
  onDragStart,
  onDragEnd,
}: {
  lead: ChatbotCrmLead;
  slug: Exclude<AdminChatbotSlug, 'joana'>;
  botName: string;
  isDragging: boolean;
  isSaving: boolean;
  isSummarizing: boolean;
  onOpenDetails: () => void;
  onRequestDelete: () => void;
  onGenerateSummary: () => void;
  onToggleBot: () => void;
  onOpenChat: (channel: 'WHATSAPP' | 'INSTAGRAM') => void;
  activeChannel?: 'WHATSAPP' | 'INSTAGRAM' | null;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const isGabi = slug === 'gabi';
  const isBruna = slug === 'bruna';
  const isOutros = slug === 'outros';
  const name = leadDisplayName(lead, isGabi);
  const wa = formatWhatsappDigits(lead.whatsapp);
  const updatedAtLabel = formatUpdatedAt(lead.updatedAt);
  const instagram = isGabi ? formatInstagramBadge(lead.instagramHandle) : null;
  const companyBadge =
    isGabi && lead.companyName?.trim() && name !== lead.companyName.trim()
      ? lead.companyName.trim()
      : null;
  const contactBadge =
    isGabi && lead.guestName?.trim() && name !== lead.guestName.trim()
      ? lead.guestName.trim()
      : null;
  const campaignObjective = isGabi
    ? lead.campaignObjective?.trim() || null
    : null;
  const houseValue =
    isBruna && lead.desiredHouseValue != null
      ? formatCrmEuroAmount(lead.desiredHouseValue)
      : null;
  const preferredCities = isBruna
    ? lead.preferredCities?.trim() || null
    : null;
  const propertyTypologyLabels = isBruna
    ? formatCrmPropertyTypologyLabels(lead.propertyTypology)
    : [];
  const subject = isOutros
    ? lead.subjectSummary?.trim() || 'Assunto por explicar'
    : null;
  const comments = lead.crmComments?.trim() || null;
  const documentCount = lead.documents?.length ?? 0;
  const showObjectivePending =
    isGabi && !campaignObjective && lead.instagramHandle !== null;
  const showHouseValuePending = isBruna && lead.desiredHouseValue == null;
  const showCitiesPending = isBruna && !preferredCities;
  const showTypologyPending = isBruna && propertyTypologyLabels.length === 0;
  const hasBadges = Boolean(
    companyBadge ||
      contactBadge ||
      instagram ||
      (isGabi && lead.instagramHandle === null) ||
      campaignObjective ||
      showObjectivePending ||
      houseValue ||
      showHouseValuePending ||
      preferredCities ||
      showCitiesPending ||
      propertyTypologyLabels.length > 0 ||
      showTypologyPending ||
      subject,
  );

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', lead.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`relative cursor-grab overflow-hidden rounded-lg border border-border bg-page p-3 shadow-sm transition-opacity active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      } ${isSaving ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <LeadAvatar name={name} imageUrl={lead.crmProfileImageUrl} />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {name}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-muted/60">{wa}</p>
        {documentCount > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <p className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-foreground">
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
              <span>
                {documentCount} ficheiro{documentCount === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        ) : null}
      </div>

      {hasBadges ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {companyBadge ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-violet-200/90 bg-violet-50/90 px-2 py-1 text-[10px] font-medium text-violet-900">
              {companyBadge}
            </span>
          ) : null}
          {contactBadge ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground">
              {contactBadge}
            </span>
          ) : null}
          {instagram ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-sky-200/90 bg-sky-50/90 px-2 py-1 text-[10px] font-medium text-sky-900">
              {instagram}
            </span>
          ) : isGabi && lead.instagramHandle === null ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1 text-[10px] font-medium text-amber-950">
              Instagram por preencher
            </span>
          ) : null}
          {campaignObjective ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-emerald-200/90 bg-emerald-50/90 px-2 py-1 text-[10px] font-medium text-emerald-900">
              {campaignObjective}
            </span>
          ) : showObjectivePending ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1 text-[10px] font-medium text-amber-950">
              Objetivo por preencher
            </span>
          ) : null}
          {houseValue ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-emerald-200/90 bg-emerald-50/90 px-2 py-1 text-[10px] font-semibold text-emerald-900">
              {houseValue}
            </span>
          ) : showHouseValuePending ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1 text-[10px] font-medium text-amber-950">
              Valor da casa por preencher
            </span>
          ) : null}
          {preferredCities ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-sky-200/90 bg-sky-50/90 px-2 py-1 text-[10px] font-medium text-sky-900">
              {preferredCities}
            </span>
          ) : showCitiesPending ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1 text-[10px] font-medium text-amber-950">
              Cidades por preencher
            </span>
          ) : null}
          {propertyTypologyLabels.length > 0 ? (
            propertyTypologyLabels.map((label) => (
              <span
                key={label}
                className="inline-flex max-w-full items-center rounded-md border border-violet-200/90 bg-violet-50/90 px-2 py-1 text-[10px] font-medium text-violet-900"
              >
                {label}
              </span>
            ))
          ) : showTypologyPending ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1 text-[10px] font-medium text-amber-950">
              Tipologia por preencher
            </span>
          ) : null}
          {subject ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1 text-[10px] font-medium text-amber-950">
              {subject}
            </span>
          ) : null}
        </div>
      ) : null}

      {updatedAtLabel ? (
        <p className="mt-2 text-[10px] leading-tight text-muted">
          Atualizado {updatedAtLabel}
        </p>
      ) : null}

      <div className={crmActionBarClass}>
        <CrmLeadNotesTooltip
          comments={comments}
          summary={lead.crmRequestSummary}
          onGenerateSummary={onGenerateSummary}
          isSummarizing={isSummarizing}
          disabled={isSaving}
        />
        {lead.whatsapp ? (
          <button
            type="button"
            draggable={false}
            className={`${crmActionIconBtnClass} text-[#25D366] hover:border-[#25D366]/40 hover:bg-[#25D366]/10 ${
              activeChannel === 'WHATSAPP' ? 'border-[#25D366]' : 'border-border'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenChat('WHATSAPP');
            }}
            aria-pressed={activeChannel === 'WHATSAPP'}
            aria-label={
              (lead.unansweredWhatsapp ?? 0) > 0
                ? `Conversar no WhatsApp com ${name}, ${lead.unansweredWhatsapp} sem resposta`
                : `Conversar no WhatsApp com ${name}`
            }
            title="WhatsApp"
          >
            <WhatsappIcon className={crmActionIconClass} />
            <CrmUnansweredBadge count={lead.unansweredWhatsapp ?? 0} />
          </button>
        ) : null}
        {lead.instagramUserId ? (
          <button
            type="button"
            draggable={false}
            className={`${crmActionIconBtnClass} text-[#E1306C] hover:border-[#E1306C]/40 hover:bg-[#E1306C]/10 ${
              activeChannel === 'INSTAGRAM' ? 'border-[#E1306C]' : 'border-border'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenChat('INSTAGRAM');
            }}
            aria-pressed={activeChannel === 'INSTAGRAM'}
            aria-label={
              (lead.unansweredInstagram ?? 0) > 0
                ? `Conversar no Instagram com ${lead.instagramHandle || name}, ${lead.unansweredInstagram} sem resposta`
                : lead.instagramHandle
                  ? `Conversar no Instagram com ${lead.instagramHandle}`
                  : `Conversar no Instagram com ${name}`
            }
            title={lead.instagramHandle || 'Instagram'}
          >
            <InstagramIcon className={crmActionIconClass} />
            <CrmUnansweredBadge count={lead.unansweredInstagram ?? 0} />
          </button>
        ) : lead.instagramHandle && lead.instagramHandle.trim() !== '' ? (
          <a
            href={`https://instagram.com/${lead.instagramHandle.replace(/^@+/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            draggable={false}
            className={`${crmActionIconBtnClass} border-border text-[#E1306C] hover:border-[#E1306C]/40 hover:bg-[#E1306C]/10`}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Abrir Instagram ${lead.instagramHandle}`}
            title={lead.instagramHandle}
          >
            <InstagramIcon className={crmActionIconClass} />
          </a>
        ) : null}
        <button
          type="button"
          draggable={false}
          disabled={isSaving}
          aria-pressed={lead.botEnabled}
          title={
            lead.botEnabled
              ? `Chatbot ${botName} ligado. Clique para desligar.`
              : `Chatbot ${botName} desligado. Clique para ligar.`
          }
          aria-label={
            lead.botEnabled
              ? `Desligar chatbot ${botName}`
              : `Ligar chatbot ${botName}`
          }
          onClick={(event) => {
            event.stopPropagation();
            onToggleBot();
          }}
          className={`${crmActionIconBtnClass} ${
            lead.botEnabled
              ? 'border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200'
              : 'border-rose-300 bg-rose-100 text-rose-950 hover:bg-rose-200'
          }`}
        >
          {lead.botEnabled ? (
            <BotIcon className={crmActionIconClass} />
          ) : (
            <BotOffIcon className={crmActionIconClass} />
          )}
        </button>
        <button
          type="button"
          draggable={false}
          onClick={onOpenDetails}
          className={crmActionTextBtnClass}
        >
          Editar
        </button>
        <button
          type="button"
          draggable={false}
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete();
          }}
          className={`${crmActionIconBtnClass} ml-auto border-border text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-200`}
          aria-label={`Excluir ${name} do CRM`}
        >
          <TrashIcon className={crmActionIconClass} />
        </button>
      </div>
    </article>
  );
}

function GenericKanbanColumn({
  column,
  slug,
  botName,
  draggingLeadId,
  savingLeadId,
  summarizingLeadId,
  onDropLead,
  onOpenDetails,
  onRequestDelete,
  onGenerateSummary,
  onToggleBot,
  onOpenChat,
  activeChatId,
  activeChatChannel,
  onDragStart,
  onDragEnd,
  onRename,
  className = '',
}: {
  column: BoardColumn;
  slug: Exclude<AdminChatbotSlug, 'joana'>;
  botName: string;
  draggingLeadId: string | null;
  savingLeadId: string | null;
  summarizingLeadId: string | null;
  onDropLead: (leadId: string, columnId: string) => void;
  onOpenDetails: (lead: ChatbotCrmLead) => void;
  onRequestDelete: (lead: ChatbotCrmLead) => void;
  onGenerateSummary: (lead: ChatbotCrmLead) => void;
  onToggleBot: (lead: ChatbotCrmLead) => void;
  onOpenChat: (lead: ChatbotCrmLead, channel: 'WHATSAPP' | 'INSTAGRAM') => void;
  activeChatId?: string | null;
  activeChatChannel?: 'WHATSAPP' | 'INSTAGRAM' | null;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onRename: (column: BoardColumn, label: string) => void;
  className?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const tone = columnTone(column.tone);

  return (
    <section
      className={`flex h-full min-h-[240px] w-full flex-col rounded-xl border shadow-sm transition-shadow ${COLUMN_MAX_WIDTH} ${tone.column} ${tone.border} ${
        isDragOver ? `ring-2 ${tone.dragRing}` : ''
      } ${className}`.trim()}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const leadId = event.dataTransfer.getData('text/plain');
        if (leadId) onDropLead(leadId, column.id);
      }}
      aria-label={`Coluna ${column.label}`}
    >
      <header className={`border-b px-3 py-2.5 ${tone.header} ${tone.border}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
            <input
              defaultValue={column.label}
              onBlur={(event) => onRename(column, event.target.value)}
              className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground hover:border-border focus:border-brand-primary focus:outline-none"
              aria-label={`Nome da coluna ${column.label}`}
            />
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
            {column.items.length}
          </span>
        </div>
        {column.pausesBot ? (
          <p className="mt-1 text-[10px] text-muted">Desliga chatbot ao entrar</p>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {column.items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">Arraste clientes para aqui</p>
        ) : (
          [...column.items]
            .sort((left, right) => {
              const leftMs = Date.parse(left.updatedAt) || 0;
              const rightMs = Date.parse(right.updatedAt) || 0;
              return rightMs - leftMs;
            })
            .map((lead) => (
            <GenericLeadCard
              key={lead.id}
              lead={lead}
              slug={slug}
              botName={botName}
              isDragging={draggingLeadId === lead.id}
              isSaving={savingLeadId === lead.id}
              isSummarizing={summarizingLeadId === lead.id}
              onOpenDetails={() => onOpenDetails(lead)}
              onRequestDelete={() => onRequestDelete(lead)}
              onGenerateSummary={() => onGenerateSummary(lead)}
              onToggleBot={() => onToggleBot(lead)}
              onOpenChat={(channel) => onOpenChat(lead, channel)}
              activeChannel={activeChatId === lead.id ? activeChatChannel : null}
              onDragStart={() => onDragStart(lead.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function GenericChatbotCrmView({ slug, botName, onClientCount }: Props) {
  const [board, setBoard] = useState<ChatbotCrmBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<ChatbotCrmLead | null>(null);
  const [chatLead, setChatLead] = useState<{
    id: string;
    channel: 'WHATSAPP' | 'INSTAGRAM';
  } | null>(null);
  const [deleteLead, setDeleteLead] = useState<ChatbotCrmLead | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newWhatsappError, setNewWhatsappError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [columnLabelDraft, setColumnLabelDraft] = useState('');
  const [columnSaving, setColumnSaving] = useState(false);
  const [companyDraft, setCompanyDraft] = useState('');
  const [instagramDraft, setInstagramDraft] = useState('');
  const [campaignObjectiveDraft, setCampaignObjectiveDraft] = useState('');
  const [houseValueDraft, setHouseValueDraft] = useState('');
  const [citiesDraft, setCitiesDraft] = useState('');
  const [typologyDraft, setTypologyDraft] = useState<
    RafacallCrmPropertyTypology[]
  >([]);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [commentsDraft, setCommentsDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const togglingLeadIds = useRef(new Set<string>());
  const [summarizingLeadId, setSummarizingLeadId] = useState<string | null>(null);
  const isGabi = slug === 'gabi';
  const isBruna = slug === 'bruna';
  const isOutros = slug === 'outros';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await api.admin.chatbots.crm.board(slug);
      setBoard(next);
      setSelected((prev) => {
        if (!prev) return null;
        for (const column of next.columns) {
          const found = column.items.find((item) => item.id === prev.id);
          if (found) return found;
        }
        return null;
      });
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao carregar o CRM' }));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = useMemo(
    () => board?.columns.reduce((sum, column) => sum + column.items.length, 0) ?? 0,
    [board],
  );

  useEffect(() => {
    if (loading || error || !board) return;
    onClientCount?.(slug, total);
  }, [board, error, loading, onClientCount, slug, total]);

  function openLead(lead: ChatbotCrmLead) {
    setSelected(lead);
    setCompanyDraft(lead.companyName ?? '');
    setInstagramDraft(lead.instagramHandle === null ? '' : lead.instagramHandle);
    setCampaignObjectiveDraft(lead.campaignObjective ?? '');
    setHouseValueDraft(
      lead.desiredHouseValue != null ? String(lead.desiredHouseValue) : '',
    );
    setCitiesDraft(lead.preferredCities ?? '');
    setTypologyDraft(normalizeCrmPropertyTypologies(lead.propertyTypology));
    setSubjectDraft(lead.subjectSummary ?? '');
    setCommentsDraft(lead.crmComments ?? '');
    setSummaryDraft(lead.crmRequestSummary ?? '');
    setNameDraft(lead.companyName?.trim() ? '' : leadDisplayName(lead, false));
  }

  function applyLead(updated: ChatbotCrmLead) {
    setBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((column) => ({
          ...column,
          items: column.items.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        })),
      };
    });
    setSelected((current) => (current?.id === updated.id ? updated : current));
  }

  async function generateSummary(lead: ChatbotCrmLead) {
    if (summarizingLeadId) return;
    setSummarizingLeadId(lead.id);
    setError('');
    try {
      const updated = await api.admin.chatbots.crm.generateSummary(slug, lead.id);
      applyLead(updated);
      if (selected?.id === lead.id) {
        setSummaryDraft(updated.crmRequestSummary ?? '');
      }
      setSuccess('Resumo gerado.');
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao gerar o resumo' }));
    } finally {
      setSummarizingLeadId(null);
    }
  }

  async function createLead() {
    const name = newName.trim();
    if (name.length < 2) {
      setError('Indica o nome do cliente.');
      return;
    }
    const digits = newWhatsapp.replace(/\D/g, '');
    if (digits.length < 8) {
      setNewWhatsappError('WhatsApp inválido.');
      return;
    }
    setNewWhatsappError('');
    setSaving(true);
    setError('');
    try {
      await api.admin.chatbots.crm.createLead(slug, {
        name,
        whatsapp: digits,
      });
      setNewOpen(false);
      setNewName('');
      setNewWhatsapp('');
      setSuccess('Cliente criado.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao criar cliente' }));
    } finally {
      setSaving(false);
    }
  }

  async function createColumn() {
    const label = columnLabelDraft.trim();
    if (label.length < 2) return;
    setColumnSaving(true);
    setError('');
    try {
      await api.admin.chatbots.crm.createColumn(slug, { label });
      setColumnLabelDraft('');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao criar coluna' }));
    } finally {
      setColumnSaving(false);
    }
  }

  async function renameColumn(column: BoardColumn, label: string) {
    const next = label.trim();
    if (next.length < 2 || next === column.label) return;
    setColumnSaving(true);
    setError('');
    try {
      await api.admin.chatbots.crm.updateColumn(slug, column.id, { label: next });
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao renomear coluna' }));
    } finally {
      setColumnSaving(false);
    }
  }

  async function dropLead(leadId: string, columnId: string) {
    const current = board?.columns
      .flatMap((column) => column.items)
      .find((lead) => lead.id === leadId);
    if (!current || current.columnId === columnId) return;

    setSavingLeadId(leadId);
    setError('');
    try {
      await api.admin.chatbots.crm.updateLead(slug, leadId, { columnId });
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao mover lead' }));
    } finally {
      setSavingLeadId(null);
      setDraggingLeadId(null);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      let desiredHouseValue: number | null | undefined;
      if (isBruna) {
        const raw = houseValueDraft.trim().replace(/\s+/g, '');
        if (!raw) {
          desiredHouseValue = null;
        } else {
          const parsed = Number(raw.replace(/[^\d]/g, ''));
          if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5_000_000) {
            setError('Valor da casa pretendida inválido.');
            setSaving(false);
            return;
          }
          desiredHouseValue = parsed;
        }
      }

      const titleEditsCompany = isGabi && Boolean(selected.companyName?.trim());
      const titleDraft = titleEditsCompany ? companyDraft : nameDraft;
      const originalTitle = titleEditsCompany
        ? selected.companyName?.trim() || ''
        : leadDisplayName(selected, false);
      const titleChanged = titleDraft.trim() !== originalTitle;
      if (!titleEditsCompany && titleChanged && titleDraft.trim().length < 2) {
        setError('Indica o nome do cliente.');
        setSaving(false);
        return;
      }

      const updated = await api.admin.chatbots.crm.updateLead(slug, selected.id, {
        columnId: selected.columnId,
        crmComments: commentsDraft.trim() || null,
        crmRequestSummary: summaryDraft.trim() || null,
        ...(isGabi
          ? {
              companyName: companyDraft.trim() || null,
              instagramHandle: instagramDraft.trim(),
              campaignObjective: campaignObjectiveDraft.trim() || null,
            }
          : {}),
        ...(isBruna
          ? {
              desiredHouseValue: desiredHouseValue ?? null,
              preferredCities: citiesDraft.trim() || null,
              propertyTypology: typologyDraft,
            }
          : {}),
        ...(isOutros
          ? { subjectSummary: subjectDraft.trim() || null }
          : {}),
        ...(!titleEditsCompany && titleChanged
          ? { guestName: titleDraft.trim() }
          : {}),
      });
      setSelected(updated);
      setCompanyDraft(updated.companyName ?? '');
      setInstagramDraft(
        updated.instagramHandle === null ? '' : updated.instagramHandle,
      );
      setCampaignObjectiveDraft(updated.campaignObjective ?? '');
      setHouseValueDraft(
        updated.desiredHouseValue != null
          ? String(updated.desiredHouseValue)
          : '',
      );
      setCitiesDraft(updated.preferredCities ?? '');
      setTypologyDraft(normalizeCrmPropertyTypologies(updated.propertyTypology));
      setSubjectDraft(updated.subjectSummary ?? '');
      setCommentsDraft(updated.crmComments ?? '');
      setSummaryDraft(updated.crmRequestSummary ?? '');
      setNameDraft(
        updated.companyName?.trim() ? '' : leadDisplayName(updated, false),
      );
      setSuccess('Alterações guardadas.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao guardar lead' }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleLeadBot(lead: ChatbotCrmLead, botEnabled = !lead.botEnabled) {
    if (lead.botEnabled === botEnabled || togglingLeadIds.current.has(lead.id)) return;
    togglingLeadIds.current.add(lead.id);
    const previous = lead;
    applyLead({ ...lead, botEnabled });
    setSavingLeadId(lead.id);
    setError('');
    try {
      const updated = await api.admin.chatbots.crm.updateLead(slug, lead.id, {
        botEnabled,
      });
      applyLead(updated);
    } catch (err) {
      applyLead(previous);
      setError(getUserFacingApiError(err, { context: 'Ao atualizar chatbot' }));
    } finally {
      togglingLeadIds.current.delete(lead.id);
      setSavingLeadId((current) => (current === lead.id ? null : current));
    }
  }

  async function toggleBot(botEnabled: boolean) {
    if (!selected) return;
    setSaving(true);
    try {
      await toggleLeadBot(selected, botEnabled);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteLead) return;
    setDeleteSaving(true);
    setError('');
    try {
      await api.admin.chatbots.crm.removeLead(slug, deleteLead.id);
      if (selected?.id === deleteLead.id) setSelected(null);
      setChatLead((current) => (current?.id === deleteLead.id ? null : current));
      setDeleteLead(null);
      setSuccess('Lead removido do CRM.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao remover lead' }));
    } finally {
      setDeleteSaving(false);
    }
  }

  const columns = board?.columns ?? [];
  const openChatLead = chatLead
    ? columns.flatMap((column) => column.items).find((lead) => lead.id === chatLead.id) ?? null
    : null;
  const titleEditsCompany = Boolean(
    selected && isGabi && selected.companyName?.trim(),
  );
  const titleValue = titleEditsCompany ? companyDraft : nameDraft;
  const titleName = titleValue.trim() || 'Lead';

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ChatbotAvatar slug={slug} name={botName} size="lg" className="mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm text-muted">
              CRM da {botName}. Leads deste assunto — arrasta entre colunas ou
              muda no detalhe.
            </p>
            <p className="mt-1 text-sm text-muted">
              {total} cliente{total === 1 ? '' : 's'} no pipeline
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          disabled={loading || saving}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Novo cliente
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <label className="block min-w-[12rem] flex-1 text-sm font-medium text-foreground">
          Nova coluna
          <input
            value={columnLabelDraft}
            onChange={(event) => setColumnLabelDraft(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Ex.: Em negociação"
          />
        </label>
        <button
          type="button"
          disabled={columnSaving || columnLabelDraft.trim().length < 2}
          onClick={() => void createColumn()}
          className="inline-flex min-h-10 items-center rounded-[14px] bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {columnSaving ? 'A guardar…' : 'Adicionar'}
        </button>
      </div>

      {loading && !board ? (
        <p className="mt-6 text-sm text-muted">A carregar…</p>
      ) : columns.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Ainda não há colunas neste CRM.</p>
      ) : (
        <div className="mt-6 min-w-0">
          <div className="md:hidden">
            <HorizontalSnapCarousel
              slideCount={columns.length}
              ariaLabel={`CRM ${botName}`}
              trackClassName={`items-stretch ${HORIZONTAL_CAROUSEL_TRACK} gap-3 px-1 pb-2`}
            >
              {columns.map((column) => (
                <div key={column.id} className="w-[85vw] max-w-[17.5rem] shrink-0">
                  <GenericKanbanColumn
                    column={column}
                    slug={slug}
                    botName={botName}
                    draggingLeadId={draggingLeadId}
                    savingLeadId={savingLeadId}
                    summarizingLeadId={summarizingLeadId}
                    onDropLead={(leadId, columnId) => void dropLead(leadId, columnId)}
                    onOpenDetails={openLead}
                    onRequestDelete={setDeleteLead}
                    onGenerateSummary={(lead) => void generateSummary(lead)}
                    onToggleBot={(lead) => void toggleLeadBot(lead)}
                    onOpenChat={(lead, channel) => setChatLead({ id: lead.id, channel })}
                    activeChatId={chatLead?.id ?? null}
                    activeChatChannel={chatLead?.channel ?? null}
                    onDragStart={setDraggingLeadId}
                    onDragEnd={() => setDraggingLeadId(null)}
                    onRename={(col, label) => void renameColumn(col, label)}
                  />
                </div>
              ))}
            </HorizontalSnapCarousel>
          </div>
          <div className="hidden gap-4 overflow-x-auto pb-2 md:flex">
            {columns.map((column) => (
              <GenericKanbanColumn
                key={column.id}
                column={column}
                slug={slug}
                botName={botName}
                draggingLeadId={draggingLeadId}
                savingLeadId={savingLeadId}
                summarizingLeadId={summarizingLeadId}
                onDropLead={(leadId, columnId) => void dropLead(leadId, columnId)}
                onOpenDetails={openLead}
                onRequestDelete={setDeleteLead}
                onGenerateSummary={(lead) => void generateSummary(lead)}
                onToggleBot={(lead) => void toggleLeadBot(lead)}
                onOpenChat={(lead, channel) => setChatLead({ id: lead.id, channel })}
                activeChatId={chatLead?.id ?? null}
                activeChatChannel={chatLead?.channel ?? null}
                onDragStart={setDraggingLeadId}
                onDragEnd={() => setDraggingLeadId(null)}
                onRename={(col, label) => void renameColumn(col, label)}
                className="w-[17.5rem] shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {openChatLead && chatLead ? (
        <CrmChannelChatModal
          source={{ kind: 'lead', slug, leadId: openChatLead.id }}
          channel={chatLead.channel}
          title={leadDisplayName(openChatLead, slug === 'gabi')}
          leadImageUrl={openChatLead.crmProfileImageUrl}
          botSlug={slug}
          botName={botName}
          badges={<GenericLeadBadgeRow lead={openChatLead} slug={slug} className="contents" />}
          suspendEscape={Boolean(selected || deleteLead)}
          onClose={() => setChatLead(null)}
          onBotPaused={() => applyLead({ ...openChatLead, botEnabled: false })}
          onAdminReplied={() => {
            const channel = chatLead.channel;
            const leadId = openChatLead.id;
            setBoard((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                columns: prev.columns.map((column) => ({
                  ...column,
                  items: column.items.map((item) =>
                    item.id !== leadId
                      ? item
                      : {
                          ...item,
                          unansweredWhatsapp:
                            channel === 'WHATSAPP' ? 0 : item.unansweredWhatsapp,
                          unansweredInstagram:
                            channel === 'INSTAGRAM' ? 0 : item.unansweredInstagram,
                        },
                  ),
                })),
              };
            });
          }}
          actions={
            <>
              <CrmLeadNotesTooltip
                comments={openChatLead.crmComments}
                summary={openChatLead.crmRequestSummary}
                onGenerateSummary={() => void generateSummary(openChatLead)}
                isSummarizing={summarizingLeadId === openChatLead.id}
              />
              <button
                type="button"
                className={`${crmActionIconBtnClass} text-[#25D366] ${
                  chatLead.channel === 'WHATSAPP' ? 'border-[#25D366]' : 'border-border'
                }`}
                disabled={!openChatLead.whatsapp}
                onClick={() => setChatLead({ id: openChatLead.id, channel: 'WHATSAPP' })}
                aria-label="WhatsApp"
              >
                <WhatsappIcon className={crmActionIconClass} />
                <CrmUnansweredBadge count={openChatLead.unansweredWhatsapp ?? 0} />
              </button>
              <button
                type="button"
                className={`${crmActionIconBtnClass} text-[#E1306C] ${
                  chatLead.channel === 'INSTAGRAM' ? 'border-[#E1306C]' : 'border-border'
                }`}
                disabled={!openChatLead.instagramUserId}
                onClick={() => setChatLead({ id: openChatLead.id, channel: 'INSTAGRAM' })}
                aria-label="Instagram"
              >
                <InstagramIcon className={crmActionIconClass} />
                <CrmUnansweredBadge count={openChatLead.unansweredInstagram ?? 0} />
              </button>
              <button
                type="button"
                onClick={() => void toggleLeadBot(openChatLead, !openChatLead.botEnabled)}
                className={`${crmActionIconBtnClass} ${
                  openChatLead.botEnabled
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-950'
                    : 'border-rose-300 bg-rose-100 text-rose-950'
                }`}
                aria-label={openChatLead.botEnabled ? 'Desligar chatbot' : 'Ligar chatbot'}
              >
                {openChatLead.botEnabled ? (
                  <BotIcon className={crmActionIconClass} />
                ) : (
                  <BotOffIcon className={crmActionIconClass} />
                )}
              </button>
              <button
                type="button"
                onClick={() => openLead(openChatLead)}
                className={crmActionTextBtnClass}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setDeleteLead(openChatLead)}
                className={`${crmActionIconBtnClass} border-border text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
                aria-label="Excluir lead"
              >
                <TrashIcon className={crmActionIconClass} />
              </button>
            </>
          }
        />
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-lg"
          >
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <LeadAvatar
                name={titleName}
                imageUrl={selected.crmProfileImageUrl}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <CrmLeadNameField
                  id="chatbot-crm-lead-name"
                  value={titleValue}
                  maxLength={titleEditsCompany ? 160 : 80}
                  disabled={saving}
                  onChange={titleEditsCompany ? setCompanyDraft : setNameDraft}
                />
                <p className="mt-1 text-sm text-muted">
                  {formatWhatsappDigits(selected.whatsapp)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isGabi ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Nome da empresa
                    <input
                      value={companyDraft}
                      onChange={(event) => setCompanyDraft(event.target.value)}
                      disabled={saving}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="Ex.: Move Casa"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Instagram
                    <input
                      value={instagramDraft}
                      onChange={(event) => setInstagramDraft(event.target.value)}
                      disabled={saving}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="@empresa ou vazio se não tiver"
                    />
                  </label>
                  <p className="text-xs text-muted">
                    Deixa o Instagram vazio e guarda para marcar «Sem Instagram».
                  </p>
                  <label className="block text-sm font-medium text-foreground">
                    Objetivo da campanha
                    <textarea
                      value={campaignObjectiveDraft}
                      onChange={(event) =>
                        setCampaignObjectiveDraft(event.target.value)
                      }
                      disabled={saving}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="Ex.: Gerar leads de relocation no Instagram"
                    />
                  </label>
                </div>
              ) : null}

              {isBruna ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    Valor da casa pretendida (€)
                    <input
                      value={houseValueDraft}
                      onChange={(event) => setHouseValueDraft(event.target.value)}
                      disabled={saving}
                      inputMode="numeric"
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold"
                      placeholder="Ex.: 220000"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Cidades pretendidas
                    <input
                      value={citiesDraft}
                      onChange={(event) => setCitiesDraft(event.target.value)}
                      disabled={saving}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="Ex.: Porto, Braga"
                    />
                  </label>
                  <div>
                    <p className="block text-sm font-medium text-foreground">
                      Tipologia do imóvel
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Pode escolher mais do que uma.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {RAFA_CALL_CRM_PROPERTY_TYPOLOGY_ORDER.map((typology) => {
                        const isSelected = typologyDraft.includes(typology);
                        return (
                          <button
                            key={typology}
                            type="button"
                            disabled={saving}
                            aria-pressed={isSelected}
                            onClick={() => {
                              const next = isSelected
                                ? typologyDraft.filter((item) => item !== typology)
                                : normalizeCrmPropertyTypologies([
                                    ...typologyDraft,
                                    typology,
                                  ]);
                              setTypologyDraft(next);
                            }}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                              isSelected
                                ? 'border-violet-400 bg-violet-100 text-violet-950'
                                : 'border-border bg-card text-foreground hover:border-violet-300'
                            }`}
                          >
                            {RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS[typology]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {isOutros ? (
                <label className="block text-sm font-medium text-foreground">
                  Assunto
                  <input
                    value={subjectDraft}
                    onChange={(event) => setSubjectDraft(event.target.value)}
                    disabled={saving}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                    placeholder="Resumo curto do pedido"
                  />
                </label>
              ) : null}

              <label className="mt-4 block text-sm font-medium text-foreground">
                Coluna
                <select
                  value={selected.columnId}
                  disabled={saving}
                  onChange={(event) =>
                    setSelected({ ...selected, columnId: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">
                Comentários
                <textarea
                  value={commentsDraft}
                  disabled={saving}
                  onChange={(event) => setCommentsDraft(event.target.value)}
                  rows={6}
                  placeholder="Notas adicionadas manualmente sobre o cliente."
                  className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-border bg-page px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
                />
              </label>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <label
                    className="text-xs font-medium uppercase tracking-wide text-muted"
                    htmlFor="generic-crm-request-summary"
                  >
                    Resumo da solicitação
                  </label>
                  <button
                    type="button"
                    disabled={saving || summarizingLeadId === selected.id}
                    onClick={() => void generateSummary(selected)}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-brand-primary transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Gerar resumo"
                    title="Gerar resumo"
                  >
                    {summarizingLeadId === selected.id ? (
                      <SummarySpinner />
                    ) : (
                      <SparklesIcon className="h-3.5 w-3.5" />
                    )}
                    Gerar resumo
                  </button>
                </div>
                <textarea
                  id="generic-crm-request-summary"
                  value={summaryDraft}
                  disabled={saving || summarizingLeadId === selected.id}
                  onChange={(event) => setSummaryDraft(event.target.value)}
                  rows={5}
                  placeholder="Dúvidas e solicitações deste lead. Gera com o botão ou escreve à mão."
                  className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-border bg-page px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
                />
              </div>

              <GenericCrmDocumentsSection
                slug={slug}
                leadId={selected.id}
                documents={selected.documents ?? []}
                disabled={saving}
                onDocumentsChange={(documents) => {
                  setSelected({ ...selected, documents });
                  setBoard((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      columns: prev.columns.map((column) => ({
                        ...column,
                        items: column.items.map((item) =>
                          item.id === selected.id
                            ? { ...item, documents }
                            : item,
                        ),
                      })),
                    };
                  });
                }}
              />
            </div>

            <div className="shrink-0 border-t border-border bg-page/70 px-5 py-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col items-start gap-1.5">
                  <p className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                    <BotIcon className="h-3.5 w-3.5" />
                    Chatbot {botName}
                  </p>
                  <div
                    className="flex items-center gap-1.5"
                    role="group"
                    aria-label={`Chatbot ${botName}`}
                  >
                    <button
                      type="button"
                      disabled={saving || savingLeadId === selected.id || selected.botEnabled}
                      aria-pressed={selected.botEnabled}
                      title={`${botName} responde a este WhatsApp.`}
                      onClick={() => void toggleBot(true)}
                      className={`inline-flex h-7 cursor-pointer items-center rounded-md border px-2.5 text-xs font-medium leading-none transition-colors disabled:cursor-not-allowed ${
                        selected.botEnabled
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-950'
                          : 'border-border bg-card text-foreground hover:bg-page disabled:opacity-50'
                      }`}
                    >
                      On
                    </button>
                    <button
                      type="button"
                      disabled={saving || savingLeadId === selected.id || !selected.botEnabled}
                      aria-pressed={!selected.botEnabled}
                      title={`${botName} não responde a este WhatsApp.`}
                      onClick={() => void toggleBot(false)}
                      className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2.5 text-xs font-medium leading-none transition-colors disabled:cursor-not-allowed ${
                        !selected.botEnabled
                          ? 'border-rose-300 bg-rose-100 text-rose-950'
                          : 'border-border bg-card text-foreground hover:bg-page disabled:opacity-50'
                      }`}
                    >
                      {!selected.botEnabled ? (
                        <BotOffIcon className="h-3.5 w-3.5" />
                      ) : null}
                      Off
                    </button>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    disabled={saving}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-page disabled:opacity-50"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveSelected()}
                    disabled={saving}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'A guardar…' : 'Guardar alterações'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteLead ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="generic-crm-delete-title"
          onClick={() => {
            if (!deleteSaving) setDeleteLead(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <TrashIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              <div className="min-w-0">
                <h2
                  id="generic-crm-delete-title"
                  className="text-base font-semibold text-foreground"
                >
                  Excluir lead do CRM?
                </h2>
                <p className="mt-1 text-sm text-muted">
                  O cliente deixa de aparecer no kanban da {botName}.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Cliente
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {leadDisplayName(deleteLead, isGabi)}
              </p>
              <p className="mt-0.5 text-sm text-foreground/90">
                {formatWhatsappDigits(deleteLead.whatsapp)}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => void confirmDelete()}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                {deleteSaving ? 'A excluir…' : 'Confirmar exclusão'}
              </button>
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => setDeleteLead(null)}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {newOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-card p-5 shadow-lg"
          >
            <h2 className="text-lg font-semibold text-foreground">Novo cliente</h2>
            <label className="mt-4 block text-sm font-medium text-foreground">
              Nome
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3">
              <LoginWhatsappFields
                idPrefix="generic-crm-new"
                value={newWhatsapp}
                onChange={setNewWhatsapp}
                error={newWhatsappError}
                rememberInStorage={false}
                disabled={saving}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || newName.trim().length < 2}
                onClick={() => void createLead()}
                className="inline-flex min-h-10 items-center rounded-[14px] bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'A criar…' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {draggingLeadId ? (
        <p className="sr-only" aria-live="polite">
          A mover cliente para outra coluna
        </p>
      ) : null}
    </div>
  );
}
