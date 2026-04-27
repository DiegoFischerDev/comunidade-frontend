'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';

type AdminPartnerServicesGroup = Awaited<
  ReturnType<typeof api.admin.services.listGrouped>
>[number];

export default function AdminCommissionsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<AdminPartnerServicesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.admin.services.listGrouped();
        setGroups(data);
        setDraft(() => {
          const next: Record<string, string> = {};
          for (const p of data) {
            for (const s of p.services) {
              next[s.id] = s.rpmCommissionEur ?? '';
            }
          }
          return next;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar comissões.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin]);

  const totalServices = useMemo(
    () => groups.reduce((acc, g) => acc + g.services.length, 0),
    [groups],
  );

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Comissões</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  async function handleSave(serviceId: string) {
    setError('');
    setSavingId(serviceId);
    try {
      const value = draft[serviceId] ?? '';
      const res = await api.admin.services.updateCommission(
        serviceId,
        value.trim() ? value : null,
      );
      setGroups((prev) =>
        prev.map((p) => ({
          ...p,
          services: p.services.map((s) =>
            s.id === serviceId
              ? { ...s, rpmCommissionEur: res.rpmCommissionEur }
              : s,
          ),
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar comissão.',
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Comissões</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Gestão de comissão RPM por serviço.
          {totalServices ? ` (${totalServices} serviços)` : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600">Carregando comissões…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum serviço encontrado.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((partner) => (
            <section key={partner.id} className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-semibold text-zinc-900">
                  {partner.name}
                </h2>
                <span className="text-xs text-zinc-500">
                  {partner.services.length} serviços
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Título</th>
                      <th className="px-4 py-2 text-left">Valor</th>
                      <th className="px-4 py-2 text-left">Comissão RPM</th>
                      <th className="px-4 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partner.services.map((s) => (
                      <tr key={s.id} className="border-t border-zinc-200">
                        <td className="px-4 py-2 align-top">{s.title}</td>
                        <td className="px-4 py-2 align-top">
                          {s.priceOnRequest ? (
                            <span className="text-xs text-zinc-600">
                              Sob consulta
                            </span>
                          ) : s.price ? (
                            <span className="text-xs font-medium text-emerald-700">
                              {s.price} €
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <input
                            value={draft[s.id] ?? ''}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            placeholder="Ex: 10"
                            className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-[11px] text-zinc-500">
                            Valor em EUR (texto livre).
                          </p>
                        </td>
                        <td className="px-4 py-2 align-top text-right">
                          <CardButton
                            type="button"
                            variant="outline"
                            loading={savingId === s.id}
                            onClick={() => handleSave(s.id)}
                          >
                            Salvar
                          </CardButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

