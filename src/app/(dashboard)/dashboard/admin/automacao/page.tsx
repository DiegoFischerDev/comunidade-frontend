'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  getUserFacingApiError,
  type AdminChatbot,
  type AdminChatbotSlug,
  type JoanaWelcomeStepInput,
  type WhatsappClientAutomation,
  type WhatsappClientAutomationStepInput,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';
import { ADMIN_FROM_ME_AUTOMATIONS } from '@/lib/admin-from-me-automations';
import {
  AutomationStepsEditor,
  automationStepTypeLabel,
  emptyAutomationDraftStep,
  type AutomationDraftStep,
} from '@/components/admin/AutomationStepsEditor';
import { ChatbotAvatar } from '@/components/admin/ChatbotAvatar';

const inputClass =
  'mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25';

/** Tema curto por chatbot — alinhado aos tabs do CRM. */
const CHATBOT_THEME: Record<AdminChatbotSlug, string> = {
  joana: 'Relocation / aluguel',
  bruna: 'Crédito imobiliário',
  bianca: 'Visto / preparação',
  gabi: 'Publicidade',
  outros: 'Assuntos gerais / Rafa',
};

const WELCOME_STEP_TYPES = [
  'TEXT',
  'AUDIO',
  'IMAGE',
  'DOCUMENT',
] as const;

function stepsFromApi(
  steps: Array<{
    id?: string;
    type: AutomationDraftStep['type'];
    textContent?: string | null;
    mediaUrl?: string | null;
    mediaMimeType?: string | null;
    mediaFileName?: string | null;
    mediaUrlWhatsapp?: string | null;
    mediaMimeTypeWhatsapp?: string | null;
    mediaUrlInstagram?: string | null;
    mediaMimeTypeInstagram?: string | null;
    delayMsAfter?: number;
  }>,
): AutomationDraftStep[] {
  return steps.map((s, index) => ({
    key: s.id || `welcome-${index}-${s.type}`,
    type: s.type,
    textContent: s.textContent ?? '',
    mediaUrl: s.mediaUrl ?? '',
    mediaMimeType: s.mediaMimeType ?? '',
    mediaFileName: s.mediaFileName ?? '',
    mediaUrlWhatsapp: s.mediaUrlWhatsapp ?? s.mediaUrl ?? '',
    mediaMimeTypeWhatsapp: s.mediaMimeTypeWhatsapp ?? s.mediaMimeType ?? '',
    mediaUrlInstagram: s.mediaUrlInstagram ?? s.mediaUrl ?? '',
    mediaMimeTypeInstagram: s.mediaMimeTypeInstagram ?? s.mediaMimeType ?? '',
    delaySeconds: Math.max(0, Math.round((s.delayMsAfter ?? 650) / 100) / 10),
  }));
}

function draftToAutomationPayload(
  steps: AutomationDraftStep[],
): WhatsappClientAutomationStepInput[] {
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
    if (s.type === 'DOCUMENT') {
      throw new Error('PDF só está disponível nas boas-vindas da Joana.');
    }
    return {
      type: s.type,
      mediaUrl: s.mediaUrl.trim(),
      mediaMimeType: s.mediaMimeType || undefined,
      mediaFileName: s.mediaFileName || undefined,
      caption: s.type === 'IMAGE' ? s.textContent.trim() || undefined : undefined,
      delayMsAfter,
    };
  });
}

function draftToWelcomePayload(
  steps: AutomationDraftStep[],
): JoanaWelcomeStepInput[] {
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
      mediaUrl: s.mediaUrl.trim(),
      mediaMimeType:
        s.type === 'DOCUMENT'
          ? s.mediaMimeType || 'application/pdf'
          : s.mediaMimeType || undefined,
      mediaFileName: s.mediaFileName || undefined,
      mediaUrlWhatsapp: (s.mediaUrlWhatsapp || s.mediaUrl).trim() || undefined,
      mediaMimeTypeWhatsapp:
        s.mediaMimeTypeWhatsapp || s.mediaMimeType || undefined,
      mediaUrlInstagram: (s.mediaUrlInstagram || s.mediaUrl).trim() || undefined,
      mediaMimeTypeInstagram:
        s.mediaMimeTypeInstagram || s.mediaMimeType || undefined,
      caption:
        s.type === 'IMAGE' || s.type === 'DOCUMENT'
          ? s.textContent.trim() || undefined
          : undefined,
      delayMsAfter,
    };
  });
}

