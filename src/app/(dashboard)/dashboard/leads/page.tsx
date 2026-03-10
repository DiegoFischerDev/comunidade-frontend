'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type LeadRow = {
  id: string;
  createdAt: string;
  user: { name: string | null; email: string; whatsapp: string | null };
};

export default function PartnerLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        Veja aqui os utilizadores que demonstraram interesse em falar consigo.
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
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Nome</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">WhatsApp</th>
                <th className="px-4 py-2 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
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
                    <td className="px-4 py-2 align-top">{lead.user.email}</td>
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
    </div>
  );
}

