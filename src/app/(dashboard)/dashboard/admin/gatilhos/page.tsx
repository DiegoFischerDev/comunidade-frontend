"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_WHATSAPP_TRIGGERS } from "@/lib/admin-whatsapp-triggers";

export default function AdminGatilhosPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ADMIN_WHATSAPP_TRIGGERS;
    return ADMIN_WHATSAPP_TRIGGERS.filter((t) => {
      const hay = [t.name, t.trigger, t.handledBy, t.action, t.notes ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [q]);

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gatilhos (WhatsApp)</h1>
        <p className="mt-2 text-sm text-muted">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="text-2xl font-semibold text-foreground">Gatilhos (WhatsApp)</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Lista dos gatilhos atualmente suportados e o que cada um dispara. Use para manutenção e
        suporte. O quiz de financiamento foi movido para o dashboard público{' '}
        <a
          href="/financiamento"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-primary underline-offset-2 hover:underline"
        >
          /financiamento
        </a>{' '}
        e já não corre no WhatsApp.
      </p>

      <div className="mt-6 max-w-2xl">
        <label className="block text-xs font-medium text-foreground/90">Filtrar lista</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por nome, texto do gatilho ou ação…"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted/80 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nenhum gatilho encontrado.</p>
      ) : (
        <div className="mt-6 w-full overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
            <thead className="bg-page text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="w-[18%] px-3 py-3">Flow</th>
                <th className="w-[28%] px-3 py-3">Gatilho</th>
                <th className="w-[16%] px-3 py-3">Onde roda</th>
                <th className="w-[28%] px-3 py-3">Ação</th>
                <th className="w-[10%] px-3 py-3">Notas</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {filtered.map((t) => (
                <tr key={t.name} className="border-t border-border align-top">
                  <td className="px-3 py-2.5 text-sm font-semibold text-foreground">
                    {t.name}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-pre-wrap text-foreground/90">
                    {t.trigger}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground/90">{t.handledBy}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-pre-wrap text-foreground/90">
                    {t.action}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-pre-wrap text-muted">
                    {t.notes ?? "—"}
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

