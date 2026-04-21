"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  houseId: string;
  partnerId: string;
  title: string;
  city: string;
  typology: string;
  priceEur: string;
  status: "AVAILABLE" | "UNAVAILABLE";
};

const CITY_LABELS: Record<string, string> = {
  INTERIOR: "Interior",
  LISBOA: "Lisboa",
  PORTO: "Porto",
  BRAGA: "Braga",
  COIMBRA: "Coimbra",
  AVEIRO: "Aveiro",
  FARO: "Faro",
  ALGARVE: "Algarve",
  EVORA: "Évora",
  VISEU: "Viseu",
};

const TYPOLOGY_LABELS: Record<string, string> = {
  T1: "T1",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap compartilhado",
};

function buildLeadMessage(f: {
  title: string;
  city: string;
  typology: string;
  price: string;
}) {
  const cityLabel = CITY_LABELS[f.city] ?? f.city;
  const typologyLabel = TYPOLOGY_LABELS[f.typology] ?? f.typology;
  return `Olá, gostaria de mais informações sobre o imóvel ${typologyLabel} por ${f.price} em ${cityLabel} com título ${f.title}.`;
}

export function HouseContactSection({
  houseId,
  partnerId,
  title,
  city,
  typology,
  priceEur,
  status,
}: Props) {
  const { user, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextPath = `/casas/${houseId}`;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const registroHref = `/registro?next=${encodeURIComponent(nextPath)}`;

  const openWhatsApp = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api.marketplace.houseContact(houseId);
      if (data.partnerId !== partnerId) {
        setError("Este anúncio não corresponde ao parceiro indicado.");
        setBusy(false);
        return;
      }
      if (data.status !== "AVAILABLE") {
        setError("Este imóvel já não está disponível.");
        setBusy(false);
        return;
      }
      const partner = await api.marketplace.partnerDetails(partnerId);
      const digits = partner.whatsapp.replace(/\D/g, "");
      if (!digits) {
        setError("Não foi possível obter o WhatsApp deste parceiro.");
        setBusy(false);
        return;
      }
      try {
        await api.marketplace.registerLead(partnerId);
      } catch {
        /* não bloqueia */
      }
      const text = buildLeadMessage({
        title: data.title,
        city: data.city,
        typology: data.typology,
        price: data.priceEur,
      });
      window.location.assign(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível abrir o contacto.",
      );
      setBusy(false);
    }
  }, [houseId, partnerId]);

  if (status === "UNAVAILABLE") {
    return (
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        Este anúncio está indisponível. Explora outros imóveis na{" "}
        <Link href="/dashboard/relocation" className="font-medium text-amber-800 underline">
          listagem Relocation
        </Link>
        .
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">A carregar sessão…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-5 sm:px-6">
        <h2 className="text-sm font-semibold text-zinc-900">Contactar o parceiro</h2>
        <p className="mt-1 text-sm text-zinc-700">
          Inicia sessão na Comunidade RPM para confirmarmos que o imóvel ainda está disponível e abrir o WhatsApp do
          parceiro com uma mensagem já preenchida.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href={loginHref}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm"
          >
            Iniciar sessão
          </Link>
          <Link
            href={registroHref}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void openWhatsApp()}
        className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-5 py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 sm:w-auto"
      >
        {busy ? "A abrir…" : "Contactar parceiro no WhatsApp"}
      </button>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
