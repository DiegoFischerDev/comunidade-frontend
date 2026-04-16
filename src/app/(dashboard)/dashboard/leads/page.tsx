'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type LeadRow = {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    whatsapp: string | null;
    tier: 'VISITOR' | 'MEMBER';
  };
  immigrationPlan: {
    updatedAt: string;
    answers: {
      visaType: string | null;
      cidade: string | null;
      cidadePlanoB: string | null;
      agregadoFamiliar: string | null;
      numQuartos: string | null;
      profissoesPossiveis: string[];
      precisaCarro: boolean | null;
      dataViagem: string | null;
      dataAima: string | null;
      notas: string | null;
    };
  } | null;
};

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
    lines.push(
      `Carro: ${answers.precisaCarro ? 'Sim' : 'Não'}`,
    );
  }
  if (answers.dataViagem) lines.push(`Viagem: ${formatPtDate(answers.dataViagem)}`);
  if (answers.dataAima) lines.push(`AIMA: ${formatPtDate(answers.dataAima)}`);
  if (answers.notas) lines.push(`Notas: ${answers.notas}`);

  return lines;
}

function leadMatchesFilter(lead: LeadRow, filter: string): boolean {
  if (!filter.trim()) return true;
  const q = filter.trim().toLowerCase();
  const name = (lead.user.name ?? '').toLowerCase();
  const whatsapp = (lead.user.whatsapp ?? '').toLowerCase();
  const tier = (lead.user.tier === 'MEMBER' ? 'membro vip' : 'visitante').toLowerCase();
  const data = new Date(lead.createdAt).toLocaleString('pt-PT').toLowerCase();
  const planText = getPlanLines(lead).join(' ').toLowerCase();
  return (
    name.includes(q) ||
    whatsapp.includes(q) ||
    tier.includes(q) ||
    data.includes(q) ||
    planText.includes(q)
  );
}

export default function PartnerLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterInput, setFilterInput] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.partner.leads.list();
        setLeads(data);
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
  }, [user]);

  const filteredLeads = useMemo(
    () => leads.filter((lead) => leadMatchesFilter(lead, filterInput)),
    [leads, filterInput],
  );

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
      <p className="mt-2 text-sm text-zinc-600">
        Veja aqui os utilizadores que demonstraram interesse em falar consigo. Aqueles que sao membros VIP tem direito a desconto de 10€ que pode ser compensado na hora do pagamento da comissão.
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
          <div className="mt-6 mx-auto w-full max-w-[800px]">
            <label className="block text-xs font-medium text-zinc-700">
              Filtrar lista
            </label>
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Pesquisar por nome, plano, WhatsApp ou data…"
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {filteredLeads.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Nenhum lead corresponde ao filtro.
            </p>
          ) : (
            <div className="mt-4 mx-auto w-full max-w-[800px] overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">Plano atual</th>
                    <th className="px-4 py-2 text-left">Plano de imigração</th>
                    <th className="px-4 py-2 text-left">WhatsApp</th>
                    <th className="px-4 py-2 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                const planLines = getPlanLines(lead);
                const whatsappDigits = lead.user.whatsapp
                  ? lead.user.whatsapp.replace(/\D/g, '')
                  : '';
                const whatsappUrl = whatsappDigits
                  ? `https://wa.me/${whatsappDigits}`
                  : null;

                return (
                  <tr key={lead.id} className="border-t border-zinc-200">
                    <td className="px-4 py-2 align-top">
                      {lead.user.name || '—'}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <span className="text-xs font-medium text-zinc-700">
                        {lead.user.tier === 'MEMBER' ? 'Membro VIP' : 'Visitante'}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top">
                      {lead.immigrationPlan ? (
                        <div className="max-w-sm space-y-2">
                          <p className="text-xs font-medium text-zinc-500">
                            Atualizado em {new Date(lead.immigrationPlan.updatedAt).toLocaleString('pt-PT')}
                          </p>
                          <div className="space-y-1 text-xs text-zinc-700">
                            {planLines.map((line) => (
                              <p key={`${lead.id}-${line}`}>{line}</p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 underline-offset-2 hover:underline"
                        >
                          {lead.user.whatsapp}
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {new Date(lead.createdAt).toLocaleString('pt-PT')}
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

