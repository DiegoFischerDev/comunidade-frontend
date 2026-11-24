'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AutomationStepsEditor,
  emptyAutomationDraftStep,
  type AutomationDraftStep,
} from '@/components/admin/AutomationStepsEditor';
import {
  api,
  getUserFacingApiError,
  type JoanaWelcomeStepInput,
  type MassCampaign,
  type MassDispatchBotSlug,
  type MassDispatchFilters,
  type MassDispatchPreviewItem,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS,
  RAFA_CALL_CRM_PROPERTY_TYPOLOGY_ORDER,
  type RafacallCrmPropertyTypology,
} from '@/lib/rafacall-crm';
import { toast } from '@/lib/toast';

const BOT_OPTIONS: Array<{ slug: MassDispatchBotSlug; label: string }> = [
  { slug: 'joana', label: 'Joana' },
  { slug: 'bruna', label: 'Bruna' },
  { slug: 'gabi', label: 'Gabi' },
  { slug: 'outros', label: 'Outros' },
];

const inputClass =
  'mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25';

function draftToPayload(steps: AutomationDraftStep[]): JoanaWelcomeStepInput[] {
  return steps.map((s) => {
    const delayMsAfter = Math.max(
      0,
      Math.min(30_000, Math.round(s.delaySeconds * 1000)),
    );
    if (s.type === 'TEXT') {
      return {
        type: 'TEXT',
        textContent: s.textContent.trim(),
        delayMsAfter,
      };
    }
    return {
      type: s.type,
      textContent: s.textContent.trim() || undefined,
      mediaUrl: s.mediaUrl.trim(),
      mediaMimeType:
        s.type === 'DOCUMENT'
          ? s.mediaMimeType || 'application/pdf'
          : s.mediaMimeType || undefined,
      mediaFileName: s.mediaFileName || undefined,
      mediaUrlWhatsapp: (s.mediaUrlWhatsapp || s.mediaUrl).trim() || undefined,
      mediaMimeTypeWhatsapp:
        s.mediaMimeTypeWhatsapp || s.mediaMimeType || undefined,
      mediaUrlInstagram:
        (s.mediaUrlInstagram || s.mediaUrl).trim() || undefined,
      mediaMimeTypeInstagram:
        s.mediaMimeTypeInstagram || s.mediaMimeType || undefined,
      delayMsAfter,
    };
  });
}

function statusLabel(status: MassCampaign['status']): string {
  if (status === 'SENDING') return 'Enviando…';
  if (status === 'COMPLETED') return 'Concluída';
  if (status === 'CANCELLED') return 'Cancelada';
  if (status === 'FAILED') return 'Falhou';
  return status;
}

function visaLabel(value: boolean | null): string {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return '—';
}

function channelLabel(channel: MassDispatchPreviewItem['channel']): string {
  if (channel === 'INSTAGRAM') return 'Instagram';
  if (channel === 'WHATSAPP') return 'WhatsApp';
  return channel;
}

