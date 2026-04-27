"use client";

import Image from "next/image";
import { CardButton } from "@/components/ui/CardButton";

type AffiliatePayoutMethod = "MBWAY" | "PIX";

type AffiliateEnrollModalProps = {
  open: boolean;
  saving: boolean;
  error?: string;
  instagram: string;
  payoutMethod: AffiliatePayoutMethod;
  mbwayNumber: string;
  mbwayName: string;
  pixKey: string;
  pixName: string;
  termsAccepted: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInstagramChange: (value: string) => void;
  onPayoutMethodChange: (value: AffiliatePayoutMethod) => void;
  onMbwayNumberChange: (value: string) => void;
  onMbwayNameChange: (value: string) => void;
  onPixKeyChange: (value: string) => void;
  onPixNameChange: (value: string) => void;
  onTermsAcceptedChange: (value: boolean) => void;
};

function normalizeInstagramHandle(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  return clean.startsWith("@") ? clean : `@${clean}`;
}

export function AffiliateEnrollModal({
  open,
  saving,
  error,
  instagram,
  payoutMethod,
  mbwayNumber,
  mbwayName,
  pixKey,
  pixName,
  termsAccepted,
  onClose,
  onSubmit,
  onInstagramChange,
  onPayoutMethodChange,
  onMbwayNumberChange,
  onMbwayNameChange,
  onPixKeyChange,
  onPixNameChange,
  onTermsAcceptedChange,
}: AffiliateEnrollModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={() => !saving && onClose()}
      role="presentation"
    >
      <div
        className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full overflow-hidden bg-zinc-100">
          <Image
            src="/rafa_cards/hero_pc_vip.png"
            alt="Programa de afiliados — receba €10 por cada indicação"
            width={5000}
            height={2188}
            className="block h-auto w-full"
            sizes="(max-width: 48rem) 100vw, 48rem"
            unoptimized
            priority
          />
        </div>
        <div className="p-5">
          <h3 className="text-base font-semibold text-zinc-900">Tornar-se afiliado</h3>
          <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            <p className="font-medium text-zinc-800">Termos e condições de afiliação</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                A comissão é de <span className="font-semibold">€ 10</span> por cada indicado que
                concluir o pagamento da anuidade e se tornar membro VIP.
              </li>
              <li>Indicações que não concluírem o pagamento da anuidade não geram comissão.</li>
              <li>Cada usuário indicado gera comissão uma única vez.</li>
              <li>Os pagamentos das comissões aprovadas são processados ao final de cada mês.</li>
              <li>
                O afiliado é responsável por manter os dados de pagamento atualizados (MB Way ou
                PIX).
              </li>
            </ul>
          </div>
          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Seu usuário do Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => onInstagramChange(normalizeInstagramHandle(e.target.value))}
                placeholder="@seuinstagram"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Como deseja receber comissões?
              </label>
              <select
                value={payoutMethod}
                onChange={(e) => onPayoutMethodChange(e.target.value as AffiliatePayoutMethod)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              >
                <option value="MBWAY">MB Way</option>
                <option value="PIX">PIX</option>
              </select>
            </div>
            {payoutMethod === "MBWAY" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={mbwayNumber}
                  onChange={(e) => onMbwayNumberChange(e.target.value)}
                  placeholder="Número MB Way"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  required
                />
                <input
                  type="text"
                  value={mbwayName}
                  onChange={(e) => onMbwayNameChange(e.target.value)}
                  placeholder="Nome do titular"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  required
                />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => onPixKeyChange(e.target.value)}
                  placeholder="Chave PIX"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  required
                />
                <input
                  type="text"
                  value={pixName}
                  onChange={(e) => onPixNameChange(e.target.value)}
                  placeholder="Nome do titular"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  required
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => onTermsAcceptedChange(e.target.checked)}
                required
              />
              Li e aceito os termos de afiliação
            </label>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <div className="flex justify-end gap-3">
              <CardButton
                type="button"
                onClick={() => !saving && onClose()}
                disabled={saving}
                variant="outline"
              >
                Cancelar
              </CardButton>
              <CardButton type="submit" loading={saving} variant="primary">
                {saving ? "Confirmando…" : "Confirmar afiliação"}
              </CardButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
