'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { EvolutionGroupSelect } from '@/components/whatsapp-scan/EvolutionGroupSelect';
import { MonitoredUsersCell } from '@/components/whatsapp-scan/MonitoredUsersCell';
import { WhatsappScanNumbersInput } from '@/components/whatsapp-scan/WhatsappScanNumbersInput';
import { api } from '@/lib/api';
import {
  JOB_OFFER_REGION_LABELS,
  type JobOfferRegion,
} from '@/lib/job-offer-regions';

type ScanRow = Awaited<
  ReturnType<typeof api.admin.jobOffers.whatsapp.listScans>
>['items'][number];

type DestinationRow = Awaited<
  ReturnType<typeof api.admin.jobOffers.whatsapp.listDestinations>
>['items'][number];

const REGIONS: JobOfferRegion[] = ['NORTE', 'CENTRO', 'SUL'];

export function JobOfferWhatsappConfigPanel() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingScanId, setTogglingScanId] = useState<string | null>(null);
  const [savingDestRegion, setSavingDestRegion] = useState<JobOfferRegion | null>(
    null,
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formSourceJid, setFormSourceJid] = useState('');
  const [formSourceTitle, setFormSourceTitle] = useState('');
  const [formNumbers, setFormNumbers] = useState<string[]>([]);

  const [destJids, setDestJids] = useState<Record<JobOfferRegion, string>>({
    NORTE: '',
    CENTRO: '',
    SUL: '',
  });
  const [destTitles, setDestTitles] = useState<Record<JobOfferRegion, string>>({
    NORTE: '',
    CENTRO: '',
    SUL: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [scansRes, destRes] = await Promise.all([
        api.admin.jobOffers.whatsapp.listScans(),
        api.admin.jobOffers.whatsapp.listDestinations(),
      ]);
      setScans(scansRes.items);
      setDestinations(destRes.items);
      const jids: Record<JobOfferRegion, string> = {
        NORTE: '',
        CENTRO: '',
        SUL: '',
      };
      const titles: Record<JobOfferRegion, string> = {
        NORTE: '',
        CENTRO: '',
        SUL: '',
      };
      for (const d of destRes.items) {
        jids[d.region] = d.destGroupJid ?? '';
        titles[d.region] = d.destTitle ?? '';
      }
      setDestJids(jids);
      setDestTitles(titles);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configuração.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeScansCount = useMemo(
    () => scans.filter((s) => s.active).length,
    [scans],
  );

  const handleCreateScan = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!formSourceJid.trim()) {
      setError('Seleciona o grupo ou canal a monitorizar.');
      return;
    }
    setCreating(true);
    try {
      await api.admin.jobOffers.whatsapp.createScan({
        sourceGroupJid: formSourceJid.trim(),
        sourceTitle: formSourceTitle.trim() || undefined,
        monitoredNumbers: formNumbers,
      });
      setFormSourceJid('');
      setFormSourceTitle('');
      setFormNumbers([]);
      setSuccess('Grupo de scan adicionado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar grupo.');
    } finally {
      setCreating(false);
    }
  }, [formSourceJid, formSourceTitle, formNumbers, load]);

  const deleteScan = useCallback(
    async (id: string) => {
      if (!window.confirm('Remover este grupo de scan?')) return;
      setDeletingId(id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.deleteScan(id);
        setSuccess('Grupo de scan removido.');
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao remover.');
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

  const toggleScanActive = useCallback(
    async (row: ScanRow) => {
      setTogglingScanId(row.id);
      setError('');
      try {
        await api.admin.jobOffers.whatsapp.updateScan(row.id, {
          active: !row.active,
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao atualizar estado.');
      } finally {
        setTogglingScanId(null);
      }
    },
    [load],
  );

  const saveDestination = useCallback(
    async (region: JobOfferRegion) => {
      const jid = destJids[region].trim();
      if (!jid) {
        setError(`Seleciona o grupo WhatsApp para ${JOB_OFFER_REGION_LABELS[region]}.`);
        return;
      }
      setSavingDestRegion(region);
      setError('');
      setSuccess('');
      try {
        await api.admin.jobOffers.whatsapp.updateDestination(region, {
          destGroupJid: jid,
          destTitle: destTitles[region].trim() || undefined,
          active: true,
        });
        setSuccess(`Destino ${JOB_OFFER_REGION_LABELS[region]} guardado.`);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao guardar destino.');
      } finally {
        setSavingDestRegion(null);
      }
    },
    [destJids, destTitles, load],
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Configuração WhatsApp
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600">
            Adiciona grupos de origem para scan. As vagas válidas entram no site e
            são republicadas automaticamente no grupo fixo da região da cidade
            (Norte, Centro ou Sul).
          </p>
          {!loading && scans.length > 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              {activeScansCount === scans.length
                ? `${scans.length} grupo(s) de scan ativo(s)`
                : `${activeScansCount} de ${scans.length} grupo(s) de scan ativo(s)`}
            </p>
          ) : null}
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

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Grupos de destino (fixos)
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Três grupos — um por região. A distribuição é automática conforme a
          cidade da oferta.
        </p>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            {REGIONS.map((region) => {
              const saved = destinations.find((d) => d.region === region);
              const saving = savingDestRegion === region;
              return (
                <div
                  key={region}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900">
                      {JOB_OFFER_REGION_LABELS[region]}
                    </span>
                    {saved?.configured ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                        Configurado
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        Pendente
                      </span>
                    )}
                  </div>
                  <label className="mt-3 block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Grupo WhatsApp
                    </span>
                    <div className="mt-1">
                      <EvolutionGroupSelect
                        valueJid={destJids[region]}
                        disabled={saving}
                        listGroups={() =>
                          api.admin.jobOffers.whatsapp.listEvolutionGroups()
                        }
                        onChange={(g) => {
                          setDestJids((prev) => ({
                            ...prev,
                            [region]: g.groupJid,
                          }));
                          setDestTitles((prev) => ({
                            ...prev,
                            [region]: g.title,
                          }));
                        }}
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    disabled={saving || !destJids[region].trim()}
                    onClick={() => void saveDestination(region)}
                    className="mt-3 w-full rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-900 disabled:opacity-50"
                  >
                    {saving ? 'A guardar…' : 'Guardar destino'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Adicionar grupo de scan
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Grupo ou canal (origem)
            </span>
            <EvolutionGroupSelect
              valueJid={formSourceJid}
              disabled={creating}
              listGroups={() => api.admin.jobOffers.whatsapp.listEvolutionGroups()}
              onChange={(g) => {
                setFormSourceJid(g.groupJid);
                setFormSourceTitle(g.title);
              }}
            />
          </label>
          <div className="text-sm sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Números monitorizados (opcional)
            </span>
            <WhatsappScanNumbersInput
              value={formNumbers}
              onChange={setFormNumbers}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Lista vazia = todas as mensagens deste grupo.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateScan()}
          disabled={creating}
          className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {creating ? 'A adicionar…' : 'Adicionar grupo de scan'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">A carregar grupos de scan…</p>
      ) : scans.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          Ainda não há grupos de scan. Adiciona um grupo de origem acima.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Grupo de scan</th>
                <th className="px-4 py-3">Números</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {scans.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-3 text-zinc-800">
                    {row.sourceTitle ?? (
                      <span className="font-mono text-xs text-zinc-500">
                        {row.sourceGroupJid.replace(/@g\.us$/i, '')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <MonitoredUsersCell
                      numbers={row.monitoredNumbers}
                      monitorAllMembers={row.monitorAllMembers}
                      contactNames={{}}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={togglingScanId === row.id}
                      onClick={() => void toggleScanActive(row)}
                      className={
                        row.active
                          ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60'
                          : 'rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60'
                      }
                    >
                      {togglingScanId === row.id
                        ? '…'
                        : row.active
                          ? 'Ativo'
                          : 'Inativo'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteScan(row.id)}
                      disabled={deletingId === row.id}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === row.id ? 'A remover…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
