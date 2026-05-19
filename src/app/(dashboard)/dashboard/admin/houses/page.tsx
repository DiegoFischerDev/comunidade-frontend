'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddHouseModal } from '@/components/house/AddHouseModal';
import { HousePublicationStatusBadge } from '@/components/house/HousePublicationStatusBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  isRelocationPortugalCity,
  relocationCityDisplayName,
} from '@/lib/relocation-portugal-cities';
import { orderHouseImagesWithCoverFirst } from '@/lib/house-entrance';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';

type AdminHouseRow = Awaited<ReturnType<typeof api.admin.houses.list>>[number];
type WhatsappGroupRow = Awaited<ReturnType<typeof api.admin.houseWhatsappGroups.list>>[number];

const BUSINESS_TYPE_LABELS: Record<'RENT' | 'SALE', string> = {
  RENT: 'Arrendamento',
  SALE: 'Venda',
};

const PUBLICATION_STATUS_LABELS: Record<'PUBLISHED' | 'HIDDEN', string> = {
  PUBLISHED: 'Publicado',
  HIDDEN: 'Oculto',
};

const TYPOLOGIES = [
  { id: 'T0', label: 'T0' },
  { id: 'T1', label: 'T1' },
  { id: 'T2', label: 'T2' },
  { id: 'T3', label: 'T3' },
  { id: 'T4', label: 'T4' },
  { id: 'T5', label: 'T5' },
  { id: 'QUARTO_AP_COMPARTILHADO', label: 'Quarto em Ap compartilhado' },
] as const;

const BUSINESS_TYPES = [
  { id: 'RENT', label: 'Arrendamento' },
  { id: 'SALE', label: 'Venda' },
] as const;

const GROUP_FINALIDADE_LABELS: Record<'RENT' | 'SALE', string> = {
  RENT: 'Arrendamento',
  SALE: 'Venda',
};

const ENTRADA_COUNT_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i));

function cityLabel(id: string): string {
  return relocationCityDisplayName(id);
}

function adminHouseWhatsAppSendDatesLabel(h: {
  whatsappSends?: { sentAt: string }[];
  whatsappSentAt: string | null;
}): string {
  const fromArray = (h.whatsappSends ?? [])
    .map((x) => x.sentAt)
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((iso) => new Date(iso).toLocaleDateString('pt-PT'));
  if (fromArray.length > 0) return fromArray.reverse().join('\n');
  if (h.whatsappSentAt) return new Date(h.whatsappSentAt).toLocaleDateString('pt-PT');
  return '—';
}

function getHouseMedia(h: {
  imageUrls: string[];
  coverImageUrl?: string | null;
  videoUrl: string | null;
  videoPosterUrl?: string | null;
}): { primaryImageSrc: string | null; videoSrc: string | null } {
  const ordered = orderHouseImagesWithCoverFirst(h.imageUrls ?? [], h.coverImageUrl);
  const primaryImageSrc = ordered[0] ? resolveUploadsUrl(ordered[0]) : null;
  const videoSrc = h.videoUrl ? resolveUploadsUrl(h.videoUrl) : null;
  // Se não há imagens, usamos a thumbnail manual (videoPosterUrl) apenas para preview em listas/cards.
  const fallbackThumb = !primaryImageSrc && h.videoPosterUrl ? resolveUploadsUrl(h.videoPosterUrl) : null;
  return { primaryImageSrc: primaryImageSrc ?? fallbackThumb, videoSrc };
}

function formatAdminHousePriceEur(priceEur: string, businessType: 'RENT' | 'SALE'): string {
  const t = (priceEur ?? '')
    .trim()
    .replace(/\s*€\s*$/i, '')
    .replace(/\s*\/\s*m[eê]s?\s*$/i, '')
    .trim();
  if (!t) return '—';
  return businessType === 'SALE' ? `${t} €` : `${t} € / mês`;
}

function typologyLabel(id: string): string {
  return TYPOLOGIES.find((t) => t.id === id)?.label ?? id;
}

