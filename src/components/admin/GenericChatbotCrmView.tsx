'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  getUserFacingApiError,
  type AdminChatbotSlug,
  type ChatbotCrmBoard,
  type ChatbotCrmColumn,
  type ChatbotCrmLead,
} from '@/lib/api';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { CardButton } from '@/components/ui/CardButton';
import { ChatbotAvatar } from '@/components/admin/ChatbotAvatar';

type Props = {
  slug: Exclude<AdminChatbotSlug, 'joana'>;
  botName: string;
};

export function GenericChatbotCrmView({ slug, botName }: Props) {
  const [board, setBoard] = useState<ChatbotCrmBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<ChatbotCrmLead | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newWhatsappError, setNewWhatsappError] = useState('');
  const [saving, setSaving] = useState(false);
  const [columnLabelDraft, setColumnLabelDraft] = useState('');
  const [columnSaving, setColumnSaving] = useState(false);
  const [companyDraft, setCompanyDraft] = useState('');
  const [instagramDraft, setInstagramDraft] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const isGabi = slug === 'gabi';
  const isOutros = slug === 'outros';

  function formatInstagramLabel(value: string | null): string {
    if (value === null) return 'Instagram por preencher';
    if (value === '') return 'Sem Instagram';
    return value.startsWith('@') ? value : `@${value}`;
  }

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

  function openLead(lead: ChatbotCrmLead) {
    setSelected(lead);
    setCompanyDraft(lead.companyName ?? '');
    setInstagramDraft(
      lead.instagramHandle === null ? '' : lead.instagramHandle,
    );
    setSubjectDraft(lead.subjectSummary ?? '');
  }

  async function moveLead(lead: ChatbotCrmLead, columnId: string) {
    setSaving(true);
    setError('');
    try {
      const updated = await api.admin.chatbots.crm.updateLead(slug, lead.id, {
        columnId,
      });
      setSelected(updated);
      setCompanyDraft(updated.companyName ?? '');
      setInstagramDraft(
        updated.instagramHandle === null ? '' : updated.instagramHandle,
      );
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao mover lead' }));
    } finally {
      setSaving(false);
    }
  }

  async function saveGabiFields(lead: ChatbotCrmLead) {
    setSaving(true);
    setError('');
    try {
      const updated = await api.admin.chatbots.crm.updateLead(slug, lead.id, {
        companyName: companyDraft.trim() || null,
        instagramHandle: instagramDraft.trim(),
      });
      setSelected(updated);
      setCompanyDraft(updated.companyName ?? '');
      setInstagramDraft(
        updated.instagramHandle === null ? '' : updated.instagramHandle,
      );
      setSuccess('Dados da empresa guardados.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao guardar dados' }));
    } finally {
      setSaving(false);
    }
  }

  async function saveOutrosFields(lead: ChatbotCrmLead) {
    setSaving(true);
    setError('');
    try {
      const updated = await api.admin.chatbots.crm.updateLead(slug, lead.id, {
        subjectSummary: subjectDraft.trim() || null,
      });
      setSelected(updated);
      setSubjectDraft(updated.subjectSummary ?? '');
      setSuccess('Assunto guardado.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao guardar assunto' }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleBot(lead: ChatbotCrmLead, botEnabled: boolean) {
    setSaving(true);
    setError('');
    try {
      const updated = await api.admin.chatbots.crm.updateLead(slug, lead.id, {
        botEnabled,
      });
      setSelected(updated);
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao atualizar chatbot' }));
    } finally {
      setSaving(false);
    }
  }

  async function removeLead(lead: ChatbotCrmLead) {
    if (!window.confirm(`Remover ${lead.guestName || lead.whatsapp} deste CRM?`)) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.admin.chatbots.crm.removeLead(slug, lead.id);
      setSelected(null);
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao remover lead' }));
    } finally {
      setSaving(false);
    }
  }

  async function createColumn() {
    const label = columnLabelDraft.trim();
    if (label.length < 2) {
      setError('Indica o nome da coluna.');
      return;
    }
    setColumnSaving(true);
    setError('');
    try {
      await api.admin.chatbots.crm.createColumn(slug, { label });
      setColumnLabelDraft('');
      setSuccess('Coluna criada.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao criar coluna' }));
    } finally {
      setColumnSaving(false);
    }
  }

  async function renameColumn(column: ChatbotCrmColumn, label: string) {
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
        <CardButton
          type="button"
          size="sm"
          disabled={columnSaving || columnLabelDraft.trim().length < 2}
          onClick={() => void createColumn()}
        >
          {columnSaving ? 'A guardar…' : 'Adicionar'}
        </CardButton>
      </div>

      {loading && !board ? (
        <p className="mt-6 text-sm text-muted">A carregar…</p>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {(board?.columns ?? []).map((column) => (
            <section
              key={column.id}
              className="w-[17.5rem] shrink-0 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <input
                defaultValue={column.label}
                disabled={columnSaving}
                onBlur={(event) => void renameColumn(column, event.target.value)}
                className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground hover:border-border focus:border-brand-primary focus:outline-none"
                aria-label={`Nome da coluna ${column.label}`}
              />
              <p className="mt-1 text-xs text-muted">
                {column.items.length} · {column.pausesBot ? 'desliga chatbot' : 'chatbot on'}
              </p>
              <ul className="mt-3 space-y-2">
                {column.items.map((lead) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => openLead(lead)}
                      className="w-full rounded-lg border border-border bg-page px-3 py-2 text-left hover:border-brand-primary/40"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {lead.companyName ||
                          lead.guestName ||
                          `Lead ${lead.whatsapp.slice(-3)}`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{lead.whatsapp}</p>
                      {isGabi ? (
                        <p className="mt-1 text-xs text-muted">
                          {formatInstagramLabel(lead.instagramHandle)}
                        </p>
                      ) : null}
                      {isOutros ? (
                        <p className="mt-1 text-xs text-muted">
                          {lead.subjectSummary?.trim() || 'Assunto por explicar'}
                        </p>
                      ) : null}
                      {!lead.botEnabled ? (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          Chatbot Off
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selected.companyName || selected.guestName || 'Lead'}
                </h2>
                <p className="mt-1 text-sm text-muted">{selected.whatsapp}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                Fechar
              </button>
            </div>

            {isGabi ? (
              <div className="mt-4 space-y-3 rounded-lg border border-border p-3">
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
                <CardButton
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={() => void saveGabiFields(selected)}
                >
                  {saving ? 'A guardar…' : 'Guardar dados'}
                </CardButton>
              </div>
            ) : null}

            {isOutros ? (
              <div className="mt-4 space-y-3 rounded-lg border border-border p-3">
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
                <CardButton
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={() => void saveOutrosFields(selected)}
                >
                  {saving ? 'A guardar…' : 'Guardar assunto'}
                </CardButton>
              </div>
            ) : null}

            <label className="mt-4 block text-sm font-medium text-foreground">
              Coluna
              <select
                value={selected.columnId}
                disabled={saving}
                onChange={(event) =>
                  void moveLead(selected, event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {(board?.columns ?? []).map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">Chatbot {botName}</span>
              <button
                type="button"
                disabled={saving}
                onClick={() => void toggleBot(selected, !selected.botEnabled)}
                className={
                  selected.botEnabled
                    ? 'rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded-lg border border-border px-3 py-1.5 text-sm font-medium'
                }
              >
                {selected.botEnabled ? 'On' : 'Off'}
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeLead(selected)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Remover do CRM
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
              <CardButton
                type="button"
                size="sm"
                disabled={saving || newName.trim().length < 2}
                onClick={() => void createLead()}
              >
                {saving ? 'A criar…' : 'Criar'}
              </CardButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