function looksLikePdf(step: AutomationDraftStep): boolean {
  const mime = step.mediaMimeType.trim().toLowerCase();
  if (mime === 'application/pdf' || mime.includes('pdf')) return true;
  const name = `${step.mediaFileName} ${step.mediaUrl}`
    .trim()
    .toLowerCase()
    .split('?')[0]!;
  return name.endsWith('.pdf');
}

function validateDraftSteps(
  steps: AutomationDraftStep[],
  opts?: { allowEmpty?: boolean; allowDocument?: boolean },
): string | null {
  if (!opts?.allowEmpty && steps.length === 0) {
    return 'Indica pelo menos um passo.';
  }
  for (const [i, s] of steps.entries()) {
    if (s.type === 'TEXT' && !s.textContent.trim()) {
      return `Passo ${i + 1}: escreve o texto.`;
    }
    if (
      (s.type === 'AUDIO' || s.type === 'IMAGE' || s.type === 'DOCUMENT') &&
      !s.mediaUrl.trim()
    ) {
      return `Passo ${i + 1}: faz upload do ficheiro ou indica a URL.`;
    }
    if (s.type === 'DOCUMENT') {
      if (!opts?.allowDocument) {
        return `Passo ${i + 1}: PDF só nas boas-vindas da Joana.`;
      }
      if (!looksLikePdf(s)) {
        return `Passo ${i + 1}: o documento tem de ser um PDF.`;
      }
    }
  }
  return null;
}

