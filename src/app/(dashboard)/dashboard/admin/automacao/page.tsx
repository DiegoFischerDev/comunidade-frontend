'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  getUserFacingApiError,
  type WhatsappClientAutomation,
  type WhatsappClientAutomationStepInput,
  type WhatsappClientAutomationStepType,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { ADMIN_FROM_ME_AUTOMATIONS } from '@/lib/admin-from-me-automations';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';
import { SITE_ATENDIMENTO_WHATSAPP_MESSAGE, BRAND_WELCOME_AUDIO } from '@/lib/site-branding';

type DraftStep = {
  key: string;
  type: WhatsappClientAutomationStepType;
  textContent: string;
  mediaUrl: string;
  mediaMimeType: string;
  mediaFileName: string;
  delayMsAfter: number;
  uploading?: boolean;
};

const WELCOME_QUESTIONNAIRE_TEXT = `Para conhecermos melhor o seu momento, peço que responda às perguntas abaixo:

1️⃣ Vocês estão atualmente no Brasil ou em Portugal?

2️⃣ Caso ainda estejam no Brasil, já possuem o visto ou outro documento que permita a residência em Portugal? Se sim, qual?

3️⃣ Já possuem NIF português?

4️⃣ Para quantas pessoas será o imóvel? (Adultos e crianças.)

5️⃣ Em qual cidade ou região procuram um imóvel?

6️⃣ Quando pretendem se mudar para o imóvel?
(Ex.: imediatamente, em até 30 dias, 60 dias, 90 dias ou apenas futuramente.)

7️⃣ Qual o tipo de imóvel desejado? (T0, T1, T2, T3…)

8️⃣ Qual é a faixa de orçamento mensal para a renda (aluguel)?

📌 Uma informação importante: em Portugal, é muito comum que os proprietários solicitem, no momento da assinatura do contrato, o pagamento da primeira renda e duas cauções. Por isso, é importante que essa reserva financeira já esteja planejada.

Assim que recebermos as respostas, verificaremos se o perfil já está pronto para iniciarmos o processo e entraremos em contato para agendar a reunião ✨😊`;

function newStepKey() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDraftStep(
  type: WhatsappClientAutomationStepType = 'TEXT',
): DraftStep {
  return {
    key: newStepKey(),
    type,
    textContent: '',
    mediaUrl: '',
    mediaMimeType: '',
    mediaFileName: '',
    delayMsAfter: 650,
  };
}

function automationToDraftSteps(a: WhatsappClientAutomation): DraftStep[] {
  return a.steps.map((s) => ({
    key: s.id,
    type: s.type,
    textContent: s.textContent ?? '',
    mediaUrl: s.mediaUrl ?? '',
    mediaMimeType: s.mediaMimeType ?? '',
    mediaFileName: s.mediaFileName ?? '',
    delayMsAfter: s.delayMsAfter,
  }));
}

function draftToPayload(steps: DraftStep[]): WhatsappClientAutomationStepInput[] {
  return steps.map((s) => {
    if (s.type === 'TEXT') {
      return {
        type: 'TEXT',
        textContent: s.textContent.trim(),
        delayMsAfter: s.delayMsAfter,
      };
    }
    return {
      type: s.type,
      mediaUrl: s.mediaUrl.trim(),
      mediaMimeType: s.mediaMimeType || undefined,
      mediaFileName: s.mediaFileName || undefined,
      caption: s.type === 'IMAGE' ? s.textContent.trim() || undefined : undefined,
      delayMsAfter: s.delayMsAfter,
    };
  });
}

function stepTypeLabel(type: WhatsappClientAutomationStepType): string {
  if (type === 'AUDIO') return 'Áudio (nota de voz)';
  if (type === 'IMAGE') return 'Imagem';
  return 'Texto';
}

