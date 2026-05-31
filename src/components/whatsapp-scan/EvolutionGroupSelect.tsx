'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

export type EvolutionGroupOption = {
  groupJid: string;
  title: string;
  kind: 'group' | 'channel';
};

export function EvolutionGroupSelect({
  valueJid,
  onChange,
  excludeJids,
  disabled,
  placeholder = 'Seleciona um grupo ou canal…',
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
          : 'Erro ao carregar grupos e canais da Evolution.',
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

  const { groups, channels } = useMemo(() => {
    const list = items.filter((g) => {
      if (!excludeJids?.size) return true;
      if (g.groupJid === valueJid) return true;
      return !excludeJids.has(g.groupJid);
    });
    if (
      valueJid &&
      /@(g\.us|newsletter)$/i.test(valueJid) &&
      !list.some((g) => g.groupJid === valueJid)
    ) {
      const kind = valueJid.endsWith('@newsletter') ? 'channel' : 'group';
      list.unshift({
        groupJid: valueJid,
        title: valueJid.replace(/@(g\.us|newsletter)$/i, '').slice(0, 20) + '…',
        kind,
      });
    }
    return {
      groups: list.filter((x) => x.kind === 'group'),
      channels: list.filter((x) => x.kind === 'channel'),
    };
  }, [items, excludeJids, valueJid]);

  const hasOptions = groups.length > 0 || channels.length > 0;

  const emptyLabel = loading
    ? 'A carregar…'
    : !hasLoaded
      ? 'Clica para carregar grupos e canais…'
      : placeholder;

  const showPendingValue =
    !hasLoaded &&
    !loading &&
    valueJid &&
    /@(g\.us|newsletter)$/i.test(valueJid);

  return (
    <div>
      <select
        value={valueJid}
        disabled={disabled || (loading && !hasLoaded)}
        onFocus={handleOpenSelector}
        onMouseDown={handleOpenSelector}
        onChange={(e) => {
          const g = [...groups, ...channels].find((x) => x.groupJid === e.target.value);
          if (g) onChange(g);
        }}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">{emptyLabel}</option>
        {showPendingValue ? (
          <option value={valueJid}>
            {valueJid.replace(/@(g\.us|newsletter)$/i, '').slice(0, 28)}…
          </option>
        ) : null}
        {groups.length > 0 ? (
          <optgroup label="Grupos">
            {groups.map((g) => (
              <option key={g.groupJid} value={g.groupJid}>
                {g.title}
              </option>
            ))}
          </optgroup>
        ) : null}
        {channels.length > 0 ? (
          <optgroup label="Canais">
            {channels.map((g) => (
              <option key={g.groupJid} value={g.groupJid}>
                {g.title}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {instance && hasLoaded && !loading ? (
        <span className="mt-1 block text-xs text-zinc-500">
          Grupos e canais da instância Evolution «{instance}».
        </span>
      ) : null}
      {!hasLoaded && !loading && !loadError ? (
        <span className="mt-1 block text-xs text-zinc-500">
          A lista só é pedida à Evolution quando abres o seletor.
        </span>
      ) : null}
      {loadError ? (
        <span className="mt-1 block text-xs text-red-600">{loadError}</span>
      ) : null}
      {hasLoaded && !loading && !loadError && !hasOptions ? (
        <span className="mt-1 block text-xs text-amber-700">
          Nenhum grupo ou canal disponível. Na Evolution, canais só aparecem após haver
          mensagens no histórico da instância.
        </span>
      ) : null}
    </div>
  );
}
