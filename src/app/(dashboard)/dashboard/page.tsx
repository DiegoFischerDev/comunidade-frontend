/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";
  const canSeeAffiliateCard =
    user?.tier === "MEMBER" || user?.role === "PARTNER" || user?.role === "ADMIN";
  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateSaving, setAffiliateSaving] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const [affiliateSuccess, setAffiliateSuccess] = useState("");
  const [affiliateTerms, setAffiliateTerms] = useState(false);
  const [affiliateInstagram, setAffiliateInstagram] = useState(user?.instagram ?? "");
  const [affiliatePayoutMethod, setAffiliatePayoutMethod] = useState<"MBWAY" | "PIX">("MBWAY");
  const [affiliateMbwayNumber, setAffiliateMbwayNumber] = useState("");
  const [affiliateMbwayName, setAffiliateMbwayName] = useState("");
  const [affiliatePixKey, setAffiliatePixKey] = useState("");
  const [affiliatePixName, setAffiliatePixName] = useState("");

  const pdfHref = isMember ? "/psp/full" : "/psp";

  useEffect(() => {
    setAffiliateInstagram(user?.instagram ?? "");
  }, [user?.instagram]);

  async function handleAffiliateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAffiliateError("");
    setAffiliateSuccess("");
    setAffiliateSaving(true);
    try {
      await api.affiliate.enroll({
        instagramHandle: affiliateInstagram,
        termsAccepted: affiliateTerms,
        payoutMethod: affiliatePayoutMethod,
        mbwayNumber: affiliatePayoutMethod === "MBWAY" ? affiliateMbwayNumber : undefined,
        mbwayName: affiliatePayoutMethod === "MBWAY" ? affiliateMbwayName : undefined,
        pixKey: affiliatePayoutMethod === "PIX" ? affiliatePixKey : undefined,
        pixName: affiliatePayoutMethod === "PIX" ? affiliatePixName : undefined,
      });
      setAffiliateSuccess("Afiliação confirmada com sucesso.");
      setAffiliateModalOpen(false);
    } catch (err) {
      setAffiliateError(
        err instanceof Error ? err.message : "Erro ao ativar programa de afiliados.",
      );
    } finally {
      setAffiliateSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Bem-vindo à Comunidade RPM. Em breve: Ebook, curso em vídeo e
          produtos.
        </p>
      </div>

      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:w-1/2">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Wrapper com proporção fixa para não cortar a imagem */}
          <div className="relative w-full overflow-hidden rounded-xl bg-zinc-100 md:w-80 aspect-[2/1]">
            <Image
              src="/capa_psp-1000x500.png"
              alt="Capa do guia PSP - Portugal Sem Perrengue"
              fill
              className="object-contain"
              sizes="(min-width: 768px) 320px, 100vw"
              priority
            />
          </div>

          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              PSP - Portugal Sem Perrengue
            </h2>
            <p className="text-sm text-zinc-600">
              O guia real pra sair do Brasil e morar legalmente em Portugal.
              Aqui você encontra o passo a passo, documentos, prazos e
              estratégias para fazer essa mudança com segurança.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={pdfHref}
                className="inline-flex items-center rounded-lg bg-[#edbfbf] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-[#e3afaf]"
              >
                Acessar PDF
              </Link>
            </div>
          </div>
        </div>
      </section>

      {canSeeAffiliateCard && (
        <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl">
            <Image
              src="/afiliados.png"
              alt="Programa de afiliados"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
            />
          </div>
          <h2 className="text-base font-semibold text-zinc-900">
            Programa de Afiliados
          </h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            <Image
              src="/euro2.png"
              alt="Comissão por indicação"
              width={18}
              height={18}
            />
            <span>€10 por indicação</span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Ajude a nossa comunidade a crescer e seja recompensado por isso.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Convide pessoas com o seu link exclusivo. Quando alguém se tornar membro ativo da Comunidade RPM, você recebe comissão por indicação.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setAffiliateModalOpen(true)}
              className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Ver programa de afiliados
            </button>
          </div>
        </section>
      )}

      {affiliateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !affiliateSaving && setAffiliateModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mb-4 h-52 w-full overflow-hidden rounded-xl">
              <Image
                src="/afiliados.png"
                alt="Programa de afiliados"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 512px"
              />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">Tornar-se afiliado</h3>
            <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
              <p className="font-medium text-zinc-800">Termos e condições de afiliação</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  A comissão é de <span className="font-semibold">€ 10</span> por cada indicado que concluir o pagamento da anuidade e se tornar membro ativo.
                </li>
                <li>Indicações que não concluírem o pagamento da anuidade não geram comissão.</li>
                <li>Cada usuário indicado gera comissão uma única vez.</li>
                <li>Os pagamentos das comissões aprovadas são processados ao final de cada mês.</li>
                <li>O afiliado é responsável por manter os dados de pagamento atualizados (MB Way ou PIX).</li>
              </ul>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleAffiliateSubmit}>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Seu usuário do Instagram</label>
                <input
                  type="text"
                  value={affiliateInstagram}
                  onChange={(e) => setAffiliateInstagram(e.target.value)}
                  placeholder="@seuinstagram"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Como deseja receber comissões?</label>
                <select
                  value={affiliatePayoutMethod}
                  onChange={(e) => setAffiliatePayoutMethod(e.target.value as "MBWAY" | "PIX")}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="MBWAY">MB Way</option>
                  <option value="PIX">PIX</option>
                </select>
              </div>
              {affiliatePayoutMethod === "MBWAY" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={affiliateMbwayNumber}
                    onChange={(e) => setAffiliateMbwayNumber(e.target.value)}
                    placeholder="Número MB Way"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                  <input
                    type="text"
                    value={affiliateMbwayName}
                    onChange={(e) => setAffiliateMbwayName(e.target.value)}
                    placeholder="Nome do titular"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={affiliatePixKey}
                    onChange={(e) => setAffiliatePixKey(e.target.value)}
                    placeholder="Chave PIX"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                  <input
                    type="text"
                    value={affiliatePixName}
                    onChange={(e) => setAffiliatePixName(e.target.value)}
                    placeholder="Nome do titular"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={affiliateTerms}
                  onChange={(e) => setAffiliateTerms(e.target.checked)}
                  required
                />
                Li e aceito os termos de afiliação
              </label>
              {affiliateError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {affiliateError}
                </div>
              )}
              {affiliateSuccess && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {affiliateSuccess}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !affiliateSaving && setAffiliateModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={affiliateSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  {affiliateSaving ? "Confirmando…" : "Confirmar afiliação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
