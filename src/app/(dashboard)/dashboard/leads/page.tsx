'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type LeadRow = Awaited<ReturnType<typeof api.partner.leads.list>>[number];

const VISA_LABELS: Record<string, string> = {
  ESTUDO: 'Estudo',
  TRABALHO: 'Trabalho',
  D8_NOMADE: 'D8 / Nómade digital',
  D7_PASSIVO: 'D7 / Rendimentos',
  D2_EMPREENDEDOR: 'D2 / Empreendedor',
  REAGRUPAMENTO: 'Reagrupamento',
};

const CITY_LABELS: Record<string, string> = {
  INTERIOR: 'Interior',
  LISBOA: 'Lisboa',
  PORTO: 'Porto',
  BRAGA: 'Braga',
  COIMBRA: 'Coimbra',
  AVEIRO: 'Aveiro',
  FARO: 'Faro',
  ALGARVE: 'Algarve',
  EVORA: 'Évora',
  VISEU: 'Viseu',
};

const FAMILY_LABELS: Record<string, string> = {
  '1': '1 pessoa',
  '2': '2 pessoas',
  '3': '3 pessoas',
  '4': '4 pessoas',
  '5+': '5+ pessoas',
};

const ROOMS_LABELS: Record<string, string> = {
  '0': 'Quarto',
  '1': '1 quarto',
  '2': '2 quartos',
  '3': '3 quartos',
  '4+': '4+ quartos',
};

function formatPtDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-PT');
}

function formatAvgMinutesPt(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m) || m <= 0) {
    return 'Ainda sem histórico suficiente (após contactar leads, calculamos a média).';
  }
  if (m < 60) {
    return `${Math.max(1, Math.round(m))} minutos`;
  }
  const h = m / 60;
  const rounded = h >= 10 ? Math.round(h) : Math.round(h * 10) / 10;
  const s = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0$/, '');
  return `${s} horas`;
}

function getPlanLines(lead: LeadRow): string[] {
  const plan = lead.immigrationPlan;
  if (!plan) return [];

  const { answers } = plan;
  const lines: string[] = [];

  if (answers.visaType) lines.push(`Visto: ${VISA_LABELS[answers.visaType] ?? answers.visaType}`);
  if (answers.cidade) lines.push(`Cidade: ${CITY_LABELS[answers.cidade] ?? answers.cidade}`);
  if (answers.cidadePlanoB) {
    lines.push(`Plano B: ${CITY_LABELS[answers.cidadePlanoB] ?? answers.cidadePlanoB}`);
  }
  if (answers.agregadoFamiliar) {
    lines.push(
      `Agregado: ${FAMILY_LABELS[answers.agregadoFamiliar] ?? answers.agregadoFamiliar}`,
    );
  }
  if (answers.numQuartos) {
    lines.push(`Quartos: ${ROOMS_LABELS[answers.numQuartos] ?? answers.numQuartos}`);
  }
  if (answers.profissoesPossiveis.length) {
    lines.push(`Profissões: ${answers.profissoesPossiveis.join(', ')}`);
  }
  if (answers.precisaCarro !== null) {
    lines.push(`Carro: ${answers.precisaCarro ? 'Sim' : 'Não'}`);
  }
  if (answers.dataViagem) lines.push(`Viagem: ${formatPtDate(answers.dataViagem)}`);
  if (answers.dataAima) lines.push(`AIMA: ${formatPtDate(answers.dataAima)}`);
  if (answers.notas) lines.push(`Notas: ${answers.notas}`);

  return lines;
}

function leadMatchesFilter(lead: LeadRow, filter: string): boolean {
  if (!filter.trim()) return true;
  const q = filter.trim().toLowerCase();
  const name = (lead.user?.name ?? '').toLowerCase();
  const tier =
    lead.user?.tier === 'MEMBER'
      ? 'membro vip'
      : lead.contactType === 'visitor'
        ? 'visitante whatsapp'
        : 'visitante';
  const data = new Date(lead.createdAt).toLocaleString('pt-PT').toLowerCase();
  const planText = getPlanLines(lead).join(' ').toLowerCase();
  const interest = (lead.interestComment ?? '').toLowerCase();
  return (
    name.includes(q) ||
    tier.includes(q) ||
    data.includes(q) ||
    planText.includes(q) ||
    interest.includes(q)
  );
}

