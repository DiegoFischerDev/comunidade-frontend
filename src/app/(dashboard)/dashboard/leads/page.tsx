'use client';

import type { Dispatch, SetStateAction } from 'react';
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

/** Ex.: Contactado em 01/05/2026, 00:12:34 */
function formatContactadoEm(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `Contactado em ${dateStr}, ${timeStr}`;
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

function displayNameForLead(lead: LeadRow): string {
  return lead.contactType === 'visitor'
    ? 'Visitante'
    : lead.user?.name || '—';
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

type PlanToggleProps = {
  lead: LeadRow;
  planLines: string[];
  open: boolean;
  onToggle: () => void;
};

function PlanImmigrationBlock({ lead, planLines, open, onToggle }: PlanToggleProps) {
  if (!lead.immigrationPlan) {
    return <span className="text-zinc-400">—</span>;
  }
  return (
    <div className="max-w-md space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        aria-expanded={open}
        title="Abrir/fechar plano de imigração"
      >
        <span>Plano</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
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
  );
}

type LeadBlocksProps = {
  leads: LeadRow[];
  openPlanByLeadId: Record<string, boolean>;
  setOpenPlanByLeadId: Dispatch<SetStateAction<Record<string, boolean>>>;
  contactBusyId: string | null;
  onContact: (leadId: string) => void;
};

function LeadRowsDesktop({
  leads,
  openPlanByLeadId,
  setOpenPlanByLeadId,
  contactBusyId,
  onContact,
}: LeadBlocksProps) {
  return (
    <>
      {leads.map((lead) => {
        const planLines = getPlanLines(lead);
        const name = displayNameForLead(lead);
        return (
          <tr key={lead.id} className="border-t border-zinc-200">
            <td className="min-w-0 px-3 py-2.5 align-top text-sm">
              <span className="font-medium text-zinc-900">{name}</span>
            </td>
            <td className="min-w-0 px-3 py-2.5 align-top text-xs leading-relaxed text-zinc-700">
              {lead.interestComment ?? '—'}
            </td>
            <td className="min-w-[140px] px-3 py-2.5 align-top">
              <PlanImmigrationBlock
                lead={lead}
                planLines={planLines}
                open={Boolean(openPlanByLeadId[lead.id])}
                onToggle={() =>
                  setOpenPlanByLeadId((prev) => ({
                    ...prev,
                    [lead.id]: !prev[lead.id],
                  }))
                }
              />
            </td>
            <td className="whitespace-nowrap px-3 py-2.5 align-top text-xs text-zinc-700">
              {new Date(lead.createdAt).toLocaleString('pt-PT')}
            </td>
            <td className="min-w-0 px-3 py-2.5 align-top text-xs leading-snug text-zinc-600">
              {lead.awaitingAttendance ? (
                <span className="inline-block text-base font-semibold text-amber-900 motion-safe:animate-pulse">
                  Aguarda contacto
                </span>
              ) : lead.attendedAt ? (
                <span>{formatContactadoEm(lead.attendedAt)}</span>
              ) : (
                '—'
              )}
            </td>
            <td className="px-3 py-2.5 align-top text-right">
              <button
                type="button"
                disabled={contactBusyId === lead.id}
                onClick={() => void onContact(lead.id)}
                className="inline-flex cursor-pointer rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {contactBusyId === lead.id ? 'A abrir…' : 'Abrir chat'}
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function LeadCardsMobile({
  leads,
  openPlanByLeadId,
  setOpenPlanByLeadId,
  contactBusyId,
  onContact,
}: LeadBlocksProps) {
  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        const planLines = getPlanLines(lead);
        const name = displayNameForLead(lead);
        return (
          <article
            key={lead.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Nome
                </dt>
                <dd className="mt-0.5 text-zinc-900">{name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Interesse
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-zinc-700">
                  {lead.interestComment ?? '—'}
                </dd>
              </div>
              {planLines.length > 0 ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Plano de imigração
                  </dt>
                  <dd className="mt-0.5">
                    <PlanImmigrationBlock
                      lead={lead}
                      planLines={planLines}
                      open={Boolean(openPlanByLeadId[lead.id])}
                      onToggle={() =>
                        setOpenPlanByLeadId((prev) => ({
                          ...prev,
                          [lead.id]: !prev[lead.id],
                        }))
                      }
                    />
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Data do pedido
                </dt>
                <dd className="mt-0.5 text-zinc-700">
                  {new Date(lead.createdAt).toLocaleString('pt-PT')}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Estado
                </dt>
                <dd className="mt-0.5 text-xs text-zinc-700">
                  {lead.awaitingAttendance ? (
                    <span className="inline-block text-lg font-semibold text-amber-900 motion-safe:animate-pulse">
                      Aguarda contacto
                    </span>
                  ) : lead.attendedAt ? (
                    <span>{formatContactadoEm(lead.attendedAt)}</span>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="border-t border-zinc-100 pt-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  WhatsApp
                </dt>
                <dd className="mt-2">
                  <button
                    type="button"
                    disabled={contactBusyId === lead.id}
                    onClick={() => void onContact(lead.id)}
                    className="w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {contactBusyId === lead.id ? 'A abrir…' : 'Abrir chat no WhatsApp'}
                  </button>
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

function LeadTableSection({
  title,
  description,
  leads,
  openPlanByLeadId,
  setOpenPlanByLeadId,
  contactBusyId,
  onContact,
}: LeadBlocksProps & { title: string; description?: string }) {
  if (leads.length === 0) return null;

  const blocksProps: LeadBlocksProps = {
    leads,
    openPlanByLeadId,
    setOpenPlanByLeadId,
    contactBusyId,
    onContact,
  };

  return (
    <section className="mt-8 w-full first:mt-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <span className="text-xs font-medium text-zinc-500">{leads.length} lead(s)</span>
      </div>
      {description ? (
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      ) : null}

      {/* Mobile: cards */}
      <div className="mt-4 md:hidden">
        <LeadCardsMobile {...blocksProps} />
      </div>

      {/* Desktop: full-width table */}
      <div className='mt-4 hidden w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block'>
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm xl:min-w-0">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="w-[16%] px-3 py-3">Nome</th>
              <th className="w-[27%] px-3 py-3">Interesse</th>
              <th className="w-[21%] px-3 py-3">Plano de imigração</th>
              <th className="w-[14%] px-3 py-3">Data do pedido</th>
              <th className="w-[11%] px-3 py-3">Estado</th>
              <th className="w-[11%] px-3 py-3 text-right">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="text-zinc-800">
            <LeadRowsDesktop {...blocksProps} />
          </tbody>
        </table>
      </div>
    </section>
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

  const pendingFiltered = useMemo(
    () => filteredLeads.filter((l) => l.awaitingAttendance),
    [filteredLeads],
  );

  const attendedFiltered = useMemo(
    () => filteredLeads.filter((l) => !l.awaitingAttendance),
    [filteredLeads],
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
    <div className="w-full min-w-0 max-w-full">
      <h1 className="text-2xl font-semibold text-zinc-900">Leads</h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600">
        Pedidos de atendimento enviados pelo WhatsApp da equipa Rafa Portugal. Use o botão para abrir a conversa.
      </p>

      <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <span className="font-semibold">O seu tempo médio de atendimento às solicitações: </span>
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
          <div className="mt-6 w-full">
            <label className="block text-xs font-medium text-zinc-700">
              Filtrar lista
            </label>
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Pesquisar por nome, interesse, plano ou data…"
              className="mt-1 w-full max-w-lg rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {filteredLeads.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              Nenhum lead corresponde ao filtro.
            </p>
          ) : (
            <>
              <LeadTableSection
                title="Aguardam atendimento"
                description="Contacte estes pedidos primeiro. O tempo até clicar em «Abrir chat» entra na sua média de resposta."
                leads={pendingFiltered}
                openPlanByLeadId={openPlanByLeadId}
                setOpenPlanByLeadId={setOpenPlanByLeadId}
                contactBusyId={contactBusyId}
                onContact={handleContactLead}
              />
              <LeadTableSection
                title="Já contactados"
                description="Histórico de pedidos em que já abriu a conversa no WhatsApp."
                leads={attendedFiltered}
                openPlanByLeadId={openPlanByLeadId}
                setOpenPlanByLeadId={setOpenPlanByLeadId}
                contactBusyId={contactBusyId}
                onContact={handleContactLead}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
