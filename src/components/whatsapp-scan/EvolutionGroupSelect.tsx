'use client';

import { useEffect, useMemo, useState } from 'react';
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
}: {
  valueJid: string;
  onChange: (group: EvolutionGroupOption) => void;
  /** JIDs já monitorizados (não listados), exceto `valueJid` atual. */
  excludeJids?: Set<string>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [items, setItems] = useState<EvolutionGroupOption[]>([]);
  const [instance, setInstance] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    (async () => {
      try {
        const res = await api.admin.whatsappScan.listEvolutionGroups();
        if (!cancelled) {
          setItems(res.items);
          setInstance(res.instance);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error
              ? e.message
              : 'Erro ao carregar grupos e canais da Evolution.',
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div>
      <select
        value={valueJid}
        disabled={disabled || loading}
        onChange={(e) => {
          const g = [...groups, ...channels].find((x) => x.groupJid === e.target.value);
          if (g) onChange(g);
        }}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">
          {loading ? 'A carregar…' : placeholder}
        </option>
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
      {instance && !loading ? (
        <span className="mt-1 block text-xs text-zinc-500">
          Grupos e canais da instância Evolution «{instance}».
        </span>
      ) : null}
      {loadError ? (
        <span className="mt-1 block text-xs text-red-600">{loadError}</span>
      ) : null}
      {!loading && !loadError && !hasOptions ? (
        <span className="mt-1 block text-xs text-amber-700">
          Nenhum grupo ou canal disponível. Na Evolution, canais só aparecem após haver
          mensagens no histórico da instância.
        </span>
      ) : null}
    </div>
  );
}