export default function AdminDisparoPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';

  const [steps, setSteps] = useState<AutomationDraftStep[]>([
    emptyAutomationDraftStep('TEXT'),
  ]);
  const [bots, setBots] = useState<MassDispatchBotSlug[]>([
    'joana',
    'bruna',
    'gabi',
    'outros',
  ]);
  const [hasVisa, setHasVisa] = useState<'any' | 'yes' | 'no'>('any');
  const [typologies, setTypologies] = useState<RafacallCrmPropertyTypology[]>(
    [],
  );
  const [cityContains, setCityContains] = useState('');
  const [immigrationFrom, setImmigrationFrom] = useState('');
  const [immigrationTo, setImmigrationTo] = useState('');
  const [immigrationImmediate, setImmigrationImmediate] = useState(false);
  const [minDelay, setMinDelay] = useState(1);
  const [maxDelay, setMaxDelay] = useState(10);
  const [campaignName, setCampaignName] = useState('');

  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewItems, setPreviewItems] = useState<MassDispatchPreviewItem[]>(
    [],
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  /** conversationIds desmarcados (default = todos seleccionados). */
  const [excludedConversationIds, setExcludedConversationIds] = useState<
    Set<string>
  >(() => new Set());

  const [campaigns, setCampaigns] = useState<MassCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedCount = Math.max(
    0,
    previewTotal - excludedConversationIds.size,
  );
  const allVisibleSelected =
    previewItems.length > 0 &&
    previewItems.every(
      (item) => !excludedConversationIds.has(item.conversationId),
    );
  const noneVisibleSelected =
    previewItems.length === 0 ||
    previewItems.every((item) =>
      excludedConversationIds.has(item.conversationId),
    );

  const filters: MassDispatchFilters = useMemo(() => {
    const next: MassDispatchFilters = {
      // Sempre explícito — lista vazia = nenhum lead (não “todos”).
      bots: bots,
    };
    if (hasVisa === 'yes') next.hasVisa = true;
    if (hasVisa === 'no') next.hasVisa = false;
    if (typologies.length > 0) next.typologies = typologies;
    if (cityContains.trim()) next.preferredCityContains = cityContains.trim();
    if (immigrationFrom.trim()) next.immigrationFrom = immigrationFrom.trim();
    if (immigrationTo.trim()) next.immigrationTo = immigrationTo.trim();
    if (immigrationImmediate) next.immigrationImmediate = true;
    return next;
  }, [
    bots,
    hasVisa,
    typologies,
    cityContains,
    immigrationFrom,
    immigrationTo,
    immigrationImmediate,
  ]);

  const loadCampaigns = useCallback(async () => {
    if (!canSee) return;
    setCampaignsLoading(true);
    try {
      const res = await api.admin.massDispatch.listCampaigns();
      setCampaigns(res.items);
    } catch (err) {
      setError(
        getUserFacingApiError(err, { context: 'Ao carregar campanhas' }),
      );
    } finally {
      setCampaignsLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!canSee) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setPreviewLoading(true);
      void api.admin.massDispatch
        .preview(filters)
        .then((res) => {
          if (cancelled) return;
          setPreviewTotal(res.total);
          setPreviewItems(res.items);
          // Novo resultado de filtro → todos voltam a seleccionados.
          setExcludedConversationIds(new Set());
        })
        .catch((err) => {
          if (cancelled) return;
          setError(
            getUserFacingApiError(err, { context: 'Ao pré-visualizar leads' }),
          );
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSee, filters]);

  useEffect(() => {
    if (!canSee) return;
    const hasSending = campaigns.some((c) => c.status === 'SENDING');
    if (!hasSending) return;
    const timer = window.setInterval(() => {
      void loadCampaigns();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [canSee, campaigns, loadCampaigns]);

  async function uploadStep(key: string, file: File) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, uploading: true } : s)),
    );
    try {
      const prepared = await api.uploads.postChannelMedia(file);
      setSteps((prev) =>
        prev.map((s) =>
          s.key === key
            ? {
                ...s,
                mediaUrl: prepared.url,
                mediaMimeType: prepared.mediaMimeType || file.type || '',
                mediaFileName: prepared.mediaFileName || file.name,
                mediaUrlWhatsapp: prepared.mediaUrlWhatsapp,
                mediaMimeTypeWhatsapp: prepared.mediaMimeTypeWhatsapp,
                mediaUrlInstagram: prepared.mediaUrlInstagram,
                mediaMimeTypeInstagram: prepared.mediaMimeTypeInstagram,
                uploading: false,
              }
            : s,
        ),
      );
    } catch (err) {
      setSteps((prev) =>
        prev.map((s) => (s.key === key ? { ...s, uploading: false } : s)),
      );
      setError(getUserFacingApiError(err, { context: 'Ao carregar ficheiro' }));
    }
  }

  function toggleBot(slug: MassDispatchBotSlug) {
    setBots((prev) =>
      prev.includes(slug) ? prev.filter((b) => b !== slug) : [...prev, slug],
    );
  }

  function toggleTypology(value: RafacallCrmPropertyTypology) {
    setTypologies((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function toggleLead(conversationId: string) {
    setExcludedConversationIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
  }

  function toggleAllVisible(selectAll: boolean) {
    setExcludedConversationIds((prev) => {
      const next = new Set(prev);
      for (const item of previewItems) {
        if (selectAll) next.delete(item.conversationId);
        else next.add(item.conversationId);
      }
      return next;
    });
  }

  async function handleSend() {
    if (sending) return;
    const title = campaignName.trim();
    if (!title) {
      setError('Indica um título para a campanha.');
      return;
    }
    if (selectedCount <= 0) {
      setError('Selecciona pelo menos um lead para enviar.');
      return;
    }
    if (
      !window.confirm(
        `Enviar «${title}» para ${selectedCount} lead${selectedCount === 1 ? '' : 's'}? O bot vai gerar variações e iniciar o disparo com espaçamento aleatório.`,
      )
    ) {
      return;
    }

    setSending(true);
    setError('');
    try {
      const payload = draftToPayload(steps);
      const created = await api.admin.massDispatch.createCampaign({
        name: title,
        steps: payload,
        filters,
        excludedConversationIds: [...excludedConversationIds],
        minDelayMinutes: minDelay,
        maxDelayMinutes: maxDelay,
      });
      toast.success('Campanha criada — a enviar…');
      setCampaignName('');
      setCampaigns((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      await loadCampaigns();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao criar o disparo' }));
    } finally {
      setSending(false);
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm('Cancelar os envios pendentes desta campanha?')) return;
    try {
      await api.admin.massDispatch.cancelCampaign(id);
      toast.success('Campanha cancelada.');
      await loadCampaigns();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao cancelar' }));
    }
  }

  if (!canSee) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted">Sem permissão para esta página.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Disparo global
        </h1>
        <p className="max-w-prose text-sm text-muted">
          Define a sequência, filtra leads por qualificação e envia no canal
          activo de cada contacto (WhatsApp ou Instagram), com espaçamento
          aleatório e variações de texto.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-foreground">Sequência</h2>
        <p className="text-sm text-muted">
          Texto, imagem ou documento (PDF). O texto terá variações geradas pela
          OpenAI no momento do envio. Usa a tag{' '}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-foreground">
            {'{{nome}}'}
          </code>{' '}
          para inserir o primeiro nome do lead (ex.: «Oi {'{{nome}}'}, tudo
          bem?»).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sending}
            onClick={() => {
              const tag = '{{nome}}';
              setSteps((prev) => {
                const textIdx = prev.findIndex((s) => s.type === 'TEXT');
                if (textIdx < 0) {
                  return [
                    {
                      ...emptyAutomationDraftStep('TEXT'),
                      textContent: tag,
                    },
                    ...prev,
                  ];
                }
                return prev.map((s, i) =>
                  i === textIdx
                    ? {
                        ...s,
                        textContent: s.textContent.trim()
                          ? `${s.textContent.trim()} ${tag}`
                          : tag,
                      }
                    : s,
                );
              });
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Inserir {'{{nome}}'}
          </button>
        </div>
        <AutomationStepsEditor
          steps={steps}
          allowedTypes={['TEXT', 'IMAGE', 'DOCUMENT']}
          onChange={setSteps}
          onUpload={uploadStep}
          disabled={sending}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-foreground">
            Intervalo mínimo (minutos)
            <input
              type="number"
              min={1}
              max={10}
              className={inputClass}
              value={minDelay}
              disabled={sending}
              onChange={(e) =>
                setMinDelay(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
              }
            />
          </label>
          <label className="block text-sm text-foreground">
            Intervalo máximo (minutos)
            <input
              type="number"
              min={1}
              max={10}
              className={inputClass}
              value={maxDelay}
              disabled={sending}
              onChange={(e) =>
                setMaxDelay(Math.max(1, Math.min(10, Number(e.target.value) || 10)))
              }
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-foreground">Condições</h2>

        <div>
          <p className="text-sm font-medium text-foreground">CRMs / bots</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BOT_OPTIONS.map((bot) => {
              const active = bots.includes(bot.slug);
              return (
                <button
                  key={bot.slug}
                  type="button"
                  disabled={sending}
                  onClick={() => toggleBot(bot.slug)}
                  className={
                    active
                      ? 'rounded-lg bg-brand-primary px-3 py-2 text-sm text-white'
                      : 'rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground'
                  }
                >
                  {bot.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Tem visto?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['any', 'Qualquer'],
                ['yes', 'Sim'],
                ['no', 'Não'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={sending}
                onClick={() => setHasVisa(value)}
                className={
                  hasVisa === value
                    ? 'rounded-lg bg-brand-primary px-3 py-2 text-sm text-white'
                    : 'rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Tipologia</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RAFA_CALL_CRM_PROPERTY_TYPOLOGY_ORDER.map((t) => {
              const active = typologies.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  disabled={sending}
                  onClick={() => toggleTypology(t)}
                  className={
                    active
                      ? 'rounded-lg bg-brand-primary px-3 py-2 text-sm text-white'
                      : 'rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground'
                  }
                >
                  {RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block text-sm text-foreground">
          Cidades de preferência (contém)
          <input
            type="text"
            className={inputClass}
            placeholder="Ex.: Lisboa"
            value={cityContains}
            disabled={sending}
            onChange={(e) => setCityContains(e.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-foreground">
            Data de imigração (de)
            <input
              type="date"
              className={inputClass}
              value={immigrationFrom}
              disabled={sending}
              onChange={(e) => setImmigrationFrom(e.target.value)}
            />
          </label>
          <label className="block text-sm text-foreground">
            Data de imigração (até)
            <input
              type="date"
              className={inputClass}
              value={immigrationTo}
              disabled={sending}
              onChange={(e) => setImmigrationTo(e.target.value)}
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={immigrationImmediate}
            disabled={sending}
            onChange={(e) => setImmigrationImmediate(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Incluir imigração imediata
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-lg font-medium text-foreground">Leads</h2>
              <p className="text-sm text-muted">
                {previewLoading
                  ? 'A actualizar…'
                  : `${selectedCount} de ${previewTotal} seleccionado${selectedCount === 1 ? '' : 's'} vão receber a mensagem`}
                {previewTotal > previewItems.length
                  ? ` (a mostrar ${previewItems.length})`
                  : ''}
              </p>
            </div>
            <label className="block max-w-md text-sm text-foreground">
              Título da campanha
              <input
                type="text"
                className={inputClass}
                placeholder="Ex.: Novidades Lisboa — Março"
                maxLength={160}
                value={campaignName}
                disabled={sending}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sending || previewItems.length === 0 || allVisibleSelected}
                onClick={() => toggleAllVisible(true)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Marcar todos
              </button>
              <button
                type="button"
                disabled={sending || noneVisibleSelected}
                onClick={() => toggleAllVisible(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Desmarcar todos
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={
              sending ||
              selectedCount === 0 ||
              bots.length === 0 ||
              !campaignName.trim()
            }
            onClick={() => void handleSend()}
            className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? 'A preparar…' : 'Enviar'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="w-10 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={sending || previewItems.length === 0}
                    aria-label="Seleccionar todos os leads visíveis"
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                <th className="px-2 py-2 font-medium">Nome</th>
                <th className="px-2 py-2 font-medium">Bot</th>
                <th className="px-2 py-2 font-medium">Canal</th>
                <th className="px-2 py-2 font-medium">Visto</th>
                <th className="px-2 py-2 font-medium">Tipologia</th>
                <th className="px-2 py-2 font-medium">Cidade</th>
                <th className="px-2 py-2 font-medium">Imigração</th>
              </tr>
            </thead>
            <tbody>
              {previewItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-2 py-6 text-center text-muted"
                  >
                    Nenhum lead com estas condições e canal activo.
                  </td>
                </tr>
              ) : (
                previewItems.map((item) => {
                  const checked = !excludedConversationIds.has(
                    item.conversationId,
                  );
                  return (
                    <tr
                      key={`${item.sourceType}-${item.sourceId}`}
                      className="border-b border-border/70"
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={sending}
                          aria-label={`Incluir ${item.displayName || item.whatsappDigits || item.conversationId}`}
                          onChange={() => toggleLead(item.conversationId)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                      <td className="px-2 py-2 text-foreground">
                        {item.displayName || item.whatsappDigits || '—'}
                      </td>
                      <td className="px-2 py-2 capitalize text-foreground">
                        {item.botSlug}
                      </td>
                      <td className="px-2 py-2 text-foreground">
                        {channelLabel(item.channel)}
                      </td>
                      <td className="px-2 py-2 text-foreground">
                        {visaLabel(item.hasVisa)}
                      </td>
                      <td className="px-2 py-2 text-foreground">
                        {item.propertyTypology.length
                          ? item.propertyTypology
                              .map(
                                (t) =>
                                  RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS[
                                    t as RafacallCrmPropertyTypology
                                  ] || t,
                              )
                              .join(', ')
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-foreground">
                        {item.preferredCity || '—'}
                      </td>
                      <td className="px-2 py-2 text-foreground">
                        {item.immigrationImmediate
                          ? 'Imediato'
                          : item.expectedImmigrationAt || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-foreground">Campanhas</h2>
          <button
            type="button"
            onClick={() => void loadCampaigns()}
            className="text-sm text-brand-primary underline-offset-2 hover:underline"
          >
            Actualizar
          </button>
        </div>
        {campaignsLoading && campaigns.length === 0 ? (
          <p className="text-sm text-muted">A carregar…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há campanhas.</p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.name?.trim() || 'Campanha sem título'}
                  </p>
                  <p className="text-xs text-muted">
                    {statusLabel(c.status)}
                    {' · '}
                    {c.sentCount}/{c.totalRecipients} enviados
                    {c.failedCount > 0 ? ` · ${c.failedCount} falhas` : ''}
                    {' · '}
                    intervalo {c.minDelayMinutes}–{c.maxDelayMinutes} min
                    {' · '}
                    {new Date(c.createdAt).toLocaleString('pt-PT')}
                  </p>
                </div>
                {c.status === 'SENDING' ? (
                  <button
                    type="button"
                    onClick={() => void handleCancel(c.id)}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
