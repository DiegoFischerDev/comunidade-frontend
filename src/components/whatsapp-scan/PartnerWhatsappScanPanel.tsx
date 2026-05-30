'use client';

import { useCallback, useEffect, useState } from 'react';
import { WhatsappScanNumbersInput } from '@/components/whatsapp-scan/WhatsappScanNumbersInput';
import { api } from '@/lib/api';

type ScanGroup = {
  id: string;
  title: string | null;
  groupJid: string;
  monitoredNumbers: string[];
  active: boolean;
};

function groupLabel(g: ScanGroup): string {
  if (g.title?.trim()) return g.title.trim();
  const jid = g.groupJid.replace(/@g\.us$/i, '');
  return jid.length > 24 ? `${jid.slice(0, 24)}…` : jid;
}

export function PartnerWhatsappScanPanel() {
  const [groups, setGroups] = useState<ScanGroup[]>([]);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [numbersByGroupId, setNumbersByGroupId] = useState<Record<string, string[]>>({});
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);
  const [togglingAutomation, setTogglingAutomation] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.partner.whatsappScan.listGroups();
      setGroups(res.items);
      setAutomationEnabled(res.automationEnabled);
      const next: Record<string, string[]> = {};
      for (const g of res.items) {
        next[g.id] = [...g.monitoredNumbers];
      }
      setNumbersByGroupId(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar grupos de WhatsApp.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(''), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm text-zinc-600">A carregar importação WhatsApp…</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return null;
  }

  async function handleAutomationToggle(next: boolean) {
    setTogglingAutomation(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.partner.whatsappScan.setAutomation(next);
      setGroups(res.items);
      setAutomationEnabled(res.automationEnabled);
      const nums: Record<string, string[]> = {};
      for (const g of res.items) {
        nums[g.id] = [...g.monitoredNumbers];
      }
      setNumbersByGroupId(nums);
      setSuccess(
        next
          ? 'Importação automática ativada nos teus grupos.'
          : 'Importação automática desativada.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    } finally {
      setTogglingAutomation(false);
    }
  }

  async function saveGroupNumbers(groupId: string) {
    setSavingGroupId(groupId);
    setError('');
    setSuccess('');
    try {
      const updated = await api.partner.whatsappScan.updateGroup(groupId, {
        monitoredNumbers: numbersByGroupId[groupId] ?? [],
      });
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, ...updated } : g)),
      );
      setNumbersByGroupId((prev) => ({
        ...prev,
        [groupId]: [...updated.monitoredNumbers],
      }));
      setSuccess('Números monitorizados guardados.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar os números.');
    } finally {
      setSavingGroupId(null);
    }
  }

  const numbersDirty = (groupId: string) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return false;
    const current = numbersByGroupId[groupId] ?? [];
    if (current.length !== g.monitoredNumbers.length) return true;
    return current.some((n, i) => n !== g.monitoredNumbers[i]);
  };

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <svg
            className="h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-900">Importação WhatsApp</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Grupos monitorizados pela plataforma. Os anúncios identificados aparecem como imóveis
            ocultos na tua lista.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {groups.map((g) => (
          <li
            key={g.id}
            className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2 text-sm text-zinc-800"
          >
            <span className="font-medium">{groupLabel(g)}</span>
            {!g.active ? (
              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                Pausado
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-800">
          Quero que os imóveis postados nesses grupos venham automaticamente para a plataforma
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={automationEnabled}
          disabled={togglingAutomation}
          onClick={() => void handleAutomationToggle(!automationEnabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            automationEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              automationEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
          <span className="sr-only">
            {automationEnabled ? 'Desativar importação automática' : 'Ativar importação automática'}
          </span>
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {groups.map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <h3 className="text-sm font-semibold text-zinc-900">{groupLabel(g)}</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Números monitorizados (opcional). Vazio = todas as mensagens do grupo contam.
            </p>
            <div className="mt-2">
              <WhatsappScanNumbersInput
                variant="blue"
                value={numbersByGroupId[g.id] ?? []}
                onChange={(next) =>
                  setNumbersByGroupId((prev) => ({ ...prev, [g.id]: next }))
                }
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={savingGroupId === g.id || !numbersDirty(g.id)}
                onClick={() => void saveGroupNumbers(g.id)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingGroupId === g.id ? 'A guardar…' : 'Guardar números'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}
    </div>
  );
}
