'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export type EvolutionGroupOption = {
  groupJid: string;
  title: string;
};

export function EvolutionGroupSelect({
  valueJid,
  onChange,
  excludeJids,
  disabled,
  placeholder = 'Seleciona um grupo…',
  listGroups,
}: {
  valueJid: string;
  onChange: (group: EvolutionGroupOption) => void;
  /** JIDs já monitorizados (não listados), exceto `valueJid` atual. */
  excludeJids?: Set<string>;
  disabled?: boolean;
  placeholder?: string;
  /** Por omissão usa grupos da instância Evolution (whatsapp-scan admin). */
  listGroups?: () => Promise<{ instance: string; items: EvolutionGroupOption[] }>;
}) {
  const [items, setItems] = useState<EvolutionGroupOption[]>([]);
  const [instance, setInstance] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const fetchInFlight = useRef(false);

  const loadGroups = useCallback(async () => {
    if (fetchInFlight.current || hasLoaded) return;
    fetchInFlight.current = true;
    setLoading(true);
    setLoadError('');
    try {
      const fetchGroups =
        listGroups ?? (() => api.admin.whatsappScan.listEvolutionGroups());
      const res = await fetchGroups();
      setItems(res.items);
      setInstance(res.instance);
      setHasLoaded(true);
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : 'Erro ao carregar grupos da Evolution.',
      );
      setItems([]);
    } finally {
      setLoading(false);
      fetchInFlight.current = false;
    }
  }, [hasLoaded, listGroups]);

  const handleOpenSelector = useCallback(() => {
    void loadGroups();
  }, [loadGroups]);

  const groups = useMemo(() => {
    const list = items.filter((g) => {
      if (!excludeJids?.size) return true;
      if (g.groupJid === valueJid) return true;
      return !excludeJids.has(g.groupJid);
    });
    if (
      valueJid &&
      /@g\.us$/i.test(valueJid) &&
      !list.some((g) => g.groupJid === valueJid)
    ) {
      list.unshift({
        groupJid: valueJid,
        title: valueJid.replace(/@g\.us$/i, '').slice(0, 20) + '…',
      });
    }
    return list;
  }, [items, excludeJids, valueJid]);

  const hasOptions = groups.length > 0;

  const emptyLabel = loading
    ? 'A carregar…'
    : !hasLoaded
      ? 'Clica para carregar grupos…'
      : placeholder;

  const showPendingValue =
    !hasLoaded && !loading && valueJid && /@g\.us$/i.test(valueJid);

  return (
    <div>
      <select
        value={valueJid}
        disabled={disabled || (loading && !hasLoaded)}
        onFocus={handleOpenSelector}
        onMouseDown={handleOpenSelector}
        onChange={(e) => {
          const g = groups.find((x) => x.groupJid === e.target.value);
          if (g) onChange(g);
        }}
        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">{emptyLabel}</option>
        {showPendingValue ? (
          <option value={valueJid}>
            {valueJid.replace(/@g\.us$/i, '').slice(0, 28)}…
          </option>
        ) : null}
        {groups.map((g) => (
          <option key={g.groupJid} value={g.groupJid}>
            {g.title}
          </option>
        ))}
      </select>
      {instance && hasLoaded && !loading ? (
        <span className="mt-1 block text-xs text-muted">
          Grupos da instância Evolution «{instance}».
        </span>
      ) : null}
      {!hasLoaded && !loading && !loadError ? (
        <span className="mt-1 block text-xs text-muted">
          A lista só é pedida à Evolution quando abres o seletor.
        </span>
      ) : null}
      {loadError ? (
        <span className="mt-1 block text-xs text-red-600">{loadError}</span>
      ) : null}
      {hasLoaded && !loading && !loadError && !hasOptions ? (
        <span className="mt-1 block text-xs text-brand-primary">
          Nenhum grupo disponível na instância Evolution.
        </span>
      ) : null}
    </div>
  );
}
