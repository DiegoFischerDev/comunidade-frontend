'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export type EvolutionGroupOption = { groupJid: string; title: string };

export function EvolutionGroupSelect({
  valueJid,
  onChange,
  excludeJids,
  disabled,
  placeholder = 'Seleciona um grupo…',
}: {
  valueJid: string;
  onChange: (group: EvolutionGroupOption) => void;
  /** JIDs já monitorizados (não listados), exceto `valueJid` atual. */
  excludeJids?: Set<string>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [groups, setGroups] = useState<EvolutionGroupOption[]>([]);
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
          setGroups(res.items);
          setInstance(res.instance);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : 'Erro ao carregar grupos da Evolution.',
          );
          setGroups([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const list = groups.filter((g) => {
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
  }, [groups, excludeJids, valueJid]);

  return (
    <div>
      <select
        value={valueJid}
        disabled={disabled || loading}
        onChange={(e) => {
          const g = options.find((x) => x.groupJid === e.target.value);
          if (g) onChange(g);
        }}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">
          {loading ? 'A carregar grupos…' : placeholder}
        </option>
        {options.map((g) => (
          <option key={g.groupJid} value={g.groupJid}>
            {g.title}
          </option>
        ))}
      </select>
      {instance && !loading ? (
        <span className="mt-1 block text-xs text-zinc-500">
          Grupos da instância Evolution «{instance}».
        </span>
      ) : null}
      {loadError ? (
        <span className="mt-1 block text-xs text-red-600">{loadError}</span>
      ) : null}
      {!loading && !loadError && options.length === 0 ? (
        <span className="mt-1 block text-xs text-amber-700">
          Nenhum grupo disponível (verifica a ligação da instância na Evolution).
        </span>
      ) : null}
    </div>
  );
}