export default function AdminHousesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<AdminHouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editHouseId, setEditHouseId] = useState<string | null>(null);
  const [showAddWhatsappGroupModal, setShowAddWhatsappGroupModal] = useState(false);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsappGroupRow[]>([]);
  const [loadingWhatsappGroups, setLoadingWhatsappGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupJid, setNewGroupJid] = useState('');
  const [newGroupBusinessType, setNewGroupBusinessType] = useState<'RENT' | 'SALE'>('RENT');
  const [savingWhatsappGroup, setSavingWhatsappGroup] = useState(false);
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null);
  const [updatingGroupPurposeId, setUpdatingGroupPurposeId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [sendingWhatsappHouseId, setSendingWhatsappHouseId] = useState<string | null>(null);

  const [filterSearch, setFilterSearch] = useState('');
  const [filterBusinessType, setFilterBusinessType] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
  const [filterPublication, setFilterPublication] = useState<'ALL' | 'PUBLISHED' | 'HIDDEN'>('ALL');
  const [filterCityContains, setFilterCityContains] = useState('');
  const [filterTypology, setFilterTypology] = useState<string>('ALL');
  const [showUpdatedBanner, setShowUpdatedBanner] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('updated') === '1') {
      setShowUpdatedBanner(true);
      router.replace('/dashboard/admin/houses', { scroll: false });
    }
    const editId = q.get('edit')?.trim();
    if (editId) {
      setEditHouseId(editId);
      setShowHouseModal(true);
      router.replace('/dashboard/admin/houses', { scroll: false });
    }
  }, [router]);

  const load = useCallback(async () => {
    const data = await api.admin.houses.list();
    setItems(data);
  }, []);

  const loadWhatsappGroups = useCallback(async () => {
    setLoadingWhatsappGroups(true);
    try {
      const data = await api.admin.houseWhatsappGroups.list();
      setWhatsappGroups(data);
    } catch {
      setWhatsappGroups([]);
    } finally {
      setLoadingWhatsappGroups(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await load();
        await loadWhatsappGroups();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar anúncios.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, load, loadWhatsappGroups]);

  const extraRelocationCitiesFromHouses = useMemo(() => {
    const out = new Set<string>();
    for (const h of items) {
      const c = h.city?.trim() ?? '';
      if (c && !isRelocationPortugalCity(c)) out.add(c);
    }
    return [...out];
  }, [items]);

  const filteredItems = useMemo(() => {
    let rows = items;
    const q = filterSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((h) => {
        const cityPt = cityLabel(h.city).toLowerCase();
        const typoPt = typologyLabel(h.typology).toLowerCase();
        const hay = [
          String(h.houseId),
          h.title,
          h.city,
          cityPt,
          h.typology,
          typoPt,
          h.partner.name,
          h.priceEur,
          BUSINESS_TYPE_LABELS[h.businessType],
          PUBLICATION_STATUS_LABELS[h.publicationStatus],
          h.partner.category?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filterBusinessType !== 'ALL') rows = rows.filter((h) => h.businessType === filterBusinessType);
    if (filterPublication !== 'ALL') {
      rows = rows.filter((h) => h.publicationStatus === filterPublication);
    }
    const cityQ = filterCityContains.trim().toLowerCase();
    if (cityQ) {
      rows = rows.filter((h) => {
        const raw = h.city.toLowerCase();
        const labelled = cityLabel(h.city).toLowerCase();
        return raw.includes(cityQ) || labelled.includes(cityQ);
      });
    }
    if (filterTypology !== 'ALL') rows = rows.filter((h) => h.typology === filterTypology);
    return rows;
  }, [
    items,
    filterSearch,
    filterBusinessType,
    filterPublication,
    filterCityContains,
    filterTypology,
  ]);

  const filtersActive = useMemo(() => {
    return (
      filterSearch.trim() !== '' ||
      filterBusinessType !== 'ALL' ||
      filterPublication !== 'ALL' ||
      filterCityContains.trim() !== '' ||
      filterTypology !== 'ALL'
    );
  }, [
    filterSearch,
    filterBusinessType,
    filterPublication,
    filterCityContains,
    filterTypology,
  ]);

  function clearFilters() {
    setFilterSearch('');
    setFilterBusinessType('ALL');
    setFilterPublication('ALL');
    setFilterCityContains('');
    setFilterTypology('ALL');
  }

  const onDelete = async (id: string) => {
    if (!window.confirm('Eliminar este anúncio e apagar as médias no servidor?')) return;
    setBusyId(id);
    setError('');
    try {
      await api.admin.houses.delete(id);
      setItems((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar.');
    } finally {
      setBusyId(null);
    }
  };

  const onAddWhatsappGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = newGroupName.trim();
    const jid = newGroupJid.trim();
    if (!name) return setError('Indica o nome do grupo.');
    if (!jid) return setError('Indica o JID do grupo (ex.: 120363…@g.us).');
    setSavingWhatsappGroup(true);
    try {
      const created = await api.admin.houseWhatsappGroups.create({
        name,
        groupJid: jid,
        businessType: newGroupBusinessType,
      });
      setWhatsappGroups((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewGroupName('');
      setNewGroupJid('');
      setNewGroupBusinessType('RENT');
      setShowAddWhatsappGroupModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar grupo.');
    } finally {
      setSavingWhatsappGroup(false);
    }
  };

  const onUpdateGroupFinalidade = async (g: WhatsappGroupRow, businessType: 'RENT' | 'SALE') => {
    if (g.businessType === businessType) return;
    setUpdatingGroupPurposeId(g.id);
    setError('');
    try {
      const updated = await api.admin.houseWhatsappGroups.update(g.id, { businessType });
      setWhatsappGroups((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar a finalidade do grupo.');
    } finally {
      setUpdatingGroupPurposeId(null);
    }
  };

  const onToggleGroupActive = async (g: WhatsappGroupRow, next: boolean) => {
    setTogglingGroupId(g.id);
    setError('');
    try {
      const updated = await api.admin.houseWhatsappGroups.update(g.id, { active: next });
      setWhatsappGroups((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar grupo.');
    } finally {
      setTogglingGroupId(null);
    }
  };

  const onDeleteWhatsappGroup = async (id: string) => {
    if (!window.confirm('Remover este grupo da lista?')) return;
    setDeletingGroupId(id);
    setError('');
    try {
      await api.admin.houseWhatsappGroups.delete(id);
      setWhatsappGroups((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover grupo.');
    } finally {
      setDeletingGroupId(null);
    }
  };

  const onSendHouseToWhatsappGroups = async (houseId: string) => {
    if (sendingWhatsappHouseId !== null) return;
    setSendingWhatsappHouseId(houseId);
    setError('');
    try {
      const res = await api.admin.houses.sendToWhatsappGroups(houseId);
      await load();
      if (res.failed.length) {
        setError(
          `Enviado a ${res.sentToGroups} grupo(s). Falhas: ${res.failed.join(' — ')}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar para os grupos.');
      await load();
    } finally {
      setSendingWhatsappHouseId(null);
    }
  };

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Anúncios de casas</h1>
        <p className="mt-2 text-sm text-zinc-600">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Anúncios de casas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Gerir imóveis publicados por parceiros. Ao eliminar, as imagens e vídeos são removidos do armazenamento.
          Anúncios indisponíveis com data de disponibilidade há mais de 2 meses são apagados automaticamente (com
          médias).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-xs text-zinc-500">
            {filtersActive
              ? `A mostrar ${filteredItems.length} de ${items.length}`
              : `Total: ${items.length}`}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditHouseId(null);
              setShowHouseModal(true);
            }}
            className="inline-flex rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white"
          >
            Adicionar casa
          </button>
          <button
            type="button"
            onClick={() => setShowAddWhatsappGroupModal(true)}
            className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            Adicionar grupo
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {showUpdatedBanner ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Anúncio atualizado com sucesso.
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-4xl rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900">Grupos WhatsApp (relocation)</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Só os grupos <strong className="font-semibold">ativos</strong> e com a mesma{' '}
              <strong className="font-semibold">finalidade</strong> que o imóvel (arrendamento ou venda) recebem o
              envio em &quot;Enviar nos grupos&quot;. Ordem: imagens, vídeo (se existir), texto com resumo e descrição
              (sem link).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadWhatsappGroups()}
            disabled={loadingWhatsappGroups}
            className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60 sm:w-auto"
          >
            {loadingWhatsappGroups ? 'A atualizar…' : 'Atualizar lista'}
          </button>
        </div>

        <div className="mt-4">
          {loadingWhatsappGroups ? (
            <p className="text-sm text-zinc-600">A carregar…</p>
          ) : whatsappGroups.length === 0 ? (
            <p className="text-sm text-zinc-500">Ainda não há grupos. Adiciona o primeiro abaixo.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Finalidade</th>
                    <th className="px-3 py-2">JID</th>
                    <th className="px-3 py-2">Ativo</th>
                    <th className="px-3 py-2 text-right">—</th>
                  </tr>
                </thead>
                <tbody>
                  {whatsappGroups.map((g) => (
                    <tr key={g.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2 font-medium text-zinc-900">{g.name}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <select
                          value={g.businessType}
                          disabled={updatingGroupPurposeId === g.id}
                          onChange={(e) =>
                            void onUpdateGroupFinalidade(g, e.target.value as 'RENT' | 'SALE')
                          }
                          className="max-w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
                        >
                          <option value="RENT">{GROUP_FINALIDADE_LABELS.RENT}</option>
                          <option value="SALE">{GROUP_FINALIDADE_LABELS.SALE}</option>
                        </select>
                      </td>
                      <td
                        className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-zinc-600"
                        title={g.groupJid}
                      >
                        {g.groupJid}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
                          <input
                            type="checkbox"
                            checked={g.active}
                            disabled={togglingGroupId === g.id}
                            onChange={(e) => void onToggleGroupActive(g, e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                          {g.active ? 'Sim' : 'Não'}
                        </label>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={deletingGroupId === g.id}
                          onClick={() => void onDeleteWhatsappGroup(g.id)}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingGroupId === g.id ? '…' : 'Remover'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </section>

      {showAddWhatsappGroupModal ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Adicionar grupo WhatsApp</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Cria um grupo para receber envios de imóveis relocation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWhatsappGroupModal(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={(e) => {
                void onAddWhatsappGroup(e);
              }}
              className="space-y-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4"
            >
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-zinc-600">Nome do grupo</span>
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Ex.: Clientes Lisboa"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-zinc-600">Finalidade</span>
                <select
                  value={newGroupBusinessType}
                  onChange={(e) => setNewGroupBusinessType(e.target.value as 'RENT' | 'SALE')}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="RENT">{GROUP_FINALIDADE_LABELS.RENT}</option>
                  <option value="SALE">{GROUP_FINALIDADE_LABELS.SALE}</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-zinc-600">Código (JID)</span>
                <input
                  value={newGroupJid}
                  onChange={(e) => setNewGroupJid(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
                  placeholder="120363407245204550@g.us"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddWhatsappGroupModal(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWhatsappGroup}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingWhatsappGroup ? 'A guardar…' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-600">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum anúncio registado.</p>
      ) : (
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <label className="block text-xs font-medium text-zinc-700 xl:col-span-2">
                  Pesquisar
                  <input
                    type="search"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Título, cidade, parceiro, preço…"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-700">
                  Finalidade
                  <select
                    value={filterBusinessType}
                    onChange={(e) =>
                      setFilterBusinessType(e.target.value as 'ALL' | 'RENT' | 'SALE')
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">Todas</option>
                    <option value="RENT">Arrendamento</option>
                    <option value="SALE">Venda</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-zinc-700">
                  Publicação
                  <select
                    value={filterPublication}
                    onChange={(e) =>
                      setFilterPublication(
                        e.target.value as 'ALL' | 'PUBLISHED' | 'HIDDEN',
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">Todos</option>
                    {(Object.keys(PUBLICATION_STATUS_LABELS) as Array<
                      keyof typeof PUBLICATION_STATUS_LABELS
                    >).map((s) => (
                      <option key={s} value={s}>
                        {PUBLICATION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-zinc-700">
                  Cidade contém
                  <input
                    type="search"
                    value={filterCityContains}
                    onChange={(e) => setFilterCityContains(e.target.value)}
                    placeholder="Texto livre…"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-700">
                  Tipologia
                  <select
                    value={filterTypology}
                    onChange={(e) => setFilterTypology(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">Todas</option>
                    {TYPOLOGIES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          </section>

          {filteredItems.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Nenhum anúncio corresponde aos filtros.{' '}
              <button type="button" onClick={clearFilters} className="font-medium text-amber-800 underline">
                Repor filtros
              </button>
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredItems.map((h) => (
                  <article
                    key={h.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-zinc-900/5"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <Link
                          href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir página do imóvel"
                          className="relative block h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                        >
                          {(() => {
                            const { primaryImageSrc, videoSrc } = getHouseMedia(h);
                            if (primaryImageSrc) {
                              return (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={primaryImageSrc}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              );
                            }
                            if (videoSrc) {
                              return (
                                <video
                                  src={videoSrc}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              );
                            }
                            return (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-400">
                                Sem média
                              </div>
                            );
                          })()}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Título</p>
                          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900">
                            {h.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {cityLabel(h.city)} · {typologyLabel(h.typology)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Finalidade
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-800">
                          {BUSINESS_TYPE_LABELS[h.businessType] ?? h.businessType}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          {h.businessType === 'SALE' ? 'Preço de venda' : 'Renda mensal'}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
                          {formatAdminHousePriceEur(h.priceEur, h.businessType)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Publicação</p>
                        <div className="mt-1">
                          <HousePublicationStatusBadge
                            publicationStatus={h.publicationStatus}
                            publishedUntil={h.publishedUntil}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Enviado em
                        </p>
                        <p
                          className={`mt-0.5 whitespace-pre-line text-sm ${
                            h.partner.category?.slug === 'relocation' &&
                            sendingWhatsappHouseId === h.id
                              ? 'font-medium text-emerald-800'
                              : 'text-zinc-800'
                          }`}
                          title={
                            h.partner.category?.slug === 'relocation' && h.whatsappError?.trim()
                              ? h.whatsappError
                              : undefined
                          }
                        >
                          {h.partner.category?.slug !== 'relocation'
                            ? '—'
                            : sendingWhatsappHouseId === h.id
                              ? 'Enviando...'
                              : adminHouseWhatsAppSendDatesLabel(h)}
                        </p>
                      </div>
                      <div className="flex flex-nowrap items-center justify-center gap-2 border-t border-zinc-100 pt-3">
                        {h.partner.category?.slug === 'relocation' ? (
                          <button
                            type="button"
                            title="Enviar nos grupos WhatsApp"
                            aria-label="Enviar nos grupos WhatsApp"
                            disabled={sendingWhatsappHouseId !== null}
                            onClick={() => void onSendHouseToWhatsappGroups(h.id)}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {sendingWhatsappHouseId === h.id ? (
                              <svg
                                className="h-5 w-5 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                                />
                              </svg>
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setEditHouseId(h.id);
                            setShowHouseModal(true);
                          }}
                          title="Editar anúncio"
                          aria-label="Editar anúncio"
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Eliminar anúncio"
                          aria-label="Eliminar anúncio"
                          disabled={busyId === h.id}
                          onClick={() => onDelete(h.id)}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {busyId === h.id ? (
                            <svg
                              className="h-5 w-5 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.008 0L9.22 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 bg-white md:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-2 text-left">Id</th>
                      <th className="w-[76px] px-4 py-2 text-left">Thumb</th>
                      <th className="px-4 py-2 text-left">Título</th>
                      <th className="whitespace-nowrap px-4 py-2 text-right tabular-nums">Clicks</th>
                      <th className="px-4 py-2 text-left">Finalidade</th>
                      <th className="px-4 py-2 text-left">Preço</th>
                      <th className="px-4 py-2 text-left">Parceiro</th>
                      <th className="px-4 py-2 text-left">Estado</th>
                      <th className="px-4 py-2 text-left">Disponível a partir</th>
                      <th className="px-4 py-2 text-left">Criado</th>
                      <th className="px-4 py-2 text-left">Enviado em</th>
                      <th className="px-4 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((h) => (
                      <tr key={h.id} className="border-t border-zinc-200">
                        <td className="whitespace-nowrap px-4 py-2 align-top font-mono text-xs tabular-nums text-zinc-700">
                          {h.houseId}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <Link
                            href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Abrir página do imóvel"
                            className="relative block h-10 w-14 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100"
                          >
                            {(() => {
                              const { primaryImageSrc, videoSrc } = getHouseMedia(h);
                              if (primaryImageSrc) {
                                return (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={primaryImageSrc}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                );
                              }
                              if (videoSrc) {
                                return (
                                  <video
                                    src={videoSrc}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                  />
                                );
                              }
                              return null;
                            })()}
                          </Link>
                        </td>
                        <td className="max-w-[200px] px-4 py-2 align-top">
                          <span className="line-clamp-2 font-medium text-zinc-900">{h.title}</span>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {cityLabel(h.city)} · {typologyLabel(h.typology)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 align-top text-right font-semibold tabular-nums text-zinc-900">
                          {h._count.redirectClicks}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 align-top text-zinc-800">
                          {BUSINESS_TYPE_LABELS[h.businessType] ?? h.businessType}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 align-top font-medium tabular-nums text-zinc-900">
                          {formatAdminHousePriceEur(h.priceEur, h.businessType)}
                        </td>
                        <td className="px-4 py-2 align-top">{h.partner.name}</td>
                        <td className="px-4 py-2 align-top">
                          <HousePublicationStatusBadge
                            publicationStatus={h.publicationStatus}
                            publishedUntil={h.publishedUntil}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 align-top">
                          {new Date(h.availableFrom).toLocaleDateString('pt-PT')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 align-top">
                          {new Date(h.createdAt).toLocaleDateString('pt-PT')}
                        </td>
                        <td
                          className="whitespace-pre-line px-4 py-2 align-top text-xs text-zinc-700"
                          title={h.whatsappError?.trim() ? h.whatsappError : undefined}
                        >
                          {h.partner.category?.slug === 'relocation'
                            ? adminHouseWhatsAppSendDatesLabel(h)
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-right align-top">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {h.partner.category?.slug === 'relocation' ? (
                              <button
                                type="button"
                                title="Enviar nos grupos WhatsApp"
                                aria-label="Enviar nos grupos WhatsApp"
                                disabled={sendingWhatsappHouseId !== null}
                                onClick={() => void onSendHouseToWhatsappGroups(h.id)}
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {sendingWhatsappHouseId === h.id ? (
                                  <svg
                                    className="h-4 w-4 animate-spin"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                                    />
                                  </svg>
                                )}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setEditHouseId(h.id);
                                setShowHouseModal(true);
                              }}
                              title="Editar anúncio"
                              aria-label="Editar anúncio"
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Eliminar anúncio"
                              aria-label="Eliminar anúncio"
                              disabled={busyId === h.id}
                              onClick={() => onDelete(h.id)}
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyId === h.id ? (
                                <svg
                                  className="h-4 w-4 animate-spin"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                  aria-hidden
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.74 9l-.346 9m-4.008 0L9.22 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <AddHouseModal
        open={showHouseModal}
        houseId={editHouseId}
        onClose={() => {
          setShowHouseModal(false);
          setEditHouseId(null);
        }}
        onSuccess={() => {
          void load();
          if (editHouseId) setShowUpdatedBanner(true);
        }}
        mode="admin"
        extraCityOptions={extraRelocationCitiesFromHouses}
      />


    </div>
  );
}
