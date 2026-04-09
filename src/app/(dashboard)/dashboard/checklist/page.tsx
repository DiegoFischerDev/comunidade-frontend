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

type ChecklistDoc = { key: string; label: string };
type ChecklistItem = {
  id: string;
  label: string;
  details: {
    intro: string;
    steps: string[];
    docs: ChecklistDoc[];
  };
};

function docCheckId(itemId: string, docKey: string) {
  return `${itemId}__doc__${docKey}`;
}

const SECTIONS: Array<{
  id: string;
  title: string;
  emoji: string;
  phase: "BRASIL" | "PORTUGAL";
  items: ChecklistItem[];
}> = [
  {
    id: "plano",
    title: "Plano e decisões",
    emoji: "🧭",
    phase: "BRASIL",
    items: [
      {
        id: "plan_objetivo_definido",
        label: "Defini meu objetivo (morar/estudar/trabalhar/remoto/empreender)",
        details: {
          intro: "Quanto mais claro o objetivo, mais fácil escolher visto, cidade e orçamento. 🎯",
          steps: [
            "Escolhe 1 objetivo principal (o que te traz pra Portugal agora).",
            "Define prazo (quando quer embarcar) e prioridade (legalização, trabalho, estudo, etc.).",
            "Anota restrições: família, pets, orçamento, área de atuação.",
          ],
          docs: [
            { key: "notas_objetivo", label: "Resumo do teu objetivo (1–3 frases) em Notas" },
            { key: "lista_prioridades", label: "Lista de prioridades (top 5)" },
          ],
        },
      },
      {
        id: "plan_cidade_definida",
        label: "Escolhi cidade/região com base em custo de vida e trabalho",
        details: {
          intro: "Cidade impacta custo, moradia e oportunidades. 📍",
          steps: [
            "Compara 2–3 cidades (Lisboa/Porto vs interior).",
            "Checa renda esperada vs aluguel médio na região.",
            "Define 1 cidade alvo + 1 alternativa.",
          ],
          docs: [
            { key: "cidade_alvo", label: "Cidade alvo preenchida no plano" },
            { key: "cidade_plano_b", label: "Cidade alternativa (Plano B) anotada" },
          ],
        },
      },
      {
        id: "plan_orcamento_cronograma",
        label: "Montei orçamento + cronograma + plano B",
        details: {
          intro: "Planeamento financeiro evita perrengue nos primeiros meses. 🧾",
          steps: [
            "Estima 6 meses de custo de vida (aluguel + alimentação + transporte + contas).",
            "Inclui custos iniciais (caução, mobília, temporário) + 20% de margem.",
            "Define plano B: o que fazer se a renda atrasar ou moradia não sair.",
          ],
          docs: [
            { key: "orcamento", label: "Orçamento (estimativa) anotado" },
            { key: "margem_20", label: "Margem de 20% prevista" },
          ],
        },
      },
    ],
  },
  {
    id: "visto",
    title: "Visto (Brasil) — antes de viajar",
    emoji: "🛂",
    phase: "BRASIL",
    items: [
      {
        id: "visto_tipo_escolhido",
        label: "Escolhi o tipo de visto certo para meu perfil",
        details: {
          intro: "O visto define os requisitos e o que você pode (ou não) fazer legalmente. ✅",
          steps: [
            "Seleciona teu tipo de visto no campo “Tipo de visto”.",
            "Confere os requisitos principais (renda, vínculo, estudo, etc.).",
            "Evita atalhos/contratos falsos (risco alto de recusa).",
          ],
          docs: [
            { key: "visa_tipo", label: "Tipo de visto escolhido no select" },
            { key: "requisitos_lista", label: "Lista de requisitos do teu visto (anotada)" },
          ],
        },
      },
      {
        id: "visto_docs_base",
        label: "Organizei documentos-base (passaporte, fotos, formulário, taxas, etc.)",
        details: {
          intro: "Organização de documentos reduz erros e retrabalho. 📁",
          steps: [
            "Cria uma pasta (física e digital) só do visto.",
            "Revisa validade de passaporte e padrões de foto.",
            "Separa comprovativos e formulários já preenchidos.",
          ],
          docs: [
            { key: "passaporte", label: "Passaporte válido (mín. 6 meses)" },
            { key: "fotos", label: "Fotos tipo passe" },
            { key: "formulario", label: "Formulário do visto preenchido" },
            { key: "taxas", label: "Comprovativo de pagamento de taxas" },
          ],
        },
      },
      {
        id: "visto_antecedentes_apostila",
        label: "Antecedentes criminais apostilados",
        details: {
          intro: "Normalmente é item obrigatório e precisa de apostilamento. 🧾",
          steps: ["Emite o documento no Brasil conforme exigência do visto.", "Faz o apostilamento conforme regras.", "Guarda versão impressa e digital."],
          docs: [
            { key: "antecedentes", label: "Certidão de antecedentes criminais" },
            { key: "apostila", label: "Apostilamento realizado" },
            { key: "copia_digital", label: "Cópia digital guardada" },
          ],
        },
      },
      {
        id: "visto_meios_financeiros",
        label: "Comprovação financeira suficiente e coerente",
        details: {
          intro: "Precisa fazer sentido com o teu plano (custos + prazo). 💳",
          steps: [
            "Organiza extratos e comprovativos de renda.",
            "Garante consistência (valores e origem dos recursos).",
            "Evita lacunas/transferências suspeitas sem explicação.",
          ],
          docs: [
            { key: "extratos", label: "Extratos bancários" },
            { key: "comprov_renda", label: "Comprovativos de renda (contrato/recibos/declarações)" },
            { key: "reserva", label: "Reserva financeira declarada coerente com o plano" },
          ],
        },
      },
      {
        id: "visto_alojamento",
        label: "Comprovativo de alojamento em Portugal",
        details: {
          intro: "Pode ser reserva/contrato/declaração, conforme o teu caso. 🏡",
          steps: ["Define a estratégia inicial (temporário vs contrato).", "Reúne o comprovativo exigido.", "Confere nome/endereço/datas."],
          docs: [
            { key: "reserva", label: "Reserva/contrato/declaração de alojamento" },
            { key: "endereco", label: "Endereço completo e datas" },
          ],
        },
      },
      {
        id: "visto_seguro",
        label: "Seguro/PB4 conforme exigência do meu visto",
        details: {
          intro: "Muitos vistos exigem cobertura de saúde no início. 🩺",
          steps: ["Confere exigência do teu visto.", "Contrata/obtém PB4 ou seguro privado.", "Guarda apólice/declaração e comprovativo."],
          docs: [
            { key: "pb4_ou_seguro", label: "PB4 ou seguro de saúde" },
            { key: "comprov_pagamento", label: "Comprovativo de pagamento (se aplicável)" },
          ],
        },
      },
      {
        id: "visto_submetido",
        label: "Pedido de visto submetido (VFS ou Vice-Consulado)",
        details: {
          intro: "Submissão concluída = começa a contagem de prazos e acompanhamento. 📬",
          steps: ["Submete via VFS ou vice-consulado.", "Guarda protocolos.", "Acompanha o status e responde rápido a exigências."],
          docs: [
            { key: "protocolo", label: "Protocolo/recibo de submissão" },
            { key: "prints", label: "Prints/confirmacoes do agendamento/envio" },
          ],
        },
      },
    ],
  },
  {
    id: "financeiro",
    title: "Dinheiro e chegada",
    emoji: "💶",
    phase: "BRASIL",
    items: [
      {
        id: "money_reserva_ok",
        label: "Tenho reserva financeira para os primeiros meses",
        details: {
          intro: "A reserva é o que te dá fôlego até estabilizar. 💪",
          steps: ["Calcula 6 meses de gastos.", "Garante que o dinheiro esteja acessível.", "Evita depender de “vai dar certo”."],
          docs: [
            { key: "planilha_gastos", label: "Planilha/estimativa de gastos mensais" },
            { key: "reserva_comprov", label: "Comprovativo/registro da reserva (extrato)" },
          ],
        },
      },
      {
        id: "money_entrada_casa",
        label: "Planejei entrada da casa (1º mês + 2–3 cauções) e custos iniciais",
        details: {
          intro: "A entrada costuma ser o maior gasto inicial. 🏠💸",
          steps: ["Simula 3x–4x o aluguel.", "Inclui mobília e contas.", "Reserva também para temporário (se necessário)."],
          docs: [
            { key: "simulacao_entrada", label: "Simulação da entrada (caução + 1º mês)" },
            { key: "orc_mobilia", label: "Orçamento de mobília/eletrodomésticos" },
          ],
        },
      },
      {
        id: "money_margem_20",
        label: "Adicionei margem de segurança de 20% para imprevistos",
        details: {
          intro: "Imprevistos são regra no começo: documentos, deslocamentos, taxas… 😅",
          steps: ["Soma teu orçamento total.", "Adiciona +20%.", "Não mexe nessa margem sem necessidade."],
          docs: [{ key: "margem", label: "Valor da margem definido" }],
        },
      },
      {
        id: "money_cartao_wise",
        label: "Cartão internacional/Wise pronto (evitar muito dinheiro vivo)",
        details: {
          intro: "Chegar com cartão ajuda em transporte, mercado e emergências. 💳",
          steps: ["Ativa e testa o cartão antes.", "Guarda cartões reserva.", "Define como vai transferir fundos."],
          docs: [
            { key: "cartao_ativo", label: "Cartão ativo e testado" },
            { key: "backup_cartao", label: "Cartão/forma de pagamento reserva" },
          ],
        },
      },
      {
        id: "travel_mala_mao",
        label: "Documentos essenciais na mala de mão (visto, seguro, reservas, comprovativos)",
        details: {
          intro: "Se a mala despachada atrasar, tua vida continua. ✈️",
          steps: ["Coloca tudo que é essencial na mala de mão.", "Leva cópia digital no telemóvel/nuvem.", "Organiza em pastinha fácil."],
          docs: [
            { key: "passaporte_visto", label: "Passaporte + visto" },
            { key: "seguro", label: "Seguro/PB4" },
            { key: "reservas", label: "Reservas/hospedagem" },
            { key: "financeiro", label: "Comprovativos financeiros" },
          ],
        },
      },
      {
        id: "arrival_chip_internet",
        label: "Plano de chip/internet definido para chegar conectado",
        details: {
          intro: "Internet salva: mapas, mensagens, banco, marcações. 📶",
          steps: ["Define se compra no aeroporto ou em loja.", "Evita fidelização no início.", "Testa chamada/dados."],
          docs: [{ key: "plano_chip", label: "Plano de chip definido" }],
        },
      },
    ],
  },
  {
    id: "moradia",
    title: "Moradia em Portugal",
    emoji: "🏠",
    phase: "BRASIL",
    items: [
      {
        id: "home_estrategia",
        label: "Defini estratégia (temporário/relocation/fechar direto)",
        details: {
          intro: "Moradia define o resto (docs, banco, trabalho). 🏡",
          steps: ["Decide: temporário (15–30 dias) vs relocation vs fechar antes.", "Considera custo/risco/tempo.", "Alinha com orçamento."],
          docs: [{ key: "estrategia_escrita", label: "Estratégia escolhida e anotada" }],
        },
      },
      {
        id: "home_canais",
        label: "Estou a usar canais certos (Idealista/OLX/grupos locais, etc.)",
        details: {
          intro: "A oferta muda rápido — precisa estar nos canais certos. 🔍",
          steps: ["Cria alertas por bairro/preço.", "Entra em grupos locais.", "Responde rápido quando surgir oportunidade."],
          docs: [{ key: "lista_canais", label: "Lista de sites/grupos que você está a usar" }],
        },
      },
      {
        id: "home_antigolpes",
        label: "Checklist anti-golpe ok (não pagar antes, validar senhorio/propriedade, etc.)",
        details: {
          intro: "Golpes existem — tua proteção é processo. 🛡️",
          steps: ["Não pagar antes de visita/validação.", "Pedir prova de propriedade.", "Desconfiar de preços muito baixos e pressa."],
          docs: [
            { key: "identidade_senhorio", label: "Identidade do senhorio validada" },
            { key: "propriedade", label: "Propriedade verificada (ex.: caderneta predial)" },
            { key: "contrato_recibos", label: "Contrato + comprovativos/recibos guardados" },
          ],
        },
      },
    ],
  },
  {
    id: "docs_pt",
    title: "Documentos em Portugal (ordem recomendada)",
    emoji: "📄",
    phase: "PORTUGAL",
    items: [
      {
        id: "pt_nif",
        label: "NIF (Finanças)",
        details: {
          intro: "O NIF é o “CPF” em Portugal — desbloqueia quase tudo. 🔑",
          steps: ["Vai a um Serviço de Finanças.", "Leva documentos e (se necessário) representante fiscal.", "Guarda o comprovativo."],
          docs: [
            { key: "passaporte", label: "Passaporte" },
            { key: "visto", label: "Visto (se aplicável)" },
            { key: "endereco", label: "Comprovativo de endereço" },
            { key: "representante", label: "Representante fiscal (se exigido)" },
          ],
        },
      },
      {
        id: "pt_senha_financas",
        label: "Senha do Portal das Finanças",
        details: {
          intro: "A senha permite gerir morada fiscal e obrigações. 🔐",
          steps: ["Regista no Portal das Finanças com teu NIF.", "A senha chega por carta.", "Guarda num gestor de senhas."],
          docs: [
            { key: "nif", label: "NIF" },
            { key: "morada_carta", label: "Morada onde a carta vai chegar" },
          ],
        },
      },
      {
        id: "pt_atestado_morada",
        label: "Atestado de morada (Junta de Freguesia)",
        details: {
          intro: "É um comprovativo oficial — pode ser chato de obter. 🧾",
          steps: ["Vai à Junta de Freguesia da tua morada.", "Leva o que eles exigem (varia).", "Guarda original e cópia."],
          docs: [
            { key: "nif", label: "NIF" },
            { key: "passaporte", label: "Passaporte" },
            { key: "contrato_ou_decl", label: "Contrato/declaração do senhorio" },
            { key: "autorizacao", label: "Autorização do titular da morada (se aplicável)" },
          ],
        },
      },
      {
        id: "pt_morada_fiscal",
        label: "Alterei a morada fiscal para Portugal",
        details: {
          intro: "Atualizar morada fiscal evita coimas e tira dependência do representante. 🏷️",
          steps: ["Com senha do portal, altera online ou nas Finanças.", "Confere se ficou ativa.", "Arquiva o comprovativo."],
          docs: [
            { key: "senha_portal", label: "Senha do Portal das Finanças" },
            { key: "atestado", label: "Atestado de morada/contrato" },
          ],
        },
      },
      {
        id: "pt_conta_bancaria",
        label: "Conta bancária",
        details: {
          intro: "Conta facilita salário, aluguel e pagamentos. 🏦",
          steps: ["Escolhe banco e leva documentos.", "Abre conta e pede cartão.", "Guarda IBAN e comprovativos."],
          docs: [
            { key: "nif", label: "NIF" },
            { key: "passaporte", label: "Passaporte" },
            { key: "morada", label: "Atestado/contrato de morada" },
          ],
        },
      },
      {
        id: "pt_niss",
        label: "NISS (Segurança Social)",
        details: {
          intro: "NISS é essencial para trabalhar legalmente. 🧑‍💼",
          steps: ["Solicita na Segurança Social (ou via empregador, quando aplicável).", "Confere teus dados.", "Guarda o comprovativo."],
          docs: [
            { key: "passaporte", label: "Passaporte" },
            { key: "nif", label: "NIF" },
            { key: "visto", label: "Visto (se aplicável)" },
            { key: "morada", label: "Atestado/contrato de morada" },
          ],
        },
      },
      {
        id: "pt_sns_utente",
        label: "SNS — Número de utente",
        details: {
          intro: "Utente dá acesso ao SNS (público). 🏥",
          steps: ["Vai ao Centro de Saúde da tua área.", "Leva documentos.", "Guarda o número e comprovativo."],
          docs: [
            { key: "passaporte", label: "Passaporte" },
            { key: "nif", label: "NIF" },
            { key: "morada", label: "Atestado de morada" },
            { key: "aima_comprov", label: "Comprovativo de pedido/tema AIMA (se exigido)" },
          ],
        },
      },
    ],
  },
  {
    id: "aima",
    title: "AIMA (residência)",
    emoji: "⏳",
    phase: "PORTUGAL",
    items: [
      {
        id: "aima_agendamento_ok",
        label: "Agendamento AIMA confirmado (ou pedido no portal, se aplicável)",
        details: {
          intro: "Em geral o visto já vem com agendamento, mas confirma sempre. 🗓️",
          steps: ["Confere a data/hora/local.", "Guarda e-mail/print.", "Se não houver, inicia pedido no portal (quando aplicável)."],
          docs: [
            { key: "email_agendamento", label: "E-mail/print do agendamento" },
            { key: "documentos_base", label: "Pasta com docs base pronta" },
          ],
        },
      },
      {
        id: "aima_docs_impressos",
        label: "Documentos impressos e organizados (levar extras)",
        details: {
          intro: "Levar impresso e organizado reduz stress e pedidos adicionais. 📎",
          steps: ["Imprime tudo (mesmo o que já enviou online).", "Organiza em pasta por categoria.", "Leva extras que façam sentido pro teu caso."],
          docs: [
            { key: "formulario", label: "Formulário/pedido de AR" },
            { key: "passaporte", label: "Passaporte" },
            { key: "visto", label: "Visto" },
            { key: "morada", label: "Comprovativo de morada" },
            { key: "meios", label: "Meios de subsistência" },
            { key: "nif", label: "NIF" },
            { key: "niss", label: "NISS" },
            { key: "utente", label: "Número de utente (se já tiver)" },
          ],
        },
      },
      {
        id: "aima_comparecer",
        label: "Plano para não faltar (data, rota, backups)",
        details: {
          intro: "Faltar pode complicar muito. Melhor evitar a todo custo. 🚨",
          steps: ["Confere a data com antecedência.", "Planeia rota e tempo extra.", "Separa tudo no dia anterior."],
          docs: [
            { key: "rota", label: "Rota/como chegar (print ou anotado)" },
            { key: "pasta_pronta", label: "Pasta de documentos pronta no dia anterior" },
          ],
        },
      },
    ],
  },
  {
    id: "pos_cartao",
    title: "Depois do cartão",
    emoji: "✅",
    phase: "PORTUGAL",
    items: [
      {
        id: "pos_cnh_imt",
        label: "Troca da CNH no IMT planeada (CNH válida + atestado médico + docs)",
        details: {
          intro: "Depois do cartão de residência, planeia a troca dentro do prazo. 🚗",
          steps: ["Confere se a CNH está válida.", "Reúne documentos.", "Submete pedido no IMT (online) quando estiver pronto."],
          docs: [
            { key: "cnh_valida", label: "CNH brasileira válida" },
            { key: "cartao_residencia", label: "Cartão de residência" },
            { key: "nif", label: "NIF" },
            { key: "morada", label: "Comprovativo de morada" },
            { key: "atestado_medico", label: "Atestado médico eletrónico" },
          ],
        },
      },
      {
        id: "pos_saude",
        label: "Estratégia de saúde definida (SNS + plano/seguro se fizer sentido)",
        details: {
          intro: "SNS + privado (plano/seguro) pode ser uma combinação boa. 🏥✨",
          steps: ["Define se vai manter seguro no início.", "Quando tiver utente, decide se mantém seguro/plano.", "Considera teu perfil (crônicos, gravidez, uso de especialistas)."],
          docs: [
            { key: "utente", label: "Número de utente" },
            { key: "seguro", label: "Apólice/condições do seguro (se tiver)" },
          ],
        },
      },
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

function phaseProgress(
  data: ChecklistData,
  phase: "BRASIL" | "PORTUGAL",
): { pct: number; done: number; total: number } {
  const checks = data.checks ?? {};
  const ids = SECTIONS.filter((s) => s.phase === phase).flatMap((s) => s.items.map((i) => i.id));
  const total = ids.length;
  const done = ids.filter((id) => checks[id]).length;
  return { pct: total ? Math.round((done / total) * 100) : 0, done, total };
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
  const [saveOk, setSaveOk] = useState("");
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [openPhases, setOpenPhases] = useState<Record<"BRASIL" | "PORTUGAL", boolean>>({
    BRASIL: false,
    PORTUGAL: false,
  });

  const dirtyRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const progress = useMemo(() => pctDone(data), [data]);
  const phase1 = useMemo(() => phaseProgress(data, "BRASIL"), [data]);
  const phase2 = useMemo(() => phaseProgress(data, "PORTUGAL"), [data]);

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
    setSaveOk("");
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
    }, 2000);
  }

  async function saveNow() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    dirtyRef.current = false;
    setSaveError("");
    setSaveOk("");
    setSaving(true);
    try {
      const res = await api.checklist.updateMe({ data: data as any, version: TEMPLATE_VERSION });
      setSavedAt(res.updatedAt);
      setSaveOk("Plano salvo! ✅");
      window.setTimeout(() => setSaveOk(""), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
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

  function toggleDetails(id: string) {
    setOpenDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function togglePhase(id: "BRASIL" | "PORTUGAL") {
    setOpenPhases((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleDoc(itemId: string, docKey: string) {
    const id = docCheckId(itemId, docKey);
    toggle(id);
  }

  function printPlan() {
    window.print();
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
              Marca o que já fez, escolhe teu visto e registra datas importantes. 🙌
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white px-3 py-3 text-center shadow-sm ring-1 ring-zinc-200">
                <p className="text-[11px] font-medium text-zinc-500">Fase 1 🇧🇷</p>
                <p className="text-lg font-extrabold text-zinc-900">{phase1.pct}%</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {phase1.done}/{phase1.total}
                </p>
              </div>
              <div className="rounded-xl bg-white px-3 py-3 text-center shadow-sm ring-1 ring-zinc-200">
                <p className="text-[11px] font-medium text-zinc-500">Fase 2 🇵🇹</p>
                <p className="text-lg font-extrabold text-zinc-900">{phase2.pct}%</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {phase2.done}/{phase2.total}
                </p>
              </div>
            </div>
          </div>
        </div>
        {saveError ? (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
        ) : null}
        {saveOk ? (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{saveOk}</div>
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
                  variant="primary"
                  fullWidth
                  loading={saving}
                  onClick={() => void saveNow()}
                >
                  Salvar plano
                </CardButton>
              </div>
              <div>
                <CardButton type="button" variant="secondary" fullWidth onClick={printPlan}>
                  Imprimir plano 🖨️
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
            ([
              { id: "BRASIL" as const, title: "Fase 1 — ainda no Brasil", emoji: "🇧🇷" },
              { id: "PORTUGAL" as const, title: "Fase 2 — já em Portugal", emoji: "🇵🇹" },
            ] as const).map((phase) => {
              const sections = SECTIONS.filter((s) => s.phase === phase.id);
              const done = sections.reduce((acc, s) => acc + s.items.filter((i) => data.checks?.[i.id]).length, 0);
              const total = sections.reduce((acc, s) => acc + s.items.length, 0);
              const isOpen = openPhases[phase.id];

              return (
                <div
                  key={phase.id}
                  className={`space-y-4 rounded-2xl border p-4 sm:p-5 ${
                    phase.id === "BRASIL"
                      ? "border-emerald-200/70 bg-emerald-50/50"
                      : "border-rose-200/70 bg-rose-50/55"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => togglePhase(phase.id)}
                    className="w-full cursor-pointer rounded-2xl p-2 text-left transition hover:bg-white/30"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-zinc-900">
                          <span className="mr-2">{phase.emoji}</span>
                          {phase.title}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-600">
                          {phase.id === "BRASIL"
                            ? "Tudo que você resolve antes de embarcar."
                            : "Documentos e etapas logo após chegar."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-700">
                          {done}/{total}
                        </span>
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-700 transition ${
                            isOpen ? "bg-white/70" : "bg-white/40"
                          }`}
                          aria-hidden
                        >
                          <svg
                            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="space-y-4">
                      {sections.map((section) => (
                        <div key={section.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold text-zinc-900">
                              <span className="mr-2">{section.emoji}</span>
                              {section.title}
                            </h3>
                            <span className="text-xs font-medium text-zinc-500">
                              {section.items.filter((i) => data.checks?.[i.id]).length}/{section.items.length}
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            {section.items.map((item) => {
                              const checked = Boolean(data.checks?.[item.id]);
                              const expanded = Boolean(openDetails[item.id]);
                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-xl border px-3 py-3 transition ${
                                    checked
                                      ? "border-emerald-200 bg-emerald-50/60"
                                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggle(item.id)}
                                      className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-medium text-zinc-900">{item.label}</p>
                                        <button
                                          type="button"
                                          onClick={() => toggleDetails(item.id)}
                                          className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100/60"
                                        >
                                          {expanded ? "Ocultar detalhes" : "Ver detalhes"}
                                        </button>
                                      </div>
                                      {expanded ? (
                                        <div className="mt-3 rounded-lg bg-white/70 p-3 ring-1 ring-zinc-200">
                                          <p className="text-xs font-semibold text-zinc-900">Como fazer ✨</p>
                                          <p className="mt-1 text-sm text-zinc-700">{item.details.intro}</p>
                                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                                            {item.details.steps.map((s, idx) => (
                                              <li key={idx}>{s}</li>
                                            ))}
                                          </ul>

                                          <div className="mt-3">
                                            <p className="text-xs font-semibold text-zinc-900">Documentos / comprovativos 📎</p>
                                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                              {item.details.docs.map((d) => {
                                                const did = docCheckId(item.id, d.key);
                                                const dchecked = Boolean(data.checks?.[did]);
                                                return (
                                                  <label
                                                    key={did}
                                                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                                                      dchecked
                                                        ? "border-emerald-200 bg-emerald-50"
                                                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                                                    }`}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={dchecked}
                                                      onChange={() => toggleDoc(item.id, d.key)}
                                                      className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                                                    />
                                                    <span className="text-zinc-800">{d.label}</span>
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