export default function PartnerLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [avgMinutes, setAvgMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterInput, setFilterInput] = useState('');
  const [openPlanByLeadId, setOpenPlanByLeadId] = useState<Record<string, boolean>>({});
  const [contactBusyId, setContactBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [data, me] = await Promise.all([
      api.partner.leads.list(),
      api.partner.me(),
    ]);
    setLeads(data);
    setAvgMinutes(me.averageResponseMinutes ?? null);
    if (typeof me.pendingLeadsCount === 'number') {
      window.dispatchEvent(
        new CustomEvent('partner-pending-leads-changed', {
          detail: { count: me.pendingLeadsCount },
        }),
      );
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await reload();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar leads do parceiro.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user, reload]);

  const filteredLeads = useMemo(
    () => leads.filter((lead) => leadMatchesFilter(lead, filterInput)),
    [leads, filterInput],
  );

  async function handleContactLead(leadId: string) {
    setContactBusyId(leadId);
    setError('');
    try {
      const { waMeUrl } = await api.partner.leads.openContact(leadId);
      window.open(waMeUrl, '_blank', 'noopener,noreferrer');
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao abrir conversa.',
      );
    } finally {
      setContactBusyId(null);
    }
  }

  if (!user) return null;

  if (user.role !== 'PARTNER') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Leads</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta área é exclusiva para parceiros.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Leads</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Pedidos de atendimento enviados pelo WhatsApp da equipa Rafa Portugal. O número do cliente não é exibido;
        use o botão para abrir a conversa — registamos o momento do primeiro contacto para a média de resposta.
      </p>

      <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <span className="font-semibold">O seu tempo médio de atendimento: </span>
        {formatAvgMinutesPt(avgMinutes)}
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando leads…</p>
      ) : leads.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Ainda não há leads registados para si.
        </p>
      ) : (
        <>
          <div className="mt-6 mx-auto w-full max-w-[960px]">
            <label className="block text-xs font-medium text-zinc-700">
              Filtrar lista
            </label>
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Pesquisar por nome, interesse, plano ou data…"
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {filteredLeads.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Nenhum lead corresponde ao filtro.
            </p>
          ) : (
            <div className="mt-4 mx-auto w-full max-w-[960px] overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">Plano atual</th>
                    <th className="px-4 py-2 text-left">Interesse</th>
                    <th className="px-4 py-2 text-left">Plano de imigração</th>
                    <th className="px-4 py-2 text-left">WhatsApp</th>
                    <th className="px-4 py-2 text-left">Pedido</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const planLines = getPlanLines(lead);
                    const displayName =
                      lead.contactType === 'visitor'
                        ? 'Visitante (só WhatsApp)'
                        : lead.user?.name || '—';

                    return (
                      <tr key={lead.id} className="border-t border-zinc-200">
                        <td className="px-4 py-2 align-top">{displayName}</td>
                        <td className="px-4 py-2 align-top">
                          {lead.user ? (
                            <span className="text-xs font-medium text-zinc-700">
                              {lead.user.tier === 'MEMBER' ? 'Membro VIP' : 'Visitante'}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="max-w-[220px] px-4 py-2 align-top text-xs text-zinc-700">
                          {lead.interestComment ?? '—'}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {lead.immigrationPlan ? (
                            <div className="max-w-sm space-y-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenPlanByLeadId((prev) => ({
                                    ...prev,
                                    [lead.id]: !prev[lead.id],
                                  }))
                                }
                                className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                aria-expanded={Boolean(openPlanByLeadId[lead.id])}
                                title="Abrir/fechar plano de imigração"
                              >
                                <span>Plano</span>
                                <span
                                  className={`transition-transform ${openPlanByLeadId[lead.id] ? 'rotate-180' : ''}`}
                                  aria-hidden="true"
                                >
                                  ▾
                                </span>
                              </button>

                              {openPlanByLeadId[lead.id] ? (
                                <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                                  <p className="text-xs font-medium text-zinc-500">
                                    Atualizado em{' '}
                                    {new Date(lead.immigrationPlan.updatedAt).toLocaleString('pt-PT')}
                                  </p>
                                  {planLines.length ? (
                                    <div className="space-y-1 text-xs text-zinc-700">
                                      {planLines.map((line) => (
                                        <p key={`${lead.id}-${line}`}>{line}</p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-zinc-500">Sem respostas no plano.</p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <button
                            type="button"
                            disabled={contactBusyId === lead.id}
                            onClick={() => void handleContactLead(lead.id)}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {contactBusyId === lead.id ? 'A abrir…' : 'Abrir chat'}
                          </button>
                        </td>
                        <td className="px-4 py-2 align-top whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleString('pt-PT')}
                        </td>
                        <td className="px-4 py-2 align-top text-xs text-zinc-600">
                          {lead.awaitingAttendance ? (
                            <span className="font-medium text-amber-800">Aguarda contacto</span>
                          ) : lead.attendedAt ? (
                            <span title={new Date(lead.attendedAt).toLocaleString('pt-PT')}>
                              Contactado
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
