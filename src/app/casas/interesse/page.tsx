"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { buildAdminWhatsAppUrl } from "@/lib/admin-contact-whatsapp";

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

type ListingFields = {
  partnerId: string;
  title: string;
  city: string;
  typology: string;
  price: string;
};

function buildLeadMessageFromFields(f: ListingFields, partnerName: string) {
  const cityLabel = CITY_LABELS[f.city] ?? f.city;
  const typologyLabel = TYPOLOGY_LABELS[f.typology] ?? f.typology;
  return `Olá, gostaria de mais informações sobre o imóvel ${typologyLabel} por ${f.price} em ${cityLabel} com título ${f.title}. Atendimento com ${partnerName}.`;
}

function CasasInteresseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const didAttemptWaRedirect = useRef(false);

  const houseId = (searchParams.get("houseId") ?? "").trim();
  const partnerId = (searchParams.get("partnerId") ?? "").trim();
  const title = (searchParams.get("title") ?? "").trim();
  const city = (searchParams.get("city") ?? "").trim();
  const typology = (searchParams.get("typology") ?? "").trim();
  const price = (searchParams.get("price") ?? "").trim();

  useEffect(() => {
    if (houseId) {
      router.replace(`/dashboard/casas/${houseId}`);
    }
  }, [houseId, router]);

  const paramsOk = Boolean(partnerId && title && city && typology && price);

  const openWhatsAppForPartner = useCallback(async (listing?: ListingFields) => {
    const fields: ListingFields = listing ?? {
      partnerId,
      title,
      city,
      typology,
      price,
    };
    if (!paramsOk || !fields.partnerId) return;
    setRedirecting(true);
    setError("");
    try {
      const partner = await api.marketplace.partnerDetails(fields.partnerId);
      const text = buildLeadMessageFromFields(fields, partner.name);
      window.location.assign(buildAdminWhatsAppUrl(text));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os dados do parceiro.",
      );
      setRedirecting(false);
    }
  }, [paramsOk, partnerId, title, city, typology, price]);

  useEffect(() => {
    if (houseId) return;
    if (!paramsOk) return;
    if (didAttemptWaRedirect.current) return;

    const run = async () => {
      didAttemptWaRedirect.current = true;
      await openWhatsAppForPartner();
    };

    void run();
  }, [paramsOk, houseId, openWhatsAppForPartner]);

  if (houseId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        A abrir o anúncio…
      </div>
    );
  }

  if (!paramsOk) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-zinc-900">Link inválido</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Faltam parâmetros neste link. Volta ao grupo e abre o link que veio na publicação do imóvel.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">A abrir o WhatsApp…</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Se o WhatsApp não abrir, verifica se o bloqueador de pop-ups está desativado ou tenta outra vez.
      </p>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {!redirecting && !error && (
        <button
          type="button"
          onClick={() => {
            void (async () => {
              didAttemptWaRedirect.current = false;
              await openWhatsAppForPartner();
            })();
          }}
          className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-3 text-sm font-semibold text-white"
        >
          Abrir WhatsApp
        </button>
      )}
    </div>
  );
}

export default function CasasInteressePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Suspense
        fallback={
          <div className="px-4 py-16 text-center text-sm text-zinc-600">A carregar…</div>
        }
      >
        <CasasInteresseContent />
      </Suspense>
    </div>
  );
}
