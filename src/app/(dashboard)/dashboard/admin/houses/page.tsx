'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HouseStatusBadge } from '@/components/house/HouseStatusBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AdminHouseRow = Awaited<ReturnType<typeof api.admin.houses.list>>[number];

const BUSINESS_TYPE_LABELS: Record<'RENT' | 'SALE', string> = {
  RENT: 'Arrendamento',
  SALE: 'Venda',
};

const HOUSE_STATUS_LABELS: Record<'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE', string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  UNAVAILABLE: 'Indisponível',
};

const CITIES = [
  { id: 'INTERIOR', label: 'Interior' },
  { id: 'LISBOA', label: 'Lisboa' },
  { id: 'PORTO', label: 'Porto' },
  { id: 'BRAGA', label: 'Braga' },
  { id: 'COIMBRA', label: 'Coimbra' },
  { id: 'AVEIRO', label: 'Aveiro' },
  { id: 'FARO', label: 'Faro' },
  { id: 'ALGARVE', label: 'Algarve' },
  { id: 'EVORA', label: 'Évora' },
  { id: 'VISEU', label: 'Viseu' },
] as const;

const TYPOLOGIES = [
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

const ENTRADA_COUNT_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i));

function cityLabel(id: string): string {
  return CITIES.find((c) => c.id === id)?.label ?? id;
}

function typologyLabel(id: string): string {
  return TYPOLOGIES.find((t) => t.id === id)?.label ?? id;
}

function todayLocalDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AdminHousesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<AdminHouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [typology, setTypology] = useState<(typeof TYPOLOGIES)[number]['id']>('T2');
  const [businessType, setBusinessType] = useState<(typeof BUSINESS_TYPES)[number]['id']>('RENT');
  const [city, setCity] = useState('');
  const [availableFrom, setAvailableFrom] = useState(() => todayLocalDateInputValue());
  const [priceEur, setPriceEur] = useState('');
  const [relocationFeeEur, setRelocationFeeEur] = useState('');
  const [caucoesCount, setCaucoesCount] = useState('0');
  const [rendasEntradaCount, setRendasEntradaCount] = useState('0');
  const [furnished, setFurnished] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [video, setVideo] = useState<File | null>(null);
  const [relocationPartners, setRelocationPartners] = useState<{ id: string; name: string }[]>([]);
  const [createAssignedPartnerId, setCreateAssignedPartnerId] = useState('');

  const [filterSearch, setFilterSearch] = useState('');
  const [filterBusinessType, setFilterBusinessType] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE'>('ALL');
  const [filterCityContains, setFilterCityContains] = useState('');
  const [filterTypology, setFilterTypology] = useState<string>('ALL');
  const [filterPartnerId, setFilterPartnerId] = useState<string>('ALL');

  const load = useCallback(async () => {
    const data = await api.admin.houses.list();
    setItems(data);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar anúncios.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, load]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const list = await api.admin.partners.list();
        const reloc = list
          .filter((p) => p.category?.slug === 'relocation')
          .map((p) => ({ id: p.id, name: p.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
        setRelocationPartners(reloc);
      } catch {
        setRelocationPartners([]);
      }
    })();
  }, [isAdmin]);

  const partnerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of items) {
      map.set(h.partner.id, h.partner.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-PT'));
  }, [items]);

  const filteredItems = useMemo(() => {
    let rows = items;
    const q = filterSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((h) => {
        const cityPt = cityLabel(h.city).toLowerCase();
        const typoPt = typologyLabel(h.typology).toLowerCase();
        const hay = [
          h.title,
          h.city,
          cityPt,
          h.typology,
          typoPt,
          h.partner.name,
          h.priceEur,
          BUSINESS_TYPE_LABELS[h.businessType],
          HOUSE_STATUS_LABELS[h.status],
          h.partner.category?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filterBusinessType !== 'ALL') rows = rows.filter((h) => h.businessType === filterBusinessType);
    if (filterStatus !== 'ALL') rows = rows.filter((h) => h.status === filterStatus);
    const cityQ = filterCityContains.trim().toLowerCase();
    if (cityQ) {
      rows = rows.filter((h) => {
        const raw = h.city.toLowerCase();
        const labelled = cityLabel(h.city).toLowerCase();
        return raw.includes(cityQ) || labelled.includes(cityQ);
      });
    }
    if (filterTypology !== 'ALL') rows = rows.filter((h) => h.typology === filterTypology);
    if (filterPartnerId !== 'ALL') rows = rows.filter((h) => h.partner.id === filterPartnerId);
    return rows;
  }, [
    items,
    filterSearch,
    filterBusinessType,
    filterStatus,
    filterCityContains,
    filterTypology,
    filterPartnerId,
  ]);

  const filtersActive = useMemo(() => {
    return (
      filterSearch.trim() !== '' ||
      filterBusinessType !== 'ALL' ||
      filterStatus !== 'ALL' ||
      filterCityContains.trim() !== '' ||
      filterTypology !== 'ALL' ||
      filterPartnerId !== 'ALL'
    );
  }, [
    filterSearch,
    filterBusinessType,
    filterStatus,
    filterCityContains,
    filterTypology,
    filterPartnerId,
  ]);

  function clearFilters() {
    setFilterSearch('');
    setFilterBusinessType('ALL');
    setFilterStatus('ALL');
    setFilterCityContains('');
    setFilterTypology('ALL');
    setFilterPartnerId('ALL');
  }

  useEffect(() => {
    setCoverImageIndex((idx) => Math.min(idx, Math.max(images.length - 1, 0)));
  }, [images.length]);

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setTypology('T2');
    setBusinessType('RENT');
    setCity('');
    setAvailableFrom(todayLocalDateInputValue());
    setPriceEur('');
    setRelocationFeeEur('');
    setCaucoesCount('0');
    setRendasEntradaCount('0');
    setFurnished(false);
    setImages([]);
    setCoverImageIndex(0);
    setVideo(null);
    setCreateAssignedPartnerId('');
  };

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

  const onCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanPrice = priceEur.trim();
    const cleanRelocation = relocationFeeEur.trim().replace(/\s*€\s*$/i, '').trim();
    const cleanCity = city.trim();
    if (!cleanTitle) return setError('Preenche o título do imóvel.');
    if (!cleanDesc) return setError('Preenche a descrição.');
    if (!cleanCity) return setError('Preenche a cidade.');
    if (!availableFrom) return setError('Seleciona a data em "Disponível a partir".');
    if (!cleanPrice) {
      return setError(businessType === 'SALE' ? 'Preenche o preço de venda.' : 'Preenche o preço do arrendamento.');
    }
    if (!cleanRelocation) return setError('Preenche a taxa de relocation.');
    if (images.length === 0 && !video) return setError('Adiciona pelo menos 1 imagem ou 1 vídeo.');
    if (images.length > 6) return setError('Podes enviar no máximo 6 imagens.');

    setSavingCreate(true);
    try {
      await api.admin.houses.create({
        ...(images.length ? { images } : {}),
        ...(video ? { video } : {}),
        title: cleanTitle,
        description: cleanDesc,
        businessType,
        typology,
        city: cleanCity,
        availableFrom,
        priceEur: cleanPrice,
        relocationFeeEur: cleanRelocation,
        caucoesCount,
        rendasEntradaCount,
        furnished,
        ...(images.length ? { coverImageIndex } : {}),
        ...(createAssignedPartnerId.trim()
          ? { partnerId: createAssignedPartnerId.trim() }
          : {}),
      });
      await load();
      resetCreateForm();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar anúncio.');
    } finally {
      setSavingCreate(false);
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
            onClick={() => setShowCreateModal(true)}
            className="inline-flex rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white"
          >
            Adicionar casa
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

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
                  Estado
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as 'ALL' | 'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE',
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">Todos</option>
                    {(Object.keys(HOUSE_STATUS_LABELS) as Array<keyof typeof HOUSE_STATUS_LABELS>).map(
                      (s) => (
                        <option key={s} value={s}>
                          {HOUSE_STATUS_LABELS[s]}
                        </option>
                      ),
                    )}
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
                <label className="block text-xs font-medium text-zinc-700">
                  Parceiro
                  <select
                    value={filterPartnerId}
                    onChange={(e) => setFilterPartnerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">Todos</option>
                    {partnerOptions.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
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
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Título</th>
                    <th className="px-4 py-2 text-left">Finalidade</th>
                    <th className="px-4 py-2 text-left">Parceiro</th>
                    <th className="px-4 py-2 text-left">Categoria</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Disponível a partir</th>
                    <th className="px-4 py-2 text-left">Criado</th>
                    <th className="px-4 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((h) => (
                    <tr key={h.id} className="border-t border-zinc-200">
                      <td className="max-w-[200px] px-4 py-2 align-top">
                        <span className="line-clamp-2 font-medium text-zinc-900">{h.title}</span>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {cityLabel(h.city)} · {typologyLabel(h.typology)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 align-top text-zinc-800">
                        {BUSINESS_TYPE_LABELS[h.businessType] ?? h.businessType}
                      </td>
                      <td className="px-4 py-2 align-top">{h.partner.name}</td>
                      <td className="px-4 py-2 align-top">
                        {h.partner.category?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <HouseStatusBadge status={h.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 align-top">
                        {new Date(h.availableFrom).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 align-top">
                        {new Date(h.createdAt).toLocaleString('pt-PT')}
                      </td>
                      <td className="px-4 py-2 text-right align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                          >
                            Ver imóvel
                          </Link>
                          <button
                            type="button"
                            disabled={busyId === h.id}
                            onClick={() => onDelete(h.id)}
                            className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {busyId === h.id ? 'A apagar…' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreateModal ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Adicionar casa</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Este fluxo envia o anúncio para a plataforma e para o grupo WhatsApp, igual ao fluxo de parceiros.{' '}
                  {createAssignedPartnerId.trim() ? (
                    <>
                      O anúncio fica titulado pelo parceiro escolhido; na página pública, o contacto é o WhatsApp
                      desse parceiro.
                    </>
                  ) : (
                    <>
                      Sem parceiro escolhido, o anúncio usa a conta relocation interna do administrador e o contacto
                      na página pública é o WhatsApp do admin.
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={onCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">
                    Parceiro relocation (titular do anúncio)
                  </span>
                  <select
                    value={createAssignedPartnerId}
                    onChange={(e) => setCreateAssignedPartnerId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="">Administrador — conta relocation interna</option>
                    {relocationPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-zinc-500">
                    Só são listados parceiros com categoria Relocation (definida na área de parceiros).
                  </span>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Título</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Ex.: T2 mobilado no Porto"
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Cidade</span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex.: Lisboa, Matosinhos"
                    autoComplete="address-level2"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400"
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Tipologia</span>
                  <select
                    value={typology}
                    onChange={(e) => setTypology(e.target.value as (typeof TYPOLOGIES)[number]['id'])}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {TYPOLOGIES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Finalidade</span>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as (typeof BUSINESS_TYPES)[number]['id'])}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Disponível a partir</span>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">
                    {businessType === 'SALE' ? 'Preço de venda (EUR)' : 'Renda mensal (EUR)'}
                  </span>
                  <input
                    value={priceEur}
                    onChange={(e) => setPriceEur(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Taxa relocation (EUR)</span>
                  <input
                    value={relocationFeeEur}
                    onChange={(e) => setRelocationFeeEur(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-zinc-700">Cauções</span>
                    <select
                      value={caucoesCount}
                      onChange={(e) => setCaucoesCount(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {ENTRADA_COUNT_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-zinc-700">Rendas antecipadas</span>
                    <select
                      value={rendasEntradaCount}
                      onChange={(e) => setRendasEntradaCount(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {ENTRADA_COUNT_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={furnished}
                    onChange={(e) => setFurnished(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Imóvel mobilado
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-zinc-700">Descrição</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Fotos (até 6)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 6))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs text-zinc-500">{images.length}/6 selecionadas</span>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Vídeo (opcional)</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              {images.length > 1 ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">Foto principal</span>
                  <select
                    value={coverImageIndex}
                    onChange={(e) => setCoverImageIndex(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  >
                    {images.map((img, idx) => (
                      <option key={`${img.name}-${idx}`} value={idx}>
                        Foto {idx + 1} - {img.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCreate}
                  className="rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingCreate ? 'A publicar…' : 'Publicar imóvel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
