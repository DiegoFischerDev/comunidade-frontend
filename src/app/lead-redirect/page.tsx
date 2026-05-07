"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type StartAttendanceResponse = {
  waMeUrl: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function LeadRedirectPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  const leadId = searchParams.get("leadId")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";

  const endpoint = useMemo(() => {
    const q = new URLSearchParams();
    if (token) q.set("token", token);
    return `${API_URL}/partners/public/leads/${encodeURIComponent(leadId)}/start-attendance${
      q.toString() ? `?${q.toString()}` : ""
    }`;
  }, [leadId, token]);

  useEffect(() => {
    if (!leadId || !token) {
      setError("Link inválido.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpoint, { method: "POST" });
        const data = (await res.json().catch(() => null)) as StartAttendanceResponse | null;
        if (!res.ok) {
          const msg =
            (data as any)?.message ||
            (data as any)?.error ||
            "Não foi possível iniciar o atendimento.";
          throw new Error(typeof msg === "string" ? msg : "Erro ao iniciar atendimento.");
        }
        if (!data?.waMeUrl) throw new Error("Resposta inválida do servidor.");
        if (!cancelled) window.location.assign(data.waMeUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao iniciar atendimento.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint, leadId, token]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-xl font-semibold text-zinc-900">Abrindo WhatsApp…</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Estamos registrando o início do atendimento e abrindo a conversa com o lead.
      </p>
      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-600">Aguarde alguns segundos…</p>
      )}
    </div>
  );
}

