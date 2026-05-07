"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type PartnerRow = Awaited<ReturnType<typeof api.admin.partners.list>>[number];
type LeadRow = Awaited<ReturnType<typeof api.admin.leads.list>>[number];

function displayLeadName(l: LeadRow): string {
  if (l.contactName?.trim()) return l.contactName.trim();
  if (l.user?.name?.trim()) return l.user.name.trim();
  return "Cliente WhatsApp";
}

function leadWhatsappDigits(l: LeadRow): string {
  const raw = l.user?.whatsapp ?? l.visitorWhatsapp ?? "";
  return String(raw || "").replace(/\D/g, "");
}

export default function AdminLeadsPage() {
  const { user } = useAuth();

  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [partnerId, setPartnerId] = useState<string>("ALL");
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [filterInput, setFilterInput] = useState("");

  const isAdmin = user?.role === "ADMIN";

  const loadPartners = useCallback(async () => {
    const list = await api.admin.partners.list();
    setPartners(list);
  }, []);

  const loadLeads = useCallback(async () => {
    const data = await api.admin.leads.list(partnerId === "ALL" ? undefined : partnerId);
    setRows(data);
  }, [partnerId]);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      setError("");
      setLoading(true);
      try {
        await Promise.all([loadPartners(), loadLeads()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar leads.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, loadPartners, loadLeads]);

  const filtered = useMemo(() => {
    const q = filterInput.trim().toLowerCase();
    if (!q) return rows;
    const qDigits = q.replace(/\D/g, "");
    return rows.filter((l) => {
      const name = displayLeadName(l).toLowerCase();
      const interest = (l.interestComment ?? "").toLowerCase();
      const partnerName = (l.partner?.name ?? "").toLowerCase();
      const wa = leadWhatsappDigits(l);
      return (
        name.includes(q) ||
        interest.includes(q) ||
        partnerName.includes(q) ||
        (qDigits.length >= 3 && wa.includes(qDigits))
      );
    });
  }, [rows, filterInput]);

  async function handleDelete(leadId: string) {
    if (!confirm("Excluir este lead? Essa ação não pode ser desfeita.")) return;
    setBusyDeleteId(leadId);
    setError("");
    try {
      await api.admin.leads.delete(leadId);
      setRows((prev) => prev.filter((x) => x.id !== leadId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir lead.");
    } finally {
      setBusyDeleteId(null);
    }
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Leads (admin)</h1>
        <p className="mt-2 text-sm text-zinc-600">Esta área é exclusiva para administradores.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="text-2xl font-semibold text-zinc-900">Leads (admin)</h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600">
        Acesse as listas de leads dos parceiros e exclua leads quando necessário.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700">Parceiro</label>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="ALL">Todos</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.category?.slug ? `(${p.category.slug})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-zinc-700">Filtrar lista</label>
          <input
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            placeholder="Pesquisar por nome, interesse, parceiro ou WhatsApp…"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Nenhum lead encontrado.</p>
      ) : (
        <div className="mt-4 w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="w-[16%] px-3 py-3">Parceiro</th>
                <th className="w-[14%] px-3 py-3">Nome</th>
                <th className="w-[30%] px-3 py-3">Interesse</th>
                <th className="w-[12%] px-3 py-3">WhatsApp</th>
                <th className="w-[14%] px-3 py-3">Criado</th>
                <th className="w-[14%] px-3 py-3">Estado</th>
                <th className="w-[10%] px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-zinc-800">
              {filtered.map((l) => {
                const wa = leadWhatsappDigits(l);
                const state = l.attendedAt ? "Já contactado" : "Aguarda contacto";
                return (
                  <tr key={l.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2.5 align-top text-xs">
                      <div className="font-semibold text-zinc-900">{l.partner?.name ?? "—"}</div>
                      <div className="text-zinc-500">{l.partner?.category?.name ?? l.partner?.category?.slug ?? ""}</div>
                    </td>
                    <td className="px-3 py-2.5 align-top text-sm font-medium text-zinc-900">
                      {displayLeadName(l)}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs whitespace-pre-wrap text-zinc-700">
                      {l.interestComment ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-zinc-700">{wa || "—"}</td>
                    <td className="px-3 py-2.5 align-top text-xs text-zinc-700">
                      {new Date(l.createdAt).toLocaleString("pt-PT")}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-zinc-700">{state}</td>
                    <td className="px-3 py-2.5 align-top text-right">
                      <button
                        type="button"
                        disabled={busyDeleteId === l.id}
                        onClick={() => void handleDelete(l.id)}
                        className="inline-flex cursor-pointer rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyDeleteId === l.id ? "Excluindo…" : "Excluir"}
                      </button>
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

