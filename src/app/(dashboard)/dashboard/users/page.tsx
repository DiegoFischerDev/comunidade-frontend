'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string;
  role: string;
  tier: string;
  membershipExpiresAt: string | null;
  rafaCallSchedulingUnlocked: boolean;
  rafaCallSlotStartsAt: string | null;
  rafaCallSlotEndsAt: string | null;
  createdAt: string;
};

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRafaSlotPt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ROLES: UserRow['role'][] = ['USER', 'PARTNER', 'ADMIN'];
const TIERS = ['VISITOR', 'MEMBER'] as const;
const TIER_LABELS: Record<string, string> = { VISITOR: 'Visitante', MEMBER: 'Membro' };

type UsersAdminStats = Awaited<ReturnType<typeof api.admin.users.stats>>;

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function UsersPage() {
  const { user, impersonateAsUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<UsersAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editRafaUnlocked, setEditRafaUnlocked] = useState(false);
  const [editRafaSlotLocal, setEditRafaSlotLocal] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterInput, setFilterInput] = useState('');

  const filteredUsers = useMemo(() => {
    const term = filterInput.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const createdAt = u.createdAt
        ? new Date(u.createdAt).toLocaleDateString('pt-PT')
        : '';
      const emailStr = (u.email || '').toLowerCase();
      const rafaStr = [
        u.rafaCallSchedulingUnlocked ? 'liberado cal agendamento' : 'bloqueado',
        formatRafaSlotPt(u.rafaCallSlotEndsAt),
      ]
        .join(' ')
        .toLowerCase();
      return (
        u.name.toLowerCase().includes(term) ||
        emailStr.includes(term) ||
        (u.whatsapp || '').toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term) ||
        (TIER_LABELS[u.tier] || u.tier || '').toLowerCase().includes(term) ||
        createdAt.toLowerCase().includes(term) ||
        rafaStr.includes(term)
      );
    });
  }, [users, filterInput]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [data, statsData] = await Promise.all([
          api.admin.users.list(),
          api.admin.users.stats(),
        ]);
        setUsers(data);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function refreshUsersAndStats() {
    try {
      const [data, statsData] = await Promise.all([
        api.admin.users.list(),
        api.admin.users.stats(),
      ]);
      setUsers(data);
      setStats(statsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao atualizar dados.',
      );
    }
  }

  function openEdit(u: UserRow) {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email ?? '');
    setEditWhatsapp(u.whatsapp);
    setEditRafaUnlocked(u.rafaCallSchedulingUnlocked);
    setEditRafaSlotLocal(isoToDatetimeLocalValue(u.rafaCallSlotEndsAt));
    setError('');
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    setSaving(true);
    setError('');
    try {
      await api.admin.users.update(editingUser.id, {
        name: editName,
        email: editEmail,
        whatsapp: editWhatsapp,
      });
      const slotTrim = editRafaSlotLocal.trim();
      let slotIso: string | null = null;
      if (slotTrim !== '') {
        const d = new Date(slotTrim);
        if (Number.isNaN(d.getTime())) {
          setError('Data/hora do fim do slot é inválida.');
          setSaving(false);
          return;
        }
        slotIso = d.toISOString();
      }
      await api.admin.users.updateRafacall(editingUser.id, {
        rafaCallSchedulingUnlocked: editRafaUnlocked,
        rafaCallSlotEndsAt: slotIso,
      });
      await refreshUsersAndStats();
      setEditingUser(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao atualizar usuário.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Usuários</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Usuários</h1>
      <p className="mt-2 text-zinc-600">
        Gerencie os usuários da plataforma (editar dados, roles e remoção).
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando usuários…</p>
      ) : (
        <>
          {stats && (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/90 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold tracking-wide text-blue-900/70 uppercase">
                  Total de utilizadores
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-blue-950">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="rounded-xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold tracking-wide text-violet-900/70 uppercase">
                  Parceiros
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-violet-950">
                  {stats.partners}
                </p>
              </div>
              <div className="rounded-xl border border-teal-200/80 bg-teal-50/90 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold tracking-wide text-teal-900/70 uppercase">
                  Visitantes
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-teal-950">
                  {stats.visitors}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold tracking-wide text-amber-900/70 uppercase">
                  Membros
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-amber-950">
                  {stats.members}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold tracking-wide text-emerald-900/70 uppercase">
                  Total inscrições (EUR)
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-950">
                  {formatEuro(stats.totalMembershipRevenueEur)}
                </p>
                <p className="mt-1 text-[10px] leading-tight text-emerald-900/65">
                  Soma de {stats.membershipPaymentsCount} pagamento(s) registados — preço
                  atual da anuidade: {formatEuro(stats.membershipPriceEurUsed)} (PIX BRL
                  contabilizado ao valor EUR em tempo de pagamento)
                </p>
              </div>
            </div>
          )}

          {users.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Nenhum utilizador encontrado.
            </p>
          ) : (
        <>
          <div className="mt-6">
            <label className="block text-xs font-medium text-zinc-700">
              Filtrar lista
            </label>
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Pesquisar por nome, email, WhatsApp, role, tier, agendamento Rafa ou data…"
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">E-mail</th>
                  <th className="px-4 py-2 text-left">WhatsApp</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Tier</th>
                  <th className="px-4 py-2 text-left">Criado em</th>
                  <th className="px-4 py-2 text-left">Membro até</th>
                  <th className="px-4 py-2 text-left min-w-[200px]">
                    Agendamento (chamada Rafa)
                  </th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-4 text-center text-sm text-zinc-500"
                    >
                      Nenhum usuário corresponde ao filtro.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                <tr key={u.id} className="border-t border-zinc-200">
                    <td className="px-4 py-2">{u.name}</td>
                    <td className="px-4 py-2">{u.email ?? '—'}</td>
                    <td className="px-4 py-2">{u.whatsapp}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={async (e) => {
                        const newRole = e.target.value as UserRow['role'];
                        try {
                          await api.admin.users.updateRole(
                            u.id,
                            newRole as 'USER' | 'PARTNER' | 'ADMIN',
                          );
                          await refreshUsersAndStats();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao atualizar role.',
                          );
                        }
                      }}
                      className="rounded border border-zinc-300 px-2 py-1 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={u.tier}
                      onChange={async (e) => {
                        const newTier = e.target.value as 'VISITOR' | 'MEMBER';
                        try {
                          await api.admin.users.updateTier(u.id, {
                            tier: newTier,
                          });
                          await refreshUsersAndStats();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao atualizar tier.',
                          );
                        }
                      }}
                      className="cursor-pointer rounded border border-zinc-300 px-2 py-1 text-sm"
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {TIER_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="px-4 py-2">
                    {u.membershipExpiresAt
                      ? new Date(u.membershipExpiresAt).toLocaleDateString('pt-PT')
                      : '—'}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={u.rafaCallSchedulingUnlocked ? '1' : '0'}
                        onChange={async (e) => {
                          const unlocked = e.target.value === '1';
                          setError('');
                          try {
                            const updated = await api.admin.users.updateRafacall(u.id, {
                              rafaCallSchedulingUnlocked: unlocked,
                            });
                            setUsers((prev) =>
                              prev.map((row) =>
                                row.id === u.id ? { ...row, ...updated } : row,
                              ),
                            );
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : 'Erro ao atualizar agendamento.',
                            );
                          }
                        }}
                        className="max-w-[11rem] cursor-pointer rounded border border-zinc-300 px-2 py-1 text-xs"
                        aria-label="Cal.com desbloqueado"
                      >
                        <option value="1">Cal liberado</option>
                        <option value="0">Cal bloqueado</option>
                      </select>
                      <p className="text-[11px] leading-snug text-zinc-600">
                        <span className="font-medium text-zinc-700">Fim do slot:</span>{' '}
                        {formatRafaSlotPt(u.rafaCallSlotEndsAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="mr-2 cursor-pointer rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        try {
                          await impersonateAsUser(u.id);
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao entrar como este usuário.',
                          );
                        }
                      }}
                      className="mr-2 cursor-pointer rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Logar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Tem certeza que deseja remover este usuário? Esta ação é irreversível.\n\nNome: ${u.name}\nEmail: ${u.email}\nFunção: ${u.role}`,
                          )
                        ) {
                          return;
                        }
                        try {
                          await api.admin.users.delete(u.id);
                          await refreshUsersAndStats();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao remover usuário.',
                          );
                        }
                      }}
                      className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
          )}
        </>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">
              Editar usuário
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Altere nome, e-mail, WhatsApp e estado do agendamento Cal.com.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="Ex: 351 912 345 678"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="border-t border-zinc-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Agendamento — chamada com a Rafa
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={editRafaUnlocked}
                    onChange={(e) => setEditRafaUnlocked(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  Permitir abrir o Cal.com (desbloqueado)
                </label>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-zinc-700">
                    Fim do slot agendado
                  </label>
                  <input
                    type="datetime-local"
                    value={editRafaSlotLocal}
                    onChange={(e) => setEditRafaSlotLocal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Horário local. Deixe vazio e guarde para limpar a data do slot.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'A salvar…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

