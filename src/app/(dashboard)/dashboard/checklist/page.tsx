"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { CardButton } from "@/components/ui/CardButton";

type VisaType =
  | ""
  | "ESTUDO"
  | "TRABALHO"
  | "D8_NOMADE"
  | "D7_PASSIVO"
  | "D2_EMPREENDEDOR"
  | "REAGRUPAMENTO";

type ChecklistData = {
  meta?: {
    visaType?: VisaType;
    cidade?: string;
    dataViagem?: string; // yyyy-mm-dd
    dataAima?: string; // yyyy-mm-dd
    notas?: string;
  };
  checks?: Record<string, boolean>;
};

const TEMPLATE_VERSION = 1;

const SECTIONS: Array<{
  id: string;
  title: string;
  emoji: string;
  items: Array<{ id: string; label: string }>;
}> = [
  {
    id: "plano",
    title: "Plano e decisões",
    emoji: "🧭",
    items: [
      { id: "plan_objetivo_definido", label: "Defini meu objetivo (morar/estudar/trabalhar/remoto/empreender)" },
      { id: "plan_cidade_definida", label: "Escolhi cidade/região com base em custo de vida e trabalho" },
      { id: "plan_orcamento_cronograma", label: "Montei orçamento + cronograma + plano B" },
    ],
  },
  {
    id: "visto",
    title: "Visto (Brasil) — antes de viajar",
    emoji: "🛂",
    items: [
      { id: "visto_tipo_escolhido", label: "Escolhi o tipo de visto certo para meu perfil" },
      { id: "visto_docs_base", label: "Organizei documentos-base (passaporte, fotos, formulário, taxas, etc.)" },
      { id: "visto_antecedentes_apostila", label: "Antecedentes criminais apostilados" },
      { id: "visto_meios_financeiros", label: "Comprovação financeira suficiente e coerente" },
      { id: "visto_alojamento", label: "Comprovativo de alojamento em Portugal" },
      { id: "visto_seguro", label: "Seguro/PB4 conforme exigência do meu visto" },
      { id: "visto_submetido", label: "Pedido de visto submetido (VFS ou Vice-Consulado)" },
    ],
  },
  {
    id: "financeiro",
    title: "Dinheiro e chegada",
    emoji: "💶",
    items: [
      { id: "money_reserva_ok", label: "Tenho reserva financeira para os primeiros meses" },
      { id: "money_entrada_casa", label: "Planejei entrada da casa (1º mês + 2–3 cauções) e custos iniciais" },
      { id: "money_margem_20", label: "Adicionei margem de segurança de 20% para imprevistos" },
      { id: "money_cartao_wise", label: "Cartão internacional/Wise pronto (evitar muito dinheiro vivo)" },
      { id: "travel_mala_mao", label: "Documentos essenciais na mala de mão (visto, seguro, reservas, comprovativos)" },
      { id: "arrival_chip_internet", label: "Plano de chip/internet definido para chegar conectado" },
    ],
  },
  {
    id: "moradia",
    title: "Moradia em Portugal",
    emoji: "🏠",
    items: [
      { id: "home_estrategia", label: "Defini estratégia (temporário/relocation/fechar direto)" },
      { id: "home_canais", label: "Estou a usar canais certos (Idealista/OLX/grupos locais, etc.)" },
      { id: "home_antigolpes", label: "Checklist anti-golpe ok (não pagar antes, validar senhorio/propriedade, etc.)" },
    ],
  },
  {
    id: "docs_pt",
    title: "Documentos em Portugal (ordem recomendada)",
    emoji: "📄",
    items: [
      { id: "pt_nif", label: "NIF (Finanças)" },
      { id: "pt_senha_financas", label: "Senha do Portal das Finanças" },
      { id: "pt_atestado_morada", label: "Atestado de morada (Junta de Freguesia)" },
      { id: "pt_morada_fiscal", label: "Alterei a morada fiscal para Portugal" },
      { id: "pt_conta_bancaria", label: "Conta bancária" },
      { id: "pt_niss", label: "NISS (Segurança Social)" },
      { id: "pt_sns_utente", label: "SNS — Número de utente" },
    ],
  },
  {
    id: "aima",
    title: "AIMA (residência)",
    emoji: "⏳",
    items: [
      { id: "aima_agendamento_ok", label: "Agendamento AIMA confirmado (ou pedido no portal, se aplicável)" },
      { id: "aima_docs_impressos", label: "Documentos impressos e organizados (levar extras)" },
      { id: "aima_comparecer", label: "Plano para não faltar (data, rota, backups)" },
    ],
  },
  {
    id: "pos_cartao",
    title: "Depois do cartão",
    emoji: "✅",
    items: [
      { id: "pos_cnh_imt", label: "Troca da CNH no IMT planeada (CNH válida + atestado médico + docs)" },
      { id: "pos_saude", label: "Estratégia de saúde definida (SNS + plano/seguro se fizer sentido)" },
    ],
  },
];

