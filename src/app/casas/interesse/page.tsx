"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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

function buildLeadMessageFromFields(f: ListingFields) {
  const cityLabel = CITY_LABELS[f.city] ?? f.city;
  const typologyLabel = TYPOLOGY_LABELS[f.typology] ?? f.typology;
  return `Olá, gostaria de mais informações sobre o imóvel ${typologyLabel} por ${f.price} em ${cityLabel} com título ${f.title}.`;
}

function CasasInteresseContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");
  const didAttemptWaRedirect = useRef(false);

  const houseId = (searchParams.get("houseId") ?? "").trim();
  const partnerId = (searchParams.get("partnerId") ?? "").trim();
  const title = (searchParams.get("title") ?? "").trim();
  const city = (searchParams.get("city") ?? "").trim();
  const typology = (searchParams.get("typology") ?? "").trim();
  const price = (searchParams.get("price") ?? "").trim();

  const nextTarget = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const loginHref = `/login?next=${encodeURIComponent(nextTarget)}`;
  const registroHref = `/registro?next=${encodeURIComponent(nextTarget)}`;

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
      const digits = partner.whatsapp.replace(/\D/g, "");
      if (!digits) {
        setError("Não foi possível obter o WhatsApp deste parceiro.");
        setRedirecting(false);
        return;
      }
      try {
        await api.marketplace.registerLead(fields.partnerId);
      } catch {
        // não bloqueia o contacto
      }
      const text = buildLeadMessageFromFields(fields);
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
      window.location.assign(url);
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
    if (authLoading || !paramsOk) return;
    if (!user) return;
    if (didAttemptWaRedirect.current) return;

    const run = async () => {
      let verified: ListingFields | undefined;

      if (houseId) {
        setCheckingAvailability(true);
        try {
          const data = await api.marketplace.houseContact(houseId);
          if (data.partnerId !== partnerId) {
            setError("Este link não corresponde ao anúncio.");
            setCheckingAvailability(false);
            return;
          }
          if (data.status !== "AVAILABLE") {
            setUnavailable(true);
            setCheckingAvailability(false);
            return;
          }
          verified = {
            partnerId: data.partnerId,
            title: data.title,
            city: data.city,
            typology: data.typology,
            price: data.priceEur,
          };
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível verificar se o imóvel ainda está disponível.",
          );
          setCheckingAvailability(false);
          return;
        }
        setCheckingAvailability(false);
      }

      didAttemptWaRedirect.current = true;
      await openWhatsAppForPartner(verified);
    };

    void run();
  }, [authLoading, user, paramsOk, houseId, partnerId, openWhatsAppForPartner]);

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

  if (authLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        A carregar…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-zinc-900">Contactar o parceiro</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Para confirmarmos se o imóvel ainda está disponível e abrir o WhatsApp do parceiro com a mensagem já
          preenchida, inicia sessão na Comunidade RPM. Depois de entrares, o passo seguinte corre automaticamente.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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

  if (unavailable) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-zinc-900">Imóvel já não disponível</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Este anúncio foi marcado como indisponível. Podes voltar ao grupo de casas para ver outras
          publicações ou explorar os parceiros na comunidade.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm"
          >
            Ir à comunidade
          </Link>
          <Link
            href="/dashboard/partners"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Ver parceiros
          </Link>
        </div>
      </div>
    );
  }

  if (checkingAvailability) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        A confirmar se o imóvel ainda está disponível…
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
              if (houseId) {
                setCheckingAvailability(true);
                setError("");
                try {
                  const data = await api.marketplace.houseContact(houseId);
                  if (data.partnerId !== partnerId) {
                    setError("Este link não corresponde ao anúncio.");
                    setCheckingAvailability(false);
                    return;
                  }
                  if (data.status !== "AVAILABLE") {
                    setUnavailable(true);
                    setCheckingAvailability(false);
                    return;
                  }
                  await openWhatsAppForPartner({
                    partnerId: data.partnerId,
                    title: data.title,
                    city: data.city,
                    typology: data.typology,
                    price: data.priceEur,
                  });
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Não foi possível verificar se o imóvel ainda está disponível.",
                  );
                } finally {
                  setCheckingAvailability(false);
                }
                return;
              }
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
