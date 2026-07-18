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

function formatRafaSlotRangePt(
  startsAtIso: string | null | undefined,
  endsAtIso: string | null | undefined,
): string {
  if (!startsAtIso && !endsAtIso) return '—';
  const s = startsAtIso ? new Date(startsAtIso) : null;
  const e = endsAtIso ? new Date(endsAtIso) : null;
  if (s && Number.isNaN(s.getTime())) return '—';
  if (e && Number.isNaN(e.getTime())) return '—';
  if (s && e) {
    const day = s.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
    const startTime = s.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const endTime = e.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${startTime}–${endTime}`;
  }
  return formatRafaSlotPt(endsAtIso || startsAtIso || null);
}

const ROLES: UserRow['role'][] = ['USER', 'PARTNER', 'ADMIN'];

export default function UsersPage() {
  const { user, impersonateAsUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
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
        u.rafaCallSchedulingUnlocked ? 'agendamento liberado' : 'agendamento bloqueado',
        formatRafaSlotRangePt(u.rafaCallSlotStartsAt, u.rafaCallSlotEndsAt),
      ]
        .join(' ')
        .toLowerCase();
      return (
        u.name.toLowerCase().includes(term) ||
        emailStr.includes(term) ||
        (u.whatsapp || '').toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term) ||
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
        const data = await api.admin.users.list();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function refreshUsers() {
    try {
      const data = await api.admin.users.list();
      setUsers(data);
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
      await refreshUsers();
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
        <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
        <p className="mt-2 text-sm text-muted">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
      <p className="mt-2 text-muted">
        Gerencie os usuários da plataforma (editar dados, roles e remoção).
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Carregando usuários…</p>
      ) : users.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nenhum utilizador encontrado.
        </p>
      ) : (
        <>
          <div className="mt-6">
            <label className="block text-xs font-medium text-foreground/90">
              Filtrar lista
            </label>
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Pesquisar por nome, email, WhatsApp, role, agendamento Rafa ou data…"
              className="mt-1 w-full max-w-md rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted/80 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-page text-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">WhatsApp</th>
                  <th className="px-4 py-2 text-left">Role</th>
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
                      colSpan={7}
                      className="px-4 py-4 text-center text-sm text-muted"
                    >
                      Nenhum usuário corresponde ao filtro.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-2">{u.name}</td>
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
                          await refreshUsers();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao atualizar role.',
                          );
                        }
                      }}
                      className="rounded border border-border px-2 py-1 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
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
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1.5">
                      {u.rafaCallSlotEndsAt &&
                      !Number.isNaN(new Date(u.rafaCallSlotEndsAt).getTime()) &&
                      new Date(u.rafaCallSlotEndsAt).getTime() > Date.now() ? (
                        <p className="text-sm font-medium leading-snug text-emerald-700">
                          Agendado:{' '}
                          {formatRafaSlotRangePt(u.rafaCallSlotStartsAt, u.rafaCallSlotEndsAt)}
                        </p>
                      ) : (
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
                          className="max-w-[11rem] cursor-pointer rounded border border-border px-2 py-1 text-xs"
                          aria-label="Agendamento (chamada Rafa)"
                        >
                          <option value="1">Agendamento liberado</option>
                          <option value="0">Agendamento bloqueado</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="mr-2 cursor-pointer rounded bg-primary-1 px-3 py-1 text-xs font-medium text-foreground hover:bg-zinc-200"
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
                      className="mr-2 cursor-pointer rounded bg-brand-accent/10 px-3 py-1 text-xs font-medium text-brand-primary hover:bg-page"
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
                          await refreshUsers();
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

      {editingUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center brand-modal-scrim">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">
              Editar usuário
            </h2>
            <p className="mt-1 text-sm text-muted">
              Altere nome, e-mail, WhatsApp e estado do agendamento (chamada Rafa).
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground/90">
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/90">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="Ex: 351 912 345 678"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                />
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Agendamento — chamada com a Rafa
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={editRafaUnlocked}
                    onChange={(e) => setEditRafaUnlocked(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary/25"
                  />
                  Agendamento liberado (pode agendar)
                </label>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-foreground/90">
                    Fim do slot agendado
                  </label>
                  <input
                    type="datetime-local"
                    value={editRafaSlotLocal}
                    onChange={(e) => setEditRafaSlotLocal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Horário local. Deixe vazio e guarde para limpar a data do slot.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/90 hover:bg-page"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-dark disabled:opacity-50"
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