export default function AdminAutomacaoPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [items, setItems] = useState<WhatsappClientAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [active, setActive] = useState(true);
  const [steps, setSteps] = useState<DraftStep[]>([emptyDraftStep('TEXT')]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.whatsappAutomations.list();
      setItems(res.items);
    } catch (err) {
      toast.error(getUserFacingApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  function openCreate() {
    setEditingId(null);
    setName('');
    setTriggerPhrase(SITE_ATENDIMENTO_WHATSAPP_MESSAGE);
    setActive(true);
    setSteps([emptyDraftStep('AUDIO'), emptyDraftStep('TEXT')]);
    setEditorOpen(true);
  }

  function openCreateWelcomePreset() {
    setEditingId(null);
    setName('Boas-vindas site (Carol)');
    setTriggerPhrase(SITE_ATENDIMENTO_WHATSAPP_MESSAGE);
    setActive(true);
    setSteps([
      {
        ...emptyDraftStep('AUDIO'),
        mediaUrl: BRAND_WELCOME_AUDIO,
        mediaMimeType: 'audio/ogg',
        mediaFileName: 'wellcome-carol.ogg',
      },
      {
        ...emptyDraftStep('TEXT'),
        textContent: WELCOME_QUESTIONNAIRE_TEXT,
      },
    ]);
    setEditorOpen(true);
  }

  function openEdit(a: WhatsappClientAutomation) {
    setEditingId(a.id);
    setName(a.name);
    setTriggerPhrase(a.triggerPhrase);
    setActive(a.active);
    setSteps(
      a.steps.length ? automationToDraftSteps(a) : [emptyDraftStep('TEXT')],
    );
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
  }

  function updateStep(key: string, patch: Partial<DraftStep>) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  }

  function moveStep(key: string, dir: -1 | 1) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx]!;
      copy[idx] = copy[next]!;
      copy[next] = tmp;
      return copy;
    });
  }

  function removeStep(key: string) {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)));
  }

  async function uploadForStep(key: string, file: File) {
    updateStep(key, { uploading: true });
    try {
      const { url } = await api.uploads.post(file);
      updateStep(key, {
        mediaUrl: url,
        mediaMimeType: file.type || '',
        mediaFileName: file.name,
        uploading: false,
      });
      toast.success('Ficheiro carregado.');
    } catch (err) {
      updateStep(key, { uploading: false });
      toast.error(getUserFacingApiError(err));
    }
  }

  async function save() {
    const trimmedName = name.trim();
    const trimmedTrigger = triggerPhrase.trim();
    if (trimmedName.length < 2) {
      toast.error('Indica um nome para a automação.');
      return;
    }
    if (trimmedTrigger.length < 20) {
      toast.error('A frase-gatilho deve ter pelo menos 20 caracteres.');
      return;
    }
    for (const [i, s] of steps.entries()) {
      if (s.type === 'TEXT' && !s.textContent.trim()) {
        toast.error(`Passo ${i + 1}: escreve o texto.`);
        return;
      }
      if ((s.type === 'AUDIO' || s.type === 'IMAGE') && !s.mediaUrl.trim()) {
        toast.error(`Passo ${i + 1}: faz upload do ficheiro ou indica a URL.`);
        return;
      }
    }

    setSaving(true);
    try {
      const body = {
        name: trimmedName,
        triggerPhrase: trimmedTrigger,
        active,
        steps: draftToPayload(steps),
      };
      if (editingId) {
        await api.admin.whatsappAutomations.update(editingId, body);
        toast.success('Automação atualizada.');
      } else {
        await api.admin.whatsappAutomations.create(body);
        toast.success('Automação criada.');
      }
      closeEditor();
      await load();
    } catch (err) {
      toast.error(getUserFacingApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: WhatsappClientAutomation) {
    try {
      await api.admin.whatsappAutomations.update(a.id, { active: !a.active });
      await load();
    } catch (err) {
      toast.error(getUserFacingApiError(err));
    }
  }

  async function removeAutomation(a: WhatsappClientAutomation) {
    if (!window.confirm(`Apagar a automação «${a.name}»?`)) return;
    try {
      await api.admin.whatsappAutomations.remove(a.id);
      toast.success('Automação apagada.');
      await load();
    } catch (err) {
      toast.error(getUserFacingApiError(err));
    }
  }

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automação</h1>
        <p className="mt-2 text-sm text-muted">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automação WhatsApp</h1>
        <p className="mt-2 text-sm text-muted">
          Automações disparadas por ti (código) e fluxos configuráveis quando o cliente
          escreve uma frase. Match: a mensagem <strong>contém</strong> o gatilho. Máximo{' '}
          <strong>1× por contacto / 24h</strong> por automação. Áudio é enviado como nota
          de voz (PTT).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Automações disparadas por mim
        </h2>
        <p className="text-sm text-muted">
          Lista fixa — novas entradas desta secção só por alterações de código no
          backend.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-page text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3">Nome</th>
                <th className="px-3 py-3">Gatilho</th>
                <th className="px-3 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_FROM_ME_AUTOMATIONS.map((row) => (
                <tr key={row.name} className="border-t border-border align-top">
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {row.name}
                    {row.notes ? (
                      <p className="mt-1 text-xs font-normal text-muted">{row.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-foreground">
                    <code className="rounded bg-page px-1.5 py-0.5 text-xs">
                      {row.trigger}
                    </code>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Automações disparadas pelos clientes
            </h2>
            <p className="mt-1 text-sm text-muted">
              Cria fluxos com gatilho (frase) e sequência de respostas (texto, áudio ou
              imagem).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateWelcomePreset}
              className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-page"
            >
              Prefill boas-vindas
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="cursor-pointer rounded-full bg-brand-primary px-3 py-1.5 text-xs font-medium text-brand-on-primary"
            >
              Nova automação
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted">A carregar…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">
            Ainda não há automações. Usa «Prefill boas-vindas» para criar o fluxo do site
            (áudio Carol + questionário).
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{a.name}</p>
                      <span
                        className={
                          a.active
                            ? 'rounded-full bg-brand-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary'
                            : 'rounded-full bg-page px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted'
                        }
                      >
                        {a.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Gatilho (contém):{' '}
                      <span className="text-foreground">{a.triggerPhrase}</span>
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {a.steps.length} passo
                      {a.steps.length === 1 ? '' : 's'}:{' '}
                      {a.steps.map((s) => stepTypeLabel(s.type)).join(' → ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleActive(a)}
                      className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-page"
                    >
                      {a.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-page"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeAutomation(a)}
                      className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium text-red-600 hover:bg-page"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? 'Editar automação' : 'Nova automação'}
            </h3>

            <div className="mt-4 space-y-4">
              <label className="block text-xs font-medium text-foreground/90">
                Nome
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                  placeholder="Ex.: Boas-vindas site"
                />
              </label>

              <label className="block text-xs font-medium text-foreground/90">
                Frase-gatilho (a mensagem do cliente deve conter este texto)
                <textarea
                  value={triggerPhrase}
                  onChange={(e) => setTriggerPhrase(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-border"
                />
                Ativa
              </label>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Sequência de resposta
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['TEXT', 'AUDIO', 'IMAGE'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setSteps((prev) => [...prev, emptyDraftStep(t)])
                        }
                        className="cursor-pointer rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-page"
                      >
                        + {stepTypeLabel(t)}
                      </button>
                    ))}
                  </div>
                </div>

                {steps.map((s, idx) => (
                  <div
                    key={s.key}
                    className="rounded-xl border border-border bg-page p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Passo {idx + 1} · {stepTypeLabel(s.type)}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(s.key, -1)}
                          disabled={idx === 0}
                          className="cursor-pointer rounded border border-border px-2 py-0.5 text-xs disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(s.key, 1)}
                          disabled={idx === steps.length - 1}
                          className="cursor-pointer rounded border border-border px-2 py-0.5 text-xs disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(s.key)}
                          disabled={steps.length <= 1}
                          className="cursor-pointer rounded border border-border px-2 py-0.5 text-xs text-red-600 disabled:opacity-40"
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    {s.type === 'TEXT' ? (
                      <textarea
                        value={s.textContent}
                        onChange={(e) =>
                          updateStep(s.key, { textContent: e.target.value })
                        }
                        rows={6}
                        className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                        placeholder="Texto da mensagem…"
                      />
                    ) : (
                      <div className="mt-2 space-y-2">
                        <input
                          type="file"
                          accept={
                            s.type === 'AUDIO'
                              ? 'audio/ogg,audio/opus,audio/mpeg,audio/mp4,audio/*'
                              : 'image/jpeg,image/png,image/webp,image/*'
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadForStep(s.key, file);
                            e.target.value = '';
                          }}
                          className="block w-full text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-on-primary"
                        />
                        {s.uploading ? (
                          <p className="text-xs text-muted">A carregar…</p>
                        ) : null}
                        {s.mediaUrl ? (
                          <p className="break-all text-xs text-muted">
                            Ficheiro:{' '}
                            <a
                              href={
                                s.mediaUrl.startsWith('/brand/')
                                  ? s.mediaUrl
                                  : resolveUploadsUrl(s.mediaUrl)
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-primary underline-offset-2 hover:underline"
                            >
                              {s.mediaFileName || s.mediaUrl}
                            </a>
                          </p>
                        ) : (
                          <p className="text-xs text-muted">
                            Ou cola uma URL pública / caminho{' '}
                            <code className="text-[10px]">/brand/…</code> ou{' '}
                            <code className="text-[10px]">/uploads/…</code>
                          </p>
                        )}
                        <input
                          value={s.mediaUrl}
                          onChange={(e) =>
                            updateStep(s.key, { mediaUrl: e.target.value })
                          }
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                          placeholder="/uploads/… ou https://…"
                        />
                        {s.type === 'IMAGE' ? (
                          <input
                            value={s.textContent}
                            onChange={(e) =>
                              updateStep(s.key, { textContent: e.target.value })
                            }
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                            placeholder="Legenda (opcional)"
                          />
                        ) : null}
                      </div>
                    )}

                    <label className="mt-2 block text-[11px] text-muted">
                      Pausa após este passo (ms)
                      <input
                        type="number"
                        min={0}
                        max={30000}
                        value={s.delayMsAfter}
                        onChange={(e) =>
                          updateStep(s.key, {
                            delayMsAfter: Number(e.target.value) || 0,
                          })
                        }
                        className="mt-1 w-28 rounded-lg border border-border bg-card px-2 py-1 text-sm text-foreground"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-page"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="cursor-pointer rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-brand-on-primary disabled:opacity-60"
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
