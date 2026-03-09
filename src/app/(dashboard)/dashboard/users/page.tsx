'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type UserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

const ROLES: UserRow['role'][] = ['USER', 'PARTNER', 'ADMIN'];

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    (async () => {
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
        Gerencie os usuários da plataforma (roles e remoção).
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando usuários…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Criado em</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-200">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={async (e) => {
                        const newRole = e.target.value as UserRow['role'];
                        try {
                          const updated = await api.admin.users.updateRole(
                            u.id,
                            newRole as 'USER' | 'PARTNER' | 'ADMIN',
                          );
                          setUsers((prev) =>
                            prev.map((row) =>
                              row.id === u.id ? { ...row, role: updated.role } : row,
                            ),
                          );
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
                    {new Date(u.createdAt).toLocaleString('pt-PT')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Tem certeza que deseja remover este usuário? Esta ação é irreversível.',
                          )
                        ) {
                          return;
                        }
                        try {
                          await api.admin.users.delete(u.id);
                          setUsers((prev) => prev.filter((row) => row.id !== u.id));
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'Erro ao remover usuário.',
                          );
                        }
                      }}
                      className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-4 text-center text-sm text-zinc-500"
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

