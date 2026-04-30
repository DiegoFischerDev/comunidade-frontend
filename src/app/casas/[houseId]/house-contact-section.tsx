"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton } from "@/components/ui/CardButton";

type Props = {
  houseId: string;
  partnerId: string;
  title: string;
  city: string;
  businessType: "RENT" | "SALE";
  typology: string;
  priceEur: string;
  furnished: boolean;
  status: "AVAILABLE" | "RESERVED" | "UNAVAILABLE";
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
  businessType: "RENT" | "SALE";
  typology: string;
  price: string;
  furnished: boolean;
}) {
  const cityLabel = CITY_LABELS[f.city] ?? f.city;
  const typologyLabel = TYPOLOGY_LABELS[f.typology] ?? f.typology;
  const mobilado = f.furnished ? "mobilado" : "não mobilado";
  const finalidade = f.businessType === "SALE" ? "venda" : "arrendamento";
  return `Olá, gostaria de mais informações sobre o imóvel ${typologyLabel} (${mobilado}), para ${finalidade}, por ${f.price} em ${cityLabel} com título ${f.title}.`;
}

export function HouseContactSection({
  houseId,
  partnerId,
  title,
  city,
  businessType,
  typology,
  priceEur,
  furnished,
  status,
}: Props) {
  const { user, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
        businessType: data.businessType,
        typology: data.typology,
        price: data.priceEur,
        furnished: data.furnished,
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

  if (status === "RESERVED") {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Este imóvel está <strong className="font-semibold">reservado</strong>. Explora outros anúncios na{" "}
        <Link href="/dashboard/relocation" className="font-medium text-amber-900 underline">
          listagem Relocation
        </Link>
        .
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">A carregar sessão…</p>;
  }

  return (
    <div className="space-y-3">
      <CardButton
        type="button"
        variant="primary"
        disabled={busy || loading}
        onClick={() => {
          if (!user) {
            window.dispatchEvent(
              new CustomEvent("open-auth-modal", {
                detail: { mode: "login" },
              }),
            );
            return;
          }
          void openWhatsApp();
        }}
        className="w-full rounded-xl px-5 py-3.5 sm:w-auto"
      >
        {busy ? "A abrir…" : "Contactar no WhatsApp"}
      </CardButton>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
