'use client';

import { useCallback, useEffect, useState } from 'react';

import { EvolutionGroupSelect } from '@/components/whatsapp-scan/EvolutionGroupSelect';
import { WhatsappScanNumbersInput } from '@/components/whatsapp-scan/WhatsappScanNumbersInput';
import { api } from '@/lib/api';

type Config = Awaited<ReturnType<typeof api.admin.jobOffers.whatsapp.getConfig>>;

type MessageRow = Awaited<
  ReturnType<typeof api.admin.jobOffers.whatsapp.listMessages>
>['items'][number];

const STATUS_LABELS: Record<string, string> = {
  received: 'Recebida',
  ignored_sender: 'Remetente ignorado',
  ignored_not_offer: 'Não é oferta',
  created: 'Publicada',
  error: 'Erro',
};

export function JobOfferWhatsappConfigPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [sourceJid, setSourceJid] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [destJid, setDestJid] = useState('');
  const [destTitle, setDestTitle] = useState('');
  const [numbers, setNumbers] = useState<string[]>([]);
  const [active, setActive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cfg, msgs] = await Promise.all([
        api.admin.jobOffers.whatsapp.getConfig(),
        api.admin.jobOffers.whatsapp.listMessages(40),
      ]);
      setConfig(cfg);
      setMessages(msgs.items);
      setSourceJid(cfg.sourceGroupJid ?? '');
      setSourceTitle(cfg.sourceTitle ?? '');
      setDestJid(cfg.destGroupJid ?? '');
      setDestTitle(cfg.destTitle ?? '');
      setNumbers(cfg.monitoredNumbers);
      setActive(cfg.active);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configuração.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.admin.jobOffers.whatsapp.updateConfig({
        sourceGroupJid: sourceJid.trim() || null,
        sourceTitle: sourceTitle.trim() || null,
        destGroupJid: destJid.trim() || null,
        destTitle: destTitle.trim() || null,
        monitoredNumbers: numbers,
        active,
      });
      setConfig(updated);
      setSuccess('Configuração guardada.');
      const msgs = await api.admin.jobOffers.whatsapp.listMessages(40);
      setMessages(msgs.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }, [sourceJid, sourceTitle, destJid, destTitle, numbers, active]);

  const automationHint =
    config?.automationReady && active
      ? 'Automação ativa — mensagens no grupo de origem são analisadas e, se forem vagas, publicadas no site e no grupo de destino.'
      : active
        ? 'Ativa, mas falta definir grupo de origem e de destino.'
        : 'Desativada — as mensagens do grupo de origem não são processadas.';

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Configuração WhatsApp
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
            Monitoriza um grupo de origem com IA. Ofertas de trabalho identificadas
            entram na lista desta página e são republicadas no grupo de destino.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Atualizar
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">A carregar…</p>
      ) : (
        <>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="font-medium text-zinc-800">Automação ativa</span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">{automationHint}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Grupo ou canal WhatsApp (origem)
              </span>
              <EvolutionGroupSelect
                valueJid={sourceJid}
                disabled={saving}
                listGroups={() => api.admin.jobOffers.whatsapp.listEvolutionGroups()}
                onChange={(g) => {
                  setSourceJid(g.groupJid);
                  setSourceTitle(g.title);
                }}
              />
            </label>
            <label className="text-sm sm:col-span-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Grupo ou canal WhatsApp (destino)
              </span>
              <EvolutionGroupSelect
                valueJid={destJid}
                disabled={saving}
                listGroups={() => api.admin.jobOffers.whatsapp.listEvolutionGroups()}
                onChange={(g) => {
                  setDestJid(g.groupJid);
                  setDestTitle(g.title);
                }}
              />
            </label>
            <div className="text-sm sm:col-span-2">
              <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Números monitorizados (opcional)
              </span>
              <WhatsappScanNumbersInput value={numbers} onChange={setNumbers} />
              <span className="mt-1 block text-xs text-zinc-500">
                Lista vazia = monitoriza todas as mensagens do grupo de origem.
              </span>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? 'A guardar…' : 'Guardar configuração'}
            </button>
          </div>

          {messages.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Últimas mensagens processadas
              </h3>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                  >
                    <span className="font-medium text-zinc-800">
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                    {m.createdJobOfferId ? (
                      <span className="ml-2 text-emerald-700">· oferta criada</span>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-zinc-600">{m.rawText}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
