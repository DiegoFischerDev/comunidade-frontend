'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PartnerServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  priceOnRequest: boolean;
  createdAt: string;
  commissionEuro: number | null;
};

export default function PartnerServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<PartnerServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.partner.services.list();
        setServices(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar serviços do parceiro.',
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
        <h1 className="text-2xl font-semibold text-zinc-900">Meus serviços</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta área é exclusiva para parceiros.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!description.trim()) {
        setError('A descrição é obrigatória.');
        setSubmitting(false);
        return;
      }
      if (!priceOnRequest && !price.trim()) {
        setError('O valor é obrigatório quando o serviço não é "sob consulta".');
        setSubmitting(false);
        return;
      }
      if (editingId) {
        const updated = await api.partner.services.update(editingId, {
          title,
          description: description.trim(),
          priceOnRequest,
          price: priceOnRequest ? undefined : price.trim() || undefined,
        });
        setServices((prev) =>
          prev.map((s) => (s.id === editingId ? updated : s)),
        );
      } else {
        const created = await api.partner.services.create({
          title,
          description: description.trim(),
          priceOnRequest,
          price: priceOnRequest ? undefined : price.trim() || undefined,
        });
        setServices((prev) => [created, ...prev]);
      }

      setTitle('');
      setDescription('');
      setPrice('');
      setPriceOnRequest(false);
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao salvar serviço. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(service: PartnerServiceRow) {
    setEditingId(service.id);
    setTitle(service.title);
    setDescription(service.description ?? '');
    setPrice(service.price ?? '');
    setPriceOnRequest(service.priceOnRequest ?? false);
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        'Tem certeza que deseja remover este serviço? Esta ação é irreversível.',
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.partner.services.delete(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setPrice('');
        setPriceOnRequest(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao remover serviço. Tente novamente.',
      );
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Meus serviços</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Cadastre e gerencie os serviços que serão exibidos no marketplace.
        A categoria dos serviços será definida pelo time RPM.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Título do serviço
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Descrição
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">
            Valor
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex.: 50.00"
              disabled={priceOnRequest}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-100 disabled:text-zinc-500"
            />
            <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={priceOnRequest}
                onChange={(e) => {
                  setPriceOnRequest(e.target.checked);
                  if (e.target.checked) setPrice('');
                }}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              Sob consulta
            </label>
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting
              ? 'Salvando…'
              : editingId
              ? 'Salvar alterações'
              : 'Cadastrar serviço'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setTitle('');
                setDescription('');
                setPrice('');
                setPriceOnRequest(false);
              }}
              className="ml-3 inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">
          Carregando serviços cadastrados…
        </p>
      ) : services.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Nenhum serviço cadastrado ainda. Use o formulário acima para criar o
          primeiro.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Título</th>
                <th className="px-4 py-2 text-left">Descrição</th>
                <th className="px-4 py-2 text-left">Valor (EUR)</th>
                <th className="px-4 py-2 text-left">Comissão RPM (EUR)</th>
                <th className="px-4 py-2 text-left">Criado em</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-zinc-200">
                  <td className="px-4 py-2 align-top">{s.title}</td>
                  <td className="px-4 py-2 align-top">
                    {s.description ? (
                      <span className="line-clamp-3 max-w-xs text-zinc-700">
                        {s.description}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {s.priceOnRequest ? (
                      <span className="text-xs text-zinc-600">Sob consulta</span>
                    ) : s.price ? (
                      <span className="text-xs font-medium text-emerald-700">
                        {s.price} €
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {s.commissionEuro != null ? (
                      <span className="text-xs font-medium text-emerald-700">
                        {Math.round(s.commissionEuro)} €
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {new Date(s.createdAt).toLocaleString('pt-PT')}
                  </td>
                  <td className="px-4 py-2 text-right align-top space-x-2">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="cursor-pointer rounded bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

