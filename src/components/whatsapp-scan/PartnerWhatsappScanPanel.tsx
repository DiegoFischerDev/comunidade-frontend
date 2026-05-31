'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type ScanGroup = {
  id: string;
  title: string | null;
  groupJid: string;
  monitoredNumbers: string[];
  monitorAllMembers: boolean;
  active: boolean;
};

type GroupDraft = {
  active: boolean;
  allMembers: boolean;
  pool: string[];
  checked: Set<string>;
};

function groupLabel(g: ScanGroup): string {
  if (g.title?.trim()) return g.title.trim();
  const jid = g.groupJid.replace(/@g\.us$/i, '');
  return jid.length > 28 ? `${jid.slice(0, 28)}…` : jid;
}

function parsePhone(raw: string): string {
  return raw.replace(/\D+/g, '');
}

function draftFromGroup(g: ScanGroup): GroupDraft {
  return {
    active: g.active,
    allMembers: g.monitorAllMembers,
    pool: [...g.monitoredNumbers],
    checked: new Set(g.monitoredNumbers),
  };
}

function payloadFromDraft(d: GroupDraft): {
  active: boolean;
  monitorAllMembers: boolean;
  monitoredNumbers: string[];
} {
  if (d.allMembers) {
    return {
      active: d.active,
      monitorAllMembers: true,
      monitoredNumbers: [],
    };
  }
  return {
    active: d.active,
    monitorAllMembers: false,
    monitoredNumbers: [...d.checked],
  };
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-emerald-600' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ConfigModal({
  groups,
  drafts,
  busy,
  error,
  contactNames,
  onClose,
  onApplyDraft,
  addNumber,
}: {
  groups: ScanGroup[];
  drafts: Record<string, GroupDraft>;
  busy: boolean;
  error: string;
  contactNames: Record<string, string | null>;
  onClose: () => void;
  onApplyDraft: (groupId: string, next: GroupDraft) => void;
  addNumber: (groupId: string, raw: string) => void;
}) {
  const [addDraft, setAddDraft] = useState<Record<string, string>>({});

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-scan-modal-title"
    >
      <div className="flex max-h-[min(92vh,640px)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 id="wa-scan-modal-title" className="text-lg font-semibold text-zinc-900">
              Grupos WhatsApp
            </h2>
            <p className="mt-0.5 text-sm text-zinc-600">
              Ativa os grupos e escolhe quais usuarios publicam imoveis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Fechar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {groups.map((g) => {
              const d = drafts[g.id];
              if (!d) return null;

              return (
                <section
                  key={g.id}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50"
                >
                  <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">
                      {groupLabel(g)}
                    </p>
                    <ToggleSwitch
                      checked={d.active}
                      disabled={busy}
                      label={`Ativar grupo ${groupLabel(g)}`}
                      onChange={(next) =>
                        onApplyDraft(g.id, { ...d, active: next })
                      }
                    />
                  </div>

                  {d.active ? (
                    <div className="space-y-3 border-t border-zinc-200 px-4 py-3">
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={d.allMembers}
                          disabled={busy}
                          onChange={(e) => {
                            const allMembers = e.target.checked;
                            onApplyDraft(g.id, {
                              ...d,
                              allMembers,
                              checked: allMembers ? new Set() : d.checked,
                            });
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-zinc-800">
                          Todos os membros do grupo
                        </span>
                      </label>

                      {!d.allMembers ? (
                        <>
                          {d.pool.length > 0 ? (
                            <ul className="space-y-0.5 rounded-lg border border-zinc-200 bg-white">
                              {d.pool.map((n) => (
                                <li key={n}>
                                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-50">
                                    <input
                                      type="checkbox"
                                      checked={d.checked.has(n)}
                                      disabled={busy}
                                      onChange={(e) => {
                                        const checked = new Set(d.checked);
                                        if (e.target.checked) checked.add(n);
                                        else checked.delete(n);
                                        onApplyDraft(g.id, {
                                          ...d,
                                          allMembers: false,
                                          checked,
                                        });
                                      }}
                                      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="font-mono text-sm tabular-nums text-zinc-800">
                                        +{n}
                                      </span>
                                      {contactNames[n] ? (
                                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                                          {contactNames[n]}
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-zinc-500">
                              Adiciona números abaixo ou marca «Todos os membros do grupo».
                            </p>
                          )}

                          <div className="flex gap-2">
                            <input
                              value={addDraft[g.id] ?? ''}
                              onChange={(e) =>
                                setAddDraft((prev) => ({
                                  ...prev,
                                  [g.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addNumber(g.id, addDraft[g.id] ?? '');
                                  setAddDraft((prev) => ({ ...prev, [g.id]: '' }));
                                }
                              }}
                              disabled={busy}
                              inputMode="numeric"
                              placeholder="Número com indicativo"
                              className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              disabled={busy || !(addDraft[g.id] ?? '').trim()}
                              onClick={() => {
                                addNumber(g.id, addDraft[g.id] ?? '');
                                setAddDraft((prev) => ({ ...prev, [g.id]: '' }));
                              }}
                              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Adicionar
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-emerald-700">
                          A monitorizar mensagens de todos os participantes deste grupo.
                        </p>
                      )}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
          <p className="text-xs leading-relaxed text-zinc-500">
            Os anúncios de imóveis publicados no grupo pelos utilizadores que selecionares serão
            analisados por inteligência artificial e importados automaticamente para a plataforma
          </p>
        </div>
      </div>
    </div>
  );
}

export function PartnerWhatsappScanPanel() {
  const [groups, setGroups] = useState<ScanGroup[]>([]);
  const [importEnabled, setImportEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, GroupDraft>>({});
  const [contactNames, setContactNames] = useState<Record<string, string | null>>(
    {},
  );
  const contactNamesRequested = useRef<Set<string>>(new Set());

  const resolveContactName = useCallback(async (digits: string) => {
    const key = digits.replace(/\D/g, '');
    if (key.length < 8) return;
    if (contactNamesRequested.current.has(key)) return;
    contactNamesRequested.current.add(key);
    try {
      const res = await api.partner.whatsappScan.contactDisplayName(key);
      setContactNames((prev) => ({ ...prev, [key]: res.displayName }));
    } catch {
      setContactNames((prev) => ({ ...prev, [key]: null }));
    }
  }, []);

  const syncFromServer = useCallback((items: ScanGroup[]) => {
    setGroups(items);
    const next: Record<string, GroupDraft> = {};
    for (const g of items) {
      next[g.id] = draftFromGroup(g);
    }
    setDrafts(next);
    setImportEnabled(items.some((g) => g.active));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.partner.whatsappScan.listGroups();
      syncFromServer(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [syncFromServer]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    const nums = new Set<string>();
    for (const g of groups) {
      const d = drafts[g.id];
      if (d) for (const n of d.pool) nums.add(n);
    }
    for (const n of nums) void resolveContactName(n);
  }, [modalOpen, groups, drafts, resolveContactName]);

  const persistGroup = useCallback(async (groupId: string, draft: GroupDraft) => {
    if (draft.active && !draft.allMembers && draft.checked.size === 0) {
      setError('Seleciona números ou marca «Todos os membros do grupo».');
      return false;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await api.partner.whatsappScan.updateGroup(
        groupId,
        payloadFromDraft(draft),
      );
      setGroups((prev) => {
        const items = prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                active: updated.active,
                monitoredNumbers: updated.monitoredNumbers,
                monitorAllMembers: updated.monitorAllMembers,
              }
            : g,
        );
        setImportEnabled(items.some((g) => g.active));
        setDrafts((d) => ({
          ...d,
          [groupId]: draftFromGroup(items.find((x) => x.id === groupId)!),
        }));
        return items;
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const applyDraft = useCallback(
    async (groupId: string, next: GroupDraft) => {
      setDrafts((prev) => ({ ...prev, [groupId]: next }));
      await persistGroup(groupId, next);
    },
    [persistGroup],
  );

  const addNumberToGroup = useCallback(
    async (groupId: string, raw: string) => {
      const n = parsePhone(raw);
      if (!n) return;
      const cur = drafts[groupId];
      if (!cur) return;
      const pool = cur.pool.includes(n) ? cur.pool : [...cur.pool, n];
      const checked = new Set(cur.checked);
      checked.add(n);
      const next: GroupDraft = {
        ...cur,
        pool,
        checked,
        allMembers: false,
        active: true,
      };
      await applyDraft(groupId, next);
      void resolveContactName(n);
    },
    [drafts, applyDraft, resolveContactName],
  );

  async function handleMainToggle(next: boolean) {
    if (!next) {
      setModalOpen(false);
      setBusy(true);
      setError('');
      try {
        const res = await api.partner.whatsappScan.setAutomation(false);
        syncFromServer(res.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível desativar.');
      } finally {
        setBusy(false);
      }
      return;
    }

    setImportEnabled(true);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setImportEnabled(groups.some((g) => g.active));
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <p className="text-sm text-zinc-500">A carregar importação WhatsApp…</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return null;
  }

  const mainToggleOn = importEnabled || modalOpen;
  const activeGroups = groups.filter((g) => g.active);

  return (
    <>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <WhatsappIcon className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="min-w-0 flex-1 cursor-pointer text-left"
          >
            <p className="text-sm font-semibold text-zinc-900">Importação WhatsApp</p>
            <p className="text-xs text-zinc-600 sm:text-sm">
              Quero importar os imóveis do meu grupo automaticamente
            </p>
            {activeGroups.length > 0 ? (
              <div className="mt-1.5">
                <p className="text-[11px] font-medium text-zinc-500">
                  Grupos ativos
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {activeGroups.map((g) => (
                    <li
                      key={g.id}
                      className="max-w-full truncate rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/70"
                      title={g.groupJid}
                    >
                      {groupLabel(g)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : importEnabled && !modalOpen ? (
              <span className="mt-1 inline-block text-xs font-medium text-emerald-700">
                Configurar grupos
              </span>
            ) : null}
          </button>
          <ToggleSwitch
            checked={mainToggleOn}
            disabled={busy}
            label="Importação automática WhatsApp"
            onChange={(next) => void handleMainToggle(next)}
          />
        </div>
        {error && !modalOpen ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : null}
      </div>

      {modalOpen ? (
        <ConfigModal
          groups={groups}
          drafts={drafts}
          busy={busy}
          error={error}
          contactNames={contactNames}
          onClose={handleCloseModal}
          onApplyDraft={(id, next) => void applyDraft(id, next)}
          addNumber={(id, raw) => void addNumberToGroup(id, raw)}
        />
      ) : null}
    </>
  );
}
