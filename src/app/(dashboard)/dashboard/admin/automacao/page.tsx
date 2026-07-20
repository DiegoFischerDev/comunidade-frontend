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
import { CardButton } from '@/components/ui/CardButton';
import { ADMIN_FROM_ME_AUTOMATIONS } from '@/lib/admin-from-me-automations';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';

type DraftStep = {
  key: string;
  type: WhatsappClientAutomationStepType;
  textContent: string;
  mediaUrl: string;
  mediaMimeType: string;
  mediaFileName: string;
  /** Pausa após o passo, em segundos (enviada à API em ms). */
  delaySeconds: number;
  uploading?: boolean;
};

const inputClass =
  'mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25';

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
    delaySeconds: 1,
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
    delaySeconds: Math.max(0, Math.round(s.delayMsAfter / 100) / 10),
  }));
}

function draftToPayload(steps: DraftStep[]): WhatsappClientAutomationStepInput[] {
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
      mediaMimeType: s.mediaMimeType || undefined,
      mediaFileName: s.mediaFileName || undefined,
      caption: s.type === 'IMAGE' ? s.textContent.trim() || undefined : undefined,
      delayMsAfter,
    };
  });
}

function stepTypeLabel(type: WhatsappClientAutomationStepType): string {
  if (type === 'AUDIO') return 'Áudio';
  if (type === 'IMAGE') return 'Imagem';
  return 'Texto';
}

function mediaHref(url: string): string {
  if (url.startsWith('/brand/')) return url;
  return resolveUploadsUrl(url);
}

export default function AdminAutomacaoPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';

  const [items, setItems] = useState<WhatsappClientAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [active, setActive] = useState(true);
  const [steps, setSteps] = useState<DraftStep[]>([emptyDraftStep('TEXT')]);

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.whatsappAutomations.list();
      setItems(res.items);
    } catch (err) {
      setError(getUserFacingApiError(err, { context: 'Ao carregar automações' }));
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setError('');
    setSuccess('');
    setEditingId(null);
    setName('');
    setTriggerPhrase('');
    setActive(true);
    setSteps([emptyDraftStep('TEXT')]);
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
      a.steps.length ? automationToDraftSteps(a) : [emptyDraftStep('TEXT')],
    );
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
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
    setSteps((prev) =>
      prev.length <= 1 ? prev : prev.filter((s) => s.key !== key),
    );
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
    } catch (err) {
      updateStep(key, { uploading: false });
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
    for (const [i, s] of steps.entries()) {
      if (s.type === 'TEXT' && !s.textContent.trim()) {
        setError(`Passo ${i + 1}: escreve o texto.`);
        return;
      }
      if ((s.type === 'AUDIO' || s.type === 'IMAGE') && !s.mediaUrl.trim()) {
        setError(`Passo ${i + 1}: faz upload do ficheiro ou indica a URL.`);
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
          <h1 className="text-2xl font-semibold text-foreground">Automação WhatsApp</h1>
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

      {/* Automações fixas */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">
          Automações fixas
        </h2>
        <p className="mt-1 text-sm text-muted">
          Lista fixa — novas entradas só por alterações de código no backend.
        </p>

        {/* Mobile: cards */}
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

        {/* Desktop: tabela */}
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
            {/* Mobile: cards */}
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
                      {a.steps.map((s) => stepTypeLabel(s.type)).join(' → ')}
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

            {/* Desktop: tabela */}
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
                        {a.steps.map((s) => stepTypeLabel(s.type)).join(' → ')}
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

      {/* Modal criar / editar */}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Sequência de resposta
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['TEXT', 'AUDIO', 'IMAGE'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setSteps((prev) => [...prev, emptyDraftStep(t)])
                        }
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-page disabled:opacity-60"
                      >
                        + {stepTypeLabel(t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
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
                            disabled={saving || idx === 0}
                            className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(s.key, 1)}
                            disabled={saving || idx === steps.length - 1}
                            className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(s.key)}
                            disabled={saving || steps.length <= 1}
                            className="rounded-lg border border-red-200 bg-card px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-40"
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
                          rows={5}
                          className={`${inputClass} bg-card`}
                          placeholder="Texto da mensagem…"
                          disabled={saving}
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
                            disabled={saving || s.uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadForStep(s.key, file);
                              e.target.value = '';
                            }}
                            className="block w-full text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                          />
                          {s.uploading ? (
                            <p className="text-xs text-muted">A carregar…</p>
                          ) : null}
                          {s.mediaUrl ? (
                            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                              <p className="truncate text-xs text-muted">
                                {s.mediaFileName || s.mediaUrl}
                              </p>
                              {s.type === 'AUDIO' ? (
                                <audio
                                  key={s.mediaUrl}
                                  controls
                                  preload="metadata"
                                  className="w-full"
                                  src={mediaHref(s.mediaUrl)}
                                >
                                  O teu browser não reproduz este áudio.
                                </audio>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element -- preview admin de URL dinâmica (/uploads ou /brand)
                                <img
                                  key={s.mediaUrl}
                                  src={mediaHref(s.mediaUrl)}
                                  alt={s.mediaFileName || 'Pré-visualização'}
                                  className="max-h-56 w-full rounded-lg object-contain bg-page"
                                />
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted">
                              Ou cola URL / caminho{' '}
                              <code className="text-[10px]">/brand/…</code> ou{' '}
                              <code className="text-[10px]">/uploads/…</code>
                            </p>
                          )}
                          <input
                            value={s.mediaUrl}
                            onChange={(e) =>
                              updateStep(s.key, { mediaUrl: e.target.value })
                            }
                            className={`${inputClass} bg-card text-xs`}
                            placeholder="/uploads/… ou https://…"
                            disabled={saving}
                          />
                          {s.type === 'IMAGE' ? (
                            <input
                              value={s.textContent}
                              onChange={(e) =>
                                updateStep(s.key, {
                                  textContent: e.target.value,
                                })
                              }
                              className={`${inputClass} bg-card`}
                              placeholder="Legenda (opcional)"
                              disabled={saving}
                            />
                          ) : null}
                        </div>
                      )}

                      <label className="mt-2 block text-xs text-muted">
                        Pausa após este passo (segundos)
                        <input
                          type="number"
                          min={0}
                          max={30}
                          step={0.1}
                          value={s.delaySeconds}
                          onChange={(e) =>
                            updateStep(s.key, {
                              delaySeconds: Number(e.target.value) || 0,
                            })
                          }
                          className="mt-1 w-28 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                          disabled={saving}
                        />
                      </label>
                    </div>
                  ))}
                </div>
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