export default function AdminAutomacaoPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';

  const [items, setItems] = useState<WhatsappClientAutomation[]>([]);
  const [chatbots, setChatbots] = useState<AdminChatbot[]>([]);
  const [selectedBotSlug, setSelectedBotSlug] =
    useState<AdminChatbotSlug>('joana');
  const [menuText, setMenuText] = useState('');
  const [menuSaving, setMenuSaving] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [instagramEnabled, setInstagramEnabled] = useState(true);
  const [channelBusy, setChannelBusy] = useState<
    'whatsapp' | 'instagram' | null
  >(null);
  const [contextText, setContextText] = useState('');
  const [welcomeSteps, setWelcomeSteps] = useState<AutomationDraftStep[]>([]);
  const [contextSaving, setContextSaving] = useState(false);
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const selectedBot =
    chatbots.find((bot) => bot.slug === selectedBotSlug) ?? chatbots[0] ?? null;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [active, setActive] = useState(true);
  const [steps, setSteps] = useState<AutomationDraftStep[]>([
    emptyAutomationDraftStep('TEXT'),
  ]);

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const [res, bots, menu, channels] = await Promise.all([
        api.admin.whatsappAutomations.list(),
        api.admin.chatbots.list(),
        api.admin.chatbots.menu(),
        api.admin.chatbots.channels(),
      ]);
      setItems(res.items);
      setChatbots(bots);
      setMenuText(menu.text);
      setWhatsappEnabled(channels.whatsappEnabled);
      setInstagramEnabled(channels.instagramEnabled);
      setSelectedBotSlug((prev) => {
        const current = bots.find((bot) => bot.slug === prev) ?? bots[0] ?? null;
        if (current) {
          setContextText(current.contextText);
          setWelcomeSteps(stepsFromApi(current.welcomeSteps));
          return current.slug;
        }
        return prev;
      });
    } catch (err) {
      setError(
        getUserFacingApiError(err, { context: 'Ao carregar automações' }),
      );
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectBot(slug: AdminChatbotSlug) {
    const bot = chatbots.find((item) => item.slug === slug);
    if (!bot) return;
    setSelectedBotSlug(slug);
    setContextText(bot.contextText);
    setWelcomeSteps(stepsFromApi(bot.welcomeSteps));
    setSuccess('');
    setError('');
  }

  async function saveMenu() {
    setMenuSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await api.admin.chatbots.updateMenu(menuText);
      setMenuText(saved.text);
      setSuccess('Texto do menu inicial guardado.');
    } catch (err) {
      setError(
        getUserFacingApiError(err, { context: 'Ao guardar o menu inicial' }),
      );
    } finally {
      setMenuSaving(false);
    }
  }

  async function toggleChannel(channel: 'whatsapp' | 'instagram') {
    const next =
      channel === 'whatsapp' ? !whatsappEnabled : !instagramEnabled;
    setChannelBusy(channel);
    setError('');
    setSuccess('');
    try {
      const saved = await api.admin.chatbots.updateChannels(
        channel === 'whatsapp'
          ? { whatsappEnabled: next }
          : { instagramEnabled: next },
      );
      setWhatsappEnabled(saved.whatsappEnabled);
      setInstagramEnabled(saved.instagramEnabled);
      setSuccess(
        channel === 'whatsapp'
          ? saved.whatsappEnabled
            ? 'Chatbots no WhatsApp activados.'
            : 'Chatbots no WhatsApp desactivados.'
          : saved.instagramEnabled
            ? 'Chatbots no Instagram activados.'
            : 'Chatbots no Instagram desactivados.',
      );
    } catch (err) {
      setError(
        getUserFacingApiError(err, {
          context: 'Ao actualizar o canal dos chatbots',
        }),
      );
    } finally {
      setChannelBusy(null);
    }
  }

  async function saveContext() {
    if (!selectedBot) return;
    setContextSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await api.admin.chatbots.updateContext(
        selectedBot.slug,
        contextText,
      );
      setContextText(saved.contextText);
      setChatbots((prev) =>
        prev.map((bot) =>
          bot.slug === saved.slug
            ? { ...bot, contextText: saved.contextText }
            : bot,
        ),
      );
      setSuccess(`Contexto da ${saved.name} guardado.`);
    } catch (err) {
      setError(
        getUserFacingApiError(err, {
          context: `Ao guardar o contexto da ${selectedBot.name}`,
        }),
      );
    } finally {
      setContextSaving(false);
    }
  }

  async function saveWelcome() {
    if (!selectedBot) return;
    const validationError = validateDraftSteps(welcomeSteps, {
      allowEmpty: true,
      allowDocument: true,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setWelcomeSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await api.admin.chatbots.updateWelcome(
        selectedBot.slug,
        draftToWelcomePayload(welcomeSteps),
      );
      setWelcomeSteps(stepsFromApi(saved.welcomeSteps));
      setChatbots((prev) =>
        prev.map((bot) =>
          bot.slug === saved.slug
            ? { ...bot, welcomeSteps: saved.welcomeSteps }
            : bot,
        ),
      );
      setSuccess(
        saved.welcomeSteps.length
          ? `Boas-vindas da ${saved.name} guardadas.`
          : `Boas-vindas limpas. A ${saved.name} volta a usar a apresentação por omissão.`,
      );
    } catch (err) {
      setError(
        getUserFacingApiError(err, {
          context: `Ao guardar as boas-vindas da ${selectedBot.name}`,
        }),
      );
    } finally {
      setWelcomeSaving(false);
    }
  }

  async function uploadWelcomeStep(key: string, file: File) {
    setWelcomeSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, uploading: true } : s)),
    );
    try {
      const prepared = await api.uploads.postChannelMedia(file);
      setWelcomeSteps((prev) =>
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
      setWelcomeSteps((prev) =>
        prev.map((s) => (s.key === key ? { ...s, uploading: false } : s)),
      );
      setError(getUserFacingApiError(err, { context: 'Ao carregar ficheiro' }));
    }
  }

  function openCreate() {
    setError('');
    setSuccess('');
    setEditingId(null);
    setName('');
    setTriggerPhrase('');
    setActive(true);
    setSteps([emptyAutomationDraftStep('TEXT')]);
    setEditorOpen(true);
  }

  function openEdit(a: WhatsappClientAutomation) {
    setError('');
    setSuccess('');
    setEditingId(a.id);
    setName(a.name);
    setTriggerPhrase(a.triggerPhrase);
    setActive(a.active);
    setSteps(
      a.steps.length
        ? stepsFromApi(a.steps)
        : [emptyAutomationDraftStep('TEXT')],
    );
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
  }

  async function uploadForStep(key: string, file: File) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, uploading: true } : s)),
    );
    try {
      const { url } = await api.uploads.post(file);
      setSteps((prev) =>
        prev.map((s) =>
          s.key === key
            ? {
                ...s,
                mediaUrl: url,
                mediaMimeType: file.type || '',
                mediaFileName: file.name,
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

  async function save() {
    const trimmedName = name.trim();
    const trimmedTrigger = triggerPhrase.trim();
    setError('');
    if (trimmedName.length < 2) {
      setError('Indica um nome para a automação.');
      return;
    }
    if (trimmedTrigger.length < 20) {
      setError('A frase-gatilho deve ter pelo menos 20 caracteres.');
      return;
    }
    const stepsError = validateDraftSteps(steps);
    if (stepsError) {
      setError(stepsError);
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: trimmedName,
        triggerPhrase: trimmedTrigger,
        active,
        steps: draftToAutomationPayload(steps),
      };
      if (editingId) {
        await api.admin.whatsappAutomations.update(editingId, body);
        setSuccess('Automação atualizada.');
      } else {
        await api.admin.whatsappAutomations.create(body);
        setSuccess('Automação criada.');
      }
      setEditorOpen(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao guardar a automação' }));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: WhatsappClientAutomation) {
    setBusyId(a.id);
    setError('');
    setSuccess('');
    try {
      await api.admin.whatsappAutomations.update(a.id, { active: !a.active });
      setSuccess(a.active ? 'Automação desativada.' : 'Automação ativada.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function removeAutomation(a: WhatsappClientAutomation) {
    if (!window.confirm(`Remover a automação «${a.name}»?`)) return;
    setBusyId(a.id);
    setError('');
    setSuccess('');
    try {
      await api.admin.whatsappAutomations.remove(a.id);
      setSuccess('Automação removida.');
      await load();
    } catch (err) {
      setError(getUserFacingApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return null;
  if (!canSee) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12 md:pt-16 lg:pt-8">
        <h1 className="text-2xl font-semibold text-foreground">Automação</h1>
        <p className="mt-2 text-sm text-muted">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12 md:pt-16 lg:pt-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Automação WhatsApp
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Gatilhos e respostas automáticas para WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-page"
        >
          Atualizar
        </button>
      </div>

      {error && !editorOpen ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success && !editorOpen ? (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Chatbots</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Joana, Bruna e Gabi partilham a instância WhatsApp comunidade MEO e o
          Instagram Direct. O contacto novo recebe um menu e fica preso ao
          chatbot escolhido. Cada uma espera 15 segundos, junta as mensagens e
          só então responde.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ChannelToggleRow
            channel="whatsapp"
            label="WhatsApp"
            description="Menu e respostas automáticas no WhatsApp"
            enabled={whatsappEnabled}
            busy={channelBusy === 'whatsapp' || loading}
            onToggle={() => void toggleChannel('whatsapp')}
          />
          <ChannelToggleRow
            channel="instagram"
            label="Instagram"
            description="Menu e respostas automáticas no Direct"
            enabled={instagramEnabled}
            busy={channelBusy === 'instagram' || loading}
            onToggle={() => void toggleChannel('instagram')}
          />
        </div>

        <div className="mt-4 rounded-lg border border-border bg-page px-3 py-3">
          <label
            htmlFor="chatbot-menu-text"
            className="block text-sm font-medium text-foreground"
          >
            Menu inicial
          </label>
          <p className="mt-1 text-sm text-muted">
            Primeira mensagem a um número novo. O contacto pode responder com
            1/2/3 ou texto livre — a OpenAI interpreta e encaminha.
          </p>
          <textarea
            id="chatbot-menu-text"
            value={menuText}
            onChange={(event) => setMenuText(event.target.value)}
            rows={10}
            className="mt-3 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
          <div className="mt-3">
            <CardButton
              type="button"
              size="sm"
              disabled={menuSaving || menuText.trim().length < 20}
              onClick={() => void saveMenu()}
            >
              {menuSaving ? 'A guardar…' : 'Guardar menu'}
            </CardButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Chatbots">
          {chatbots.map((bot) => {
            const selected = bot.slug === selectedBotSlug;
            const theme = CHATBOT_THEME[bot.slug] ?? bot.menuLabel;
            return (
              <button
                key={bot.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectBot(bot.slug)}
                className={
                  selected
                    ? 'inline-flex items-center gap-2.5 rounded-lg bg-brand-primary px-3 py-2 text-left text-sm font-medium text-white'
                    : 'inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground/90 hover:bg-page'
                }
              >
                <ChatbotAvatar
                  slug={bot.slug}
                  name={bot.name}
                  size="sm"
                  onBrand={selected}
                />
                <span className="min-w-0">
                  <span className="block">{bot.name}</span>
                  <span
                    className={
                      selected
                        ? 'block text-xs font-normal text-white/80'
                        : 'block text-xs font-normal text-muted'
                    }
                  >
                    {theme}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {selectedBot ? (
          <>
            <p className="mt-3 text-sm text-muted">
              {selectedBot.slug === 'joana'
                ? 'Motor de qualificação Relocation (CRM Joana).'
                : selectedBot.slug === 'bianca'
                  ? 'Vistos e preparação: responde com o contexto abaixo e conduz à videochamada (/agendar). CRM próprio em /dashboard/admin/crm?bot=bianca.'
                  : selectedBot.engineKind === 'HANDOFF_OTHER'
                    ? 'Handoff à Rafa: mensagem de espera, chatbot Off e CRM Outros.'
                    : 'Motor genérico: responde só com o contexto abaixo.'}{' '}
              Menu: {selectedBot.menuOrder} — {selectedBot.menuLabel}
            </p>
            <label
              htmlFor="chatbot-context"
              className="mt-4 block text-sm font-medium text-foreground"
            >
              Contexto do negócio
            </label>
            <textarea
              id="chatbot-context"
              value={contextText}
              onChange={(event) => setContextText(event.target.value)}
              rows={12}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
            />
            <div className="mt-3">
              <CardButton
                type="button"
                size="sm"
                disabled={contextSaving || contextText.trim().length < 20}
                onClick={() => void saveContext()}
              >
                {contextSaving ? 'A guardar…' : 'Guardar contexto'}
              </CardButton>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">
                Boas-vindas padrão
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Sequência enviada na primeira resposta depois da escolha do
                menu. Podes misturar texto, áudio, imagem e PDF. Sem passos, usa
                a apresentação por omissão.
              </p>
              <div className="mt-4">
                <AutomationStepsEditor
                  steps={welcomeSteps}
                  disabled={welcomeSaving || loading}
                  requireAtLeastOne={false}
                  allowedTypes={[...WELCOME_STEP_TYPES]}
                  onChange={setWelcomeSteps}
                  onUpload={uploadWelcomeStep}
                />
              </div>
              <div className="mt-3">
                <CardButton
                  type="button"
                  size="sm"
                  disabled={welcomeSaving || loading}
                  onClick={() => void saveWelcome()}
                >
                  {welcomeSaving ? 'A guardar…' : 'Guardar boas-vindas'}
                </CardButton>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {/* Automações fixas */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">
          Automações fixas
        </h2>
        <p className="mt-1 text-sm text-muted">
          Lista fixa — novas entradas só por alterações de código no backend.
        </p>

        <div className="mt-3 space-y-3 md:hidden">
          {ADMIN_FROM_ME_AUTOMATIONS.map((row) => (
            <article
              key={row.name}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-foreground">{row.name}</p>
              {row.notes ? (
                <p className="mt-1 text-xs text-muted">{row.notes}</p>
              ) : null}
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Gatilho
                </p>
                <code className="mt-1 inline-block rounded bg-page px-1.5 py-0.5 text-xs text-foreground">
                  {row.trigger}
                </code>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Ação
                </p>
                <p className="mt-1 text-sm text-foreground/90">{row.action}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-3 hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Gatilho</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {ADMIN_FROM_ME_AUTOMATIONS.map((row) => (
                <tr key={row.name} className="align-top hover:bg-page/60">
                  <td className="px-4 py-3 text-foreground">
                    <p className="font-medium">{row.name}</p>
                    {row.notes ? (
                      <p className="mt-1 text-xs text-muted">{row.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-page px-1.5 py-0.5 text-xs text-foreground">
                      {row.trigger}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-foreground/90">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automações cliente */}
      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Minhas automações
            </h2>
            <p className="mt-1 text-sm text-muted">
              Gatilho (frase) + sequência de respostas (texto, áudio ou imagem).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CardButton type="button" size="sm" onClick={openCreate}>
              Nova automação
            </CardButton>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nenhuma automação ainda. Cria uma com «Nova automação».
          </p>
        ) : (
          <>
            <div className="mt-4 space-y-3 md:hidden">
              {items.map((a) => (
                <article
                  key={a.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-semibold text-foreground">
                      {a.name}
                    </p>
                    {a.active ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                        Ativa
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-primary-1 px-2 py-1 text-xs font-semibold text-foreground/90">
                        Inativa
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Gatilho
                    </p>
                    <p className="mt-1 text-sm leading-snug text-foreground/90">
                      {a.triggerPhrase}
                    </p>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Passos
                    </p>
                    <p className="mt-1 text-sm text-foreground/90">
                      {a.steps
                        .map((s) => automationStepTypeLabel(s.type))
                        .join(' → ')}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleActive(a)}
                      disabled={busyId === a.id}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-page disabled:opacity-60"
                    >
                      {a.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      disabled={busyId === a.id}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-page disabled:opacity-60"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeAutomation(a)}
                      disabled={busyId === a.id}
                      className="rounded-lg border border-red-200 bg-card px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {busyId === a.id ? '…' : 'Remover'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-page text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Gatilho</th>
                    <th className="px-4 py-3">Passos</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((a) => (
                    <tr key={a.id} className="align-top hover:bg-page/60">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {a.name}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-foreground/90">
                        <span className="line-clamp-3 text-xs">
                          {a.triggerPhrase}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/90">
                        {a.steps
                          .map((s) => automationStepTypeLabel(s.type))
                          .join(' → ')}
                      </td>
                      <td className="px-4 py-3">
                        {a.active ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                            Ativa
                          </span>
                        ) : (
                          <span className="rounded-full bg-primary-1 px-2 py-1 text-xs font-semibold text-foreground/90">
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void toggleActive(a)}
                          disabled={busyId === a.id}
                          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-page disabled:opacity-60"
                        >
                          {a.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          disabled={busyId === a.id}
                          className="ml-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-page disabled:opacity-60"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeAutomation(a)}
                          disabled={busyId === a.id}
                          className="ml-2 rounded-lg border border-red-200 bg-card px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {busyId === a.id ? '…' : 'Remover'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editorOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center brand-modal-scrim p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditor();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="automacao-modal-title"
            className="max-h-[min(90vh,800px)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="automacao-modal-title"
                className="text-lg font-semibold text-foreground"
              >
                {editingId ? 'Editar automação' : 'Nova automação'}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground/90 hover:bg-page disabled:opacity-60"
              >
                Fechar
              </button>
            </div>

            {error ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Nome
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Ex.: Boas-vindas site"
                  disabled={saving}
                />
              </label>

              <label className="text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                  Frase-gatilho (a mensagem deve conter este texto)
                </span>
                <textarea
                  value={triggerPhrase}
                  onChange={(e) => setTriggerPhrase(e.target.value)}
                  rows={3}
                  className={inputClass}
                  disabled={saving}
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  disabled={saving}
                />
                Automação ativa
              </label>

              <div className="mt-2">
                <AutomationStepsEditor
                  steps={steps}
                  disabled={saving}
                  onChange={setSteps}
                  onUpload={uploadForStep}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-page disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-dark disabled:opacity-60"
              >
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChannelToggleRow(props: {
  channel: 'whatsapp' | 'instagram';
  label: string;
  description: string;
  enabled: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const { channel, label, description, enabled, busy, onToggle } = props;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-page px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={
            channel === 'whatsapp'
              ? 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/
              : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]'
          }
          aria-hidden
        >
          {channel === 'whatsapp' ? <WhatsAppIcon /> : <InstagramIcon />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? 'Desactivar' : 'Activar'} chatbots no ${label}`}
        disabled={busy}
        onClick={onToggle}
        className={
          enabled
            ? 'relative h-7 w-12 shrink-0 rounded-full bg-brand-primary transition-colors disabled:opacity-60'
            : 'relative h-7 w-12 shrink-0 rounded-full bg-border transition-colors disabled:opacity-60'
        }
      >
        <span
          className={
            enabled
              ? 'absolute top-0.5 left-6 h-6 w-6 rounded-full bg-white shadow-sm transition-all'
              : 'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all'
          }
        />
      </button>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.5A4.25 4.25 0 003.5 7.75v8.5A4.25 4.25 0 007.75 20.5h8.5a4.25 4.25 0 004.25-4.25v-8.5A4.25 4.25 0 0016.25 3.5h-8.5zm8.75 1.75a1.125 1.125 0 110 2.25 1.125 1.125 0 010-2.25zM12 7a5 5 0 110 10 5 5 0 010-10zm0 1.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
    </svg>
  );
}