function pctDone(data: ChecklistData): number {
  const checks = data.checks ?? {};
  const allIds = SECTIONS.flatMap((s) => s.items.map((i) => i.id));
  if (!allIds.length) return 0;
  const done = allIds.filter((id) => checks[id]).length;
  return Math.round((done / allIds.length) * 100);
}

export default function ChecklistPage() {
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [data, setData] = useState<ChecklistData>({ meta: {}, checks: {} });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  const dirtyRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const progress = useMemo(() => pctDone(data), [data]);

  useEffect(() => {
    if (!isMember) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    api.checklist
      .me()
      .then((res) => {
        if (cancelled) return;
        const next: ChecklistData = {
          meta: (res.data as any)?.meta ?? {},
          checks: (res.data as any)?.checks ?? {},
        };
        setData(next);
        setSavedAt(res.updatedAt);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o checklist.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isMember]);

  function queueSave(next: ChecklistData) {
    dirtyRef.current = true;
    setSaveError("");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      if (!dirtyRef.current) return;
      setSaving(true);
      try {
        const res = await api.checklist.updateMe({ data: next as any, version: TEMPLATE_VERSION });
        setSavedAt(res.updatedAt);
        dirtyRef.current = false;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Erro ao salvar.");
      } finally {
        setSaving(false);
      }
    }, 700);
  }

  function setMeta<K extends keyof NonNullable<ChecklistData["meta"]>>(key: K, value: any) {
    setData((prev) => {
      const next: ChecklistData = {
        ...prev,
        meta: { ...(prev.meta ?? {}), [key]: value },
      };
      queueSave(next);
      return next;
    });
  }

  function toggle(id: string) {
    setData((prev) => {
      const checks = { ...(prev.checks ?? {}) };
      checks[id] = !checks[id];
      const next = { ...prev, checks };
      queueSave(next);
      return next;
    });
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-[820px]">
        <h1 className="text-2xl font-semibold text-zinc-900">Checklist de imigração ✈️</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Faz login para acessar teu checklist.
        </p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="mx-auto w-full max-w-[820px]">
        <h1 className="text-2xl font-semibold text-zinc-900">Checklist de imigração ✈️</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esse checklist é exclusivo para membros VIP.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-white to-zinc-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Checklist de imigração ✈️</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Marca o que já fez, escolhe teu visto e registra datas importantes. A gente salva automaticamente. 🙌
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-zinc-200">
              <p className="text-xs font-medium text-zinc-500">Progresso</p>
              <p className="text-lg font-extrabold text-zinc-900">{progress}%</p>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <div>{saving ? "Salvando…" : "Salvo"}</div>
              <div>{savedAt ? new Date(savedAt).toLocaleString("pt-PT") : "—"}</div>
            </div>
          </div>
        </div>
        {saveError ? (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Teu plano 🧩</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600">Tipo de visto</label>
                <select
                  value={data.meta?.visaType ?? ""}
                  onChange={(e) => setMeta("visaType", e.target.value as VisaType)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Selecionar…</option>
                  <option value="ESTUDO">📚 Estudo</option>
                  <option value="TRABALHO">💼 Trabalho</option>
                  <option value="D8_NOMADE">💻 D8 Nômade digital</option>
                  <option value="D7_PASSIVO">🏖️ D7 Rendimento passivo</option>
                  <option value="D2_EMPREENDEDOR">🚀 D2 Empreender/Autônomo</option>
                  <option value="REAGRUPAMENTO">👨‍👩‍👧‍👦 Reagrupamento familiar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Cidade alvo</label>
                <input
                  value={data.meta?.cidade ?? ""}
                  onChange={(e) => setMeta("cidade", e.target.value)}
                  placeholder="Ex.: Porto, Braga, Lisboa…"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Data da viagem</label>
                  <input
                    type="date"
                    value={data.meta?.dataViagem ?? ""}
                    onChange={(e) => setMeta("dataViagem", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Agendamento AIMA</label>
                  <input
                    type="date"
                    value={data.meta?.dataAima ?? ""}
                    onChange={(e) => setMeta("dataAima", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Notas</label>
                <textarea
                  rows={4}
                  value={data.meta?.notas ?? ""}
                  onChange={(e) => setMeta("notas", e.target.value)}
                  placeholder="Links, contatos, lembretes…"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="pt-1">
                <CardButton
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setData({ meta: {}, checks: {} });
                    queueSave({ meta: {}, checks: {} });
                  }}
                >
                  Resetar checklist 🔄
                </CardButton>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
              Carregando teu checklist…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {loadError}
            </div>
          ) : (
            SECTIONS.map((section) => (
              <div key={section.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-zinc-900">
                    <span className="mr-2">{section.emoji}</span>
                    {section.title}
                  </h2>
                  <span className="text-xs font-medium text-zinc-500">
                    {section.items.filter((i) => data.checks?.[i.id]).length}/{section.items.length}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {section.items.map((item) => {
                    const checked = Boolean(data.checks?.[item.id]);
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                          checked
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-zinc-200 bg-white hover:bg-zinc-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(item.id)}
                          className="mt-1 h-4 w-4 accent-emerald-600"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900">{item.label}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

