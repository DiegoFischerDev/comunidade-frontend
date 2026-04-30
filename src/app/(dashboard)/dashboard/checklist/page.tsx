"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { CardButton } from "@/components/ui/CardButton";
import { FlagBr, FlagPt } from "@/components/CountryFlags";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";

type VisaType =
  | ""
  | "ESTUDO"
  | "TRABALHO"
  | "D8_NOMADE"
  | "D7_PASSIVO"
  | "D2_EMPREENDEDOR"
  | "REAGRUPAMENTO";

type CityKey =
  | ""
  | "INTERIOR"
  | "LISBOA"
  | "PORTO"
  | "BRAGA"
  | "COIMBRA"
  | "AVEIRO"
  | "FARO"
  | "ALGARVE"
  | "EVORA"
  | "VISEU";

type ChecklistData = {
  meta?: {
    visaType?: VisaType;
    cidade?: CityKey;
    cidadePlanoB?: CityKey;
    agregadoFamiliar?: "" | "1" | "2" | "3" | "4" | "5+";
    numQuartos?: "" | "0" | "1" | "2" | "3" | "4+";
    profissoesPossiveis?: string[];
    precisaCarro?: boolean | null;
    dataViagem?: string; // yyyy-mm-dd
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

function formatEur(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const CITY_OPTIONS: Array<{ key: CityKey; label: string }> = [
  { key: "", label: "Selecionar…" },
  { key: "INTERIOR", label: "Interior (referência base)" },
  { key: "LISBOA", label: "Lisboa" },
  { key: "PORTO", label: "Porto" },
  { key: "BRAGA", label: "Braga" },
  { key: "COIMBRA", label: "Coimbra" },
  { key: "AVEIRO", label: "Aveiro" },
  { key: "FARO", label: "Faro" },
  { key: "ALGARVE", label: "Algarve" },
  { key: "EVORA", label: "Évora" },
  { key: "VISEU", label: "Viseu" },
];

function estimateReserva(meta: ChecklistData["meta"] | undefined) {
  // Base real informado pelo utilizador (casal no interior, 2026)
  // moradia 600 + gasolina 150 + alimentação 450 + água/luz/internet 160 = 1360 €/mês
  // A depender da cidade, ajustamos principalmente a renda e (leve) custo de vida.
  const baseInterior = {
    rendaBaseT1: 600,
    gasolinaComCarro: 150,
    alimentacaoCasal: 450,
    contas: 160,
    // transporte público aproximado quando "não precisa de carro"
    mobilidadeSemCarro: 60,
  };

  const cidade: CityKey = meta?.cidade ?? "";
  const cityPreset: {
    rendaBaseT1: number;
    custoVidaFactor: number; // afeta alimentação/contas (leve)
    mobilidadeSemCarro: number;
  } =
    cidade === "LISBOA"
      ? { rendaBaseT1: 1100, custoVidaFactor: 1.15, mobilidadeSemCarro: 40 }
      : cidade === "PORTO"
      ? { rendaBaseT1: 900, custoVidaFactor: 1.08, mobilidadeSemCarro: 40 }
        : cidade === "BRAGA"
          ? { rendaBaseT1: 750, custoVidaFactor: 1.03, mobilidadeSemCarro: 60 }
          : cidade === "COIMBRA"
            ? { rendaBaseT1: 720, custoVidaFactor: 1.02, mobilidadeSemCarro: 60 }
            : cidade === "AVEIRO"
              ? { rendaBaseT1: 780, custoVidaFactor: 1.03, mobilidadeSemCarro: 60 }
    : cidade === "EVORA"
      ? { rendaBaseT1: 700, custoVidaFactor: 1.02, mobilidadeSemCarro: 60 }
    : cidade === "VISEU"
      ? { rendaBaseT1: 680, custoVidaFactor: 1.01, mobilidadeSemCarro: 60 }
              : cidade === "FARO"
                ? { rendaBaseT1: 950, custoVidaFactor: 1.08, mobilidadeSemCarro: 65 }
    : cidade === "ALGARVE"
      ? { rendaBaseT1: 1000, custoVidaFactor: 1.10, mobilidadeSemCarro: 65 }
                : { ...baseInterior, custoVidaFactor: 1.0 };

  // Ajuste global: reduzir em ~20% as estimativas de arrendamento (duas reduções de 10%)
  const rendaT1Ajustada = Math.round(cityPreset.rendaBaseT1 * 0.81);

  const agregado = meta?.agregadoFamiliar ?? "";
  const numPessoas =
    agregado === "1"
      ? 1
      : agregado === "2"
        ? 2
        : agregado === "3"
          ? 3
          : agregado === "4"
            ? 4
            : agregado === "5+"
              ? 5
              : 2; // default: casal

  const numQuartos = meta?.numQuartos ?? "";
  const isQuarto = numQuartos === "0";
  const renda =
    // "0" agora significa "Quarto"
    numQuartos === "0"
      ? cidade === "BRAGA"
        ? numPessoas === 1
          ? Math.round(450 * 0.9)
          : Math.round(550 * 0.9)
        : numPessoas === 1
          ? Math.round(rendaT1Ajustada * 0.6)
          : Math.round(rendaT1Ajustada * 0.75)
      : numQuartos === "1"
        ? rendaT1Ajustada
        : numQuartos === "2"
          ? Math.round(rendaT1Ajustada * 1.25)
          : numQuartos === "3"
            ? Math.round(rendaT1Ajustada * 1.5)
            : numQuartos === "4+"
              ? Math.round(rendaT1Ajustada * 1.85)
              : rendaT1Ajustada;

  const precisaCarro = meta?.precisaCarro ?? null;

  // Mobilidade (regra simplificada):
  // - Lisboa/Porto: ~€40 por pessoa
  // - Interior (referência base / não selecionado): €150 fixo
  // - Outras cidades: usa a opção "vou precisar comprar carro?" para estimar
  const mobilidadeMensalBase =
    cidade === "LISBOA" || cidade === "PORTO"
      ? 40 * numPessoas
      : cidade === "INTERIOR" || cidade === ""
        ? baseInterior.gasolinaComCarro
        : precisaCarro === true
          ? baseInterior.gasolinaComCarro
          : precisaCarro === false
            ? cityPreset.mobilidadeSemCarro
            : Math.round((baseInterior.gasolinaComCarro + cityPreset.mobilidadeSemCarro) / 2);

  // Se vai precisar comprar carro, adiciona custo mensal aproximado de financiamento.
  const financiamentoCarroMensal = precisaCarro === true ? 200 : 0;
  const mobilidadeMensal = mobilidadeMensalBase + financiamentoCarroMensal;

  // Alimentação escala aproximada por pessoa (base casal = 450)
  // 1 pessoa tende a gastar menos que 2 (economia de escala invertida em algumas compras, mas ainda assim menor).
  const alimentacaoBase =
    numPessoas === 1
      ? Math.round(baseInterior.alimentacaoCasal * 0.7)
      : numPessoas === 2
        ? baseInterior.alimentacaoCasal
        : baseInterior.alimentacaoCasal + (numPessoas - 2) * 180;
  const alimentacaoMensal = Math.round(alimentacaoBase * cityPreset.custoVidaFactor);

  // contas (água/luz/internet) sobem um pouco com mais gente/quartos
  const contasBase = isQuarto
    ? 20 * numPessoas
    : numPessoas === 1
      ? Math.round(baseInterior.contas * 0.9)
      : baseInterior.contas;
  const contasMensal =
    Math.round(contasBase * cityPreset.custoVidaFactor) +
    Math.max(0, numPessoas - 2) * 20 +
    (numQuartos === "3" || numQuartos === "4+" ? 20 : 0);
  const contasMensalCapped = Math.min(200, contasMensal);

  const mensal = renda + mobilidadeMensal + alimentacaoMensal + contasMensalCapped;

  // Chegada / documentação / caução:
  // - relocation: €700
  // - documentação: €800
  // - caução: 2× o valor do arrendamento
  const relocation = 700;
  const documentacao = 800;
  const tresCaucoes = renda * 3;
  const chegadaDocumentacaoCaucao = relocation + documentacao + tresCaucoes;

  const reserva3m = mensal * 3 + chegadaDocumentacaoCaucao;

  return {
    mensal,
    renda,
    mobilidadeMensal,
    financiamentoCarroMensal,
    alimentacaoMensal,
    contasMensal: contasMensalCapped,
    chegadaDocumentacaoCaucao,
    reserva3m,
    assumptions: {
      numPessoas,
      renda,
      cidade,
    },
  };
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
        label: "Defini meu tipo de visto",
        details: {
          intro:
            "Escolher o visto certo depende do teu objetivo (estudo, trabalho, remoto, renda/passivo, reagrupamento) e do que você consegue comprovar. Use este guia rápido para mapear o caminho mais provável e já se preparar com os comprovativos.",
          steps: [
            "Mapeia teu perfil (1 frase): estudo / trabalho / remoto / renda-passiva / família.",
            "Guia rápido (em termos gerais):",
            "— Estudo: para quem vai estudar em instituição reconhecida (curso superior, técnico, intercâmbio/idiomas quando aplicável). Normalmente pedem carta de aceitação/matrícula + meios de subsistência + alojamento.",
            "— Trabalho: para quem já tem proposta/contrato ou vai por via de empresa (requisitos variam). Normalmente pedem contrato/proposta + qualificações quando exigidas.",
            "— D8 (nômade digital/remoto): para quem trabalha remoto para fora de Portugal e consegue comprovar renda estável (geralmente com contratos + recibos/extratos). Em muitos casos a referência é múltiplos do salário mínimo português (SMN) — confirme o valor vigente e a regra do teu consulado/VFS.",
            "— D7 (rendimentos): para quem tem rendimentos passivos/recorrentes (ex.: aposentadoria, arrendamento, dividendos) e consegue comprovar estabilidade (extratos/declarações). Também costuma usar referência no SMN (e percentuais adicionais por dependentes).",
            "— Reagrupamento familiar: quando há familiar com título válido em PT; foca em prova de vínculo + residência + capacidade financeira conforme regra aplicável.",
            "Seleciona o tipo de visto no campo “Tipo de visto” e lista (em Notas) o que você vai usar como prova principal (ex.: contrato remoto, carta de aceitação, contrato de trabalho, aposentadoria).",
            "Valida a lista oficial do teu consulado/VFS e cria uma checklist por requisito (evita versões antigas).",
          ],
          docs: [
            { key: "passaporte", label: "Passaporte válido + cópias (normalmente com validade mínima exigida)" },
            { key: "formularios", label: "Formulário(s) do visto preenchidos + taxas" },
            { key: "fotos", label: "Fotos tipo passe no padrão exigido" },
            { key: "antecedentes", label: "Certidão de antecedentes criminais (conforme exigência do consulado/VFS)" },
            { key: "seguro", label: "Seguro/assistência viagem (quando exigido)" },
            { key: "alojamento", label: "Comprovativo de alojamento (reserva/contrato/carta convite, conforme regra)" },
            { key: "meios", label: "Comprovativos de meios de subsistência (extratos, rendas, contratos, etc.)" },
            { key: "vinculos", label: "Comprovativos do teu “motivo” (aceitação/matrícula, contrato, prestação de serviços, aposentadoria…)" },
          ],
        },
      },
      {
        id: "plan_cidade_definida",
        label: "Escolhi cidade/região com base em custo de vida e trabalho",
        details: {
          intro:
            "Cidade muda tudo: aluguel, transporte, salários e até a velocidade para resolver burocracias. O objetivo aqui é escolher cidade-alvo e Plano B com base em dados (não só feeling). 📍",
          steps: [
            "Compara 2–3 cidades: aluguel médio, deslocamento, oportunidades na tua área e custo de vida.",
            "Faz um teste rápido: \(aluguel + contas + mercado + transporte\) vs renda provável (ou reserva).",
            "Pensa em logística: aeroporto, rede de apoio, escolas (se tiver filhos), segurança.",
            "Define 1 cidade alvo + 1 alternativa e anota em Notas o “porquê” em 3 bullets.",
          ],
          docs: [
            { key: "cidade_alvo", label: "Cidade alvo preenchida no plano" },
            { key: "cidade_plano_b", label: "Cidade alternativa (Plano B) anotada" },
            { key: "orcamento_cidade", label: "Estimativa de custo mensal na cidade (resumo em Notas)" },
          ],
        },
      },
      {
        id: "plan_orcamento_cronograma",
        label: "Montei orçamento + cronograma + plano B",
        details: {
          intro:
            "Um plano simples (com números) reduz ansiedade e evita decisões ruins sob pressão. O foco é: quanto você precisa, quando precisa e o que fazer se algo atrasar. 🧾",
          steps: [
            "Define um prazo realista (ex.: 60–120 dias) entre preparar docs e embarcar.",
            "Orça 3 cenários: conservador (pior caso), provável e otimista.",
            "Inclui custos de entrada: 1º mês + 2–3 cauções, temporário, móveis básicos e taxas.",
            "Plano B pronto: se o visto atrasar / se a moradia não sair / se renda atrasar.",
            "Exemplo real (casal no interior em 2026): moradia €600 + gasolina €150 + alimentação €450 + água/luz/internet €160 ≈ €1.360/mês (sem contar lazer/saúde/transporte público).",
          ],
          docs: [
            { key: "orcamento", label: "Orçamento (estimativa) anotado" },
            { key: "margem_20", label: "Margem de 20% prevista" },
            { key: "cronograma", label: "Cronograma (datas/semana) montado" },
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
          intro:
            "Aqui é decisão estratégica: o visto define requisitos, provas e o caminho pós-chegada. Evite escolher pelo “mais fácil” — escolha pelo que você consegue comprovar com consistência. ✅",
          steps: [
            "Seleciona teu tipo de visto no campo “Tipo de visto”.",
            "Escreve em Notas: qual é tua prova principal? (aceitação, contrato remoto, contrato de trabalho, rendimentos, etc.)",
            "Confere a lista oficial do teu consulado/VFS e faz checklist por requisito.",
            "Se um requisito depender de número (renda/meios), usa como referência o Salário Mínimo Nacional (SMN) vigente e confirma a regra do teu processo.",
            "Referências comuns para 2026 (confirma no teu consulado/VFS):",
            "— D8 (remoto): frequentemente pedem renda mensal mínima ≈ 4× SMN → ~€3.680/mês.",
            "— D7 (rendimentos): costuma usar 1× SMN para titular (~€920/mês) + 50% para cônjuge (~€460/mês) + 30% por dependente (~€276/mês).",
            "Evita atalhos/contratos falsos (risco alto de recusa).",
          ],
          docs: [
            { key: "visa_tipo", label: "Tipo de visto escolhido no select" },
            { key: "requisitos_lista", label: "Lista de requisitos do teu visto (anotada)" },
            { key: "prova_principal", label: "Prova principal definida (o que “sustenta” o pedido)" },
          ],
        },
      },
      {
        id: "visto_docs_base",
        label: "Organizei documentos-base (passaporte, fotos, formulário, taxas, etc.)",
        details: {
          intro:
            "O básico mal feito derruba processos. A ideia é ter uma pasta (digital e física) com tudo que se repete e cópias prontas. 📁",
          steps: [
            "Cria pasta digital com nomes padronizados (ex.: 01-passaporte.pdf, 02-fotos.jpg, 03-formulario.pdf…).",
            "Revisa validade do passaporte e páginas livres.",
            "Deixa fotos e formulários no padrão exigido (tamanho, fundo, assinatura).",
            "Imprime cópias do que você vai levar na mala de mão.",
          ],
          docs: [
            { key: "passaporte", label: "Passaporte válido (mín. 6 meses)" },
            { key: "fotos", label: "Fotos tipo passe" },
            { key: "formulario", label: "Formulário do visto preenchido" },
            { key: "taxas", label: "Comprovativo de pagamento de taxas" },
            { key: "copias", label: "Cópias (digitais e impressas) separadas" },
          ],
        },
      },
      {
        id: "visto_antecedentes",
        label: "Certidão de antecedentes criminais (quando exigido)",
        details: {
          intro: "Pode ser exigido no teu processo. O importante é seguir exatamente a lista oficial do consulado/VFS para o teu caso. 🧾",
          steps: [
            "Emite a certidão no Brasil conforme exigência do teu visto.",
            "Confere validade, formato e se precisa ser recente (alguns processos pedem emissão dentro de X dias).",
            "Guarda versão impressa e digital, junto do resto da pasta do visto.",
          ],
          docs: [
            { key: "antecedentes", label: "Certidão de antecedentes criminais" },
            { key: "copia_digital", label: "Cópia digital guardada" },
          ],
        },
      },
      {
        id: "visto_meios_financeiros",
        label: "Comprovação financeira suficiente e coerente",
        details: {
          intro:
            "Não é só ter dinheiro — é ter coerência com o teu plano (cidade, moradia, dependentes, duração). Evite extratos “montanha-russa” e depósitos sem explicação. 💳",
          steps: [
            "Calcula custo mensal estimado na cidade-alvo e multiplica por 6–12 meses (conforme teu caso).",
            "Organiza extratos recentes e uma prova clara de renda (salário/contratos/rendimentos).",
            "Se houver depósitos grandes, documenta a origem (ex.: venda de bem, bônus, transferência própria).",
            "Garante consistência: o valor declarado deve bater com cronograma e alojamento.",
            "Referência 2026 (geral): Salário Mínimo Nacional (SMN) ≈ €920/mês. Em alguns vistos (ex.: D7/D8) as referências costumam ser múltiplos do SMN — confirme no teu consulado/VFS.",
          ],
          docs: [
            { key: "extratos", label: "Extratos bancários" },
            { key: "comprov_renda", label: "Comprovativos de renda (contrato/recibos/declarações)" },
            { key: "reserva", label: "Reserva financeira declarada coerente com o plano" },
            { key: "origem", label: "Justificativa para entradas atípicas (se houver)" },
          ],
        },
      },
      {
        id: "visto_alojamento",
        label: "Comprovativo de alojamento em Portugal",
        details: {
          intro:
            "Alojamento costuma ser um dos pontos mais auditados. Quanto mais verificável (endereço, datas, titular), melhor. 🏡",
          steps: [
            "Define estratégia inicial: temporário (primeiras semanas) vs contrato (se já tiver).",
            "Reúne o comprovativo exigido e confirma se está no teu nome (ou com declaração/carta conforme regra).",
            "Confere: nome, endereço completo, datas e contatos.",
            "Evita documentos genéricos sem verificação ou com inconsistências.",
          ],
          docs: [
            { key: "reserva", label: "Reserva/contrato/declaração de alojamento" },
            { key: "endereco", label: "Endereço completo e datas" },
            { key: "titular", label: "Identificação do titular/anfitrião (se aplicável)" },
          ],
        },
      },
      {
        id: "visto_seguro",
        label: "Seguro/PB4 conforme exigência do meu visto",
        details: {
          intro:
            "Seguro/PB4 é requisito frequente, mas varia por tipo de visto e consulado. Regra de ouro: seguir o checklist oficial do teu processo. 🩺",
          steps: [
            "Confere se teu visto aceita PB4 ou exige seguro privado.",
            "Valida cobertura mínima e período (datas devem cobrir tua entrada).",
            "Guarda apólice/declaração e condições (PDF) + comprovativos.",
          ],
          docs: [
            { key: "pb4_ou_seguro", label: "PB4 ou seguro de saúde" },
            { key: "comprov_pagamento", label: "Comprovativo de pagamento (se aplicável)" },
            { key: "condicoes", label: "Condições/cobertura (PDF) guardadas" },
          ],
        },
      },
      {
        id: "visto_submetido",
        label: "Pedido de visto submetido (VFS ou Vice-Consulado)",
        details: {
          intro:
            "Submissão concluída = começa a contagem de prazos e acompanhamento. A chave é ter rastreio, protocolo e resposta rápida se pedirem complementos. 📬",
          steps: [
            "Submete via VFS ou vice-consulado conforme teu caso.",
            "Guarda protocolo/recibo e, se existir, código de rastreio.",
            "Monitora e-mail (inclusive spam) e responde rápido a exigências/complementos.",
          ],
          docs: [
            { key: "protocolo", label: "Protocolo/recibo de submissão" },
            { key: "prints", label: "Prints/confirmacoes do agendamento/envio" },
            { key: "rastreio", label: "Código de rastreio (se aplicável)" },
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
          intro:
            "Reserva te dá tempo para resolver moradia, documentos e trabalho sem aceitar qualquer opção por urgência. 💪",
          steps: [
            "Calcula 3–6 meses de custo de vida na cidade-alvo (aluguel + contas + alimentação + transporte).",
            "Mantém o dinheiro acessível (sem travas) e com parte em EUR (se fizer sentido).",
            "Evita comprometer a reserva inteira em caução/entrada de casa.",
            "Exemplo real (casal no interior em 2026): base ≈ €1.360/mês → 3 meses ≈ €4.080; 6 meses ≈ €8.160 (fora entrada/caução).",
          ],
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
          steps: [
            "Simula 3x–4x o aluguel (1º mês + cauções) e confere o que é prática na tua cidade/bairro.",
            "Inclui custos de entrada: mudanças, mobília básica, eletrodomésticos, utilidades e internet.",
            "Se for começar com temporário, orça 2–4 semanas extras (pra não ficar refém de prazo curto).",
          ],
          docs: [
            { key: "simulacao_entrada", label: "Simulação da entrada (caução + 1º mês)" },
            { key: "orc_mobilia", label: "Orçamento de mobília/eletrodomésticos" },
            { key: "orc_contas", label: "Estimativa de contas (água/luz/gás/internet)" },
          ],
        },
      },
      {
        id: "money_margem_20",
        label: "Adicionei margem de segurança de 20% para imprevistos",
        details: {
          intro: "Imprevistos são regra no começo: documentos, deslocamentos, taxas… 😅",
          steps: [
            "Soma teu orçamento total de chegada (entrada + mês a mês).",
            "Adiciona +20% e trata como “intangível” (só usa se for realmente necessário).",
            "Usa a margem para absorver atrasos (ex.: mais 1 mês de temporário).",
          ],
          docs: [],
        },
      },
      {
        id: "money_cartao_wise",
        label: "Cartão internacional/Wise pronto (evitar muito dinheiro vivo)",
        details: {
          intro:
            "O objetivo é chegar com pagamento funcionando no 1º dia e com backup se um cartão falhar. 💳",
          steps: [
            "Ativa e testa o cartão antes de viajar (compra pequena e/ou saque).",
            "Mantém um backup (outro cartão / conta) e limites definidos.",
            "Deixa app e segurança prontos (biometria/2FA) e contato de bloqueio fácil.",
          ],
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
          steps: [
            "Coloca tudo que é essencial na mala de mão (o que te permite entrar, dormir e se locomover).",
            "Leva cópia digital no telemóvel e na nuvem (offline se possível).",
            "Organiza numa pastinha: 1) identidade, 2) saúde, 3) moradia, 4) financeiro.",
          ],
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
          steps: [
            "Define se compra no aeroporto (mais caro, imediato) ou em loja (mais barato).",
            "Evita fidelização no início; prioriza flexibilidade.",
            "Testa dados/voz e salva teu número em todos os serviços importantes.",
          ],
          docs: [],
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
          intro:
            "Moradia define o resto (NIF, banco, trabalho, rotina). A estratégia boa reduz risco no início. 🏡",
          steps: [
            "Decide: temporário (15–30 dias) vs relocation vs fechar antes.",
            "Pensa em risco vs custo: fechar antes pode sair caro/arriscado; temporário dá flexibilidade.",
            "Alinha com teu orçamento e com o cronograma do visto/AIMA.",
          ],
          docs: [],
        },
      },
      {
        id: "home_canais",
        label: "Estou a usar canais certos (Idealista/OLX/grupos locais, etc.)",
        details: {
          intro: "A oferta muda rápido — precisa estar nos canais certos. 🔍",
          steps: [
            "Cria alertas por bairro/preço (e filtros realistas).",
            "Entra em grupos locais (bairro/cidade) e acompanha diariamente.",
            "Responde rápido com mensagem pronta (perfil + renda + quando pode visitar).",
          ],
          docs: [],
        },
      },
      {
        id: "home_antigolpes",
        label: "Checklist anti-golpe ok (não pagar antes, validar senhorio/propriedade, etc.)",
        details: {
          intro:
            "No arrendamento, o risco maior é pagar por algo que não existe ou não é de quem diz ser. Seu padrão deve ser: verificar antes, pagar com rastro, guardar tudo. 🛡️",
          steps: [
            "Desconfia de preço muito abaixo e de pressão para “fechar hoje”.",
            "Não paga sem verificação mínima (visita/vídeo, contrato, titularidade).",
            "Evita transferências para terceiros sem vínculo claro; guarda comprovativos.",
            "Exige contrato e guarda tudo (PDF + prints + recibos).",
          ],
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
          intro:
            "NIF destrava banco, contrato de casa, operadora, trabalho e muita burocracia. O ponto crítico é morada/representante fiscal (quando exigido). 🔑",
          steps: [
            "Define uma morada de correspondência em Portugal e confirma se precisas de representante fiscal.",
            "Pede o NIF nas Finanças (ou via representante/serviço, conforme tua situação).",
            "Guarda comprovativo do NIF e já inicia o pedido da senha do Portal das Finanças.",
          ],
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
          intro:
            "O Portal das Finanças é onde você resolve morada fiscal e vários serviços. A senha costuma chegar por carta na morada indicada. 🔐",
          steps: [
            "Solicita a senha assim que tiver NIF (não deixa para depois).",
            "Confirma a morada onde a carta vai chegar e quem vai receber.",
            "Quando chegar, ativa e guarda num gerenciador de senhas.",
          ],
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
          intro:
            "É um comprovativo oficial muito usado (SNS, banco, serviços). As exigências variam por freguesia, então vai preparado. 🧾",
          steps: [
            "Identifica tua Junta de Freguesia (da área onde estás a morar).",
            "Leva documentos + prova da morada (contrato/declaração) e, se necessário, autorização do titular.",
            "Guarda original e digitaliza (vai pedir mais vezes).",
          ],
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
          steps: [
            "Com a senha do Portal, altera a morada fiscal online ou presencialmente nas Finanças.",
            "Confere se ficou ativa e se o endereço está correto (sem abreviações erradas).",
            "Arquiva o comprovativo (print/PDF).",
          ],
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
          intro:
            "Conta facilita salário, aluguel e pagamentos. O ponto é ir com documentos e escolher um banco que aceite teu perfil (comprovativos). 🏦",
          steps: [
            "Escolhe banco (ou fintech) e confirma requisitos para não-residente/residente.",
            "Leva NIF + passaporte + comprovativo de morada (e, se pedirem, comprovativo de renda).",
            "Abre conta, guarda IBAN e pede cartão/app.",
          ],
          docs: [
            { key: "nif", label: "NIF" },
            { key: "passaporte", label: "Passaporte" },
            { key: "morada", label: "Atestado/contrato de morada" },
            { key: "comprov_renda", label: "Comprovativo de renda (se exigido)" },
          ],
        },
      },
      {
        id: "pt_niss",
        label: "NISS (Segurança Social)",
        details: {
          intro:
            "NISS é essencial para vínculo de trabalho e obrigações na Segurança Social. O fluxo pode variar, então já chega com pasta completa. 🧑‍💼",
          steps: [
            "Confere se o pedido é online/presencial no teu concelho e quais anexos exigem.",
            "Leva NIF e comprovativo de morada; em alguns casos pedem prova de direito de residência/atividade.",
            "Guarda o número e o comprovativo para empregador/contratos.",
          ],
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
          steps: [
            "Vai ao Centro de Saúde da tua área (ou informa-te do fluxo local).",
            "Leva identificação + NIF + comprovativo de morada; em alguns casos pedem comprovativo de situação na AIMA.",
            "Guarda o número de utente e pergunta como marcar médico de família/consulta.",
          ],
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
          intro:
            "AIMA costuma ser gargalo. O segredo é: confirmar cedo, usar o canal correto e ter pasta completa para não perder a vaga. 🗓️",
          steps: [
            "Confere se já veio agendamento (data/hora/local) e guarda e-mail/print.",
            "Se não houver, identifica teu tipo de processo e inicia pedido no canal correto (portal/contactos, conforme aplicável).",
            "Prepara a pasta base: passaporte, visto, NIF, morada, meios e formulários.",
          ],
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
          steps: [
            "Imprime tudo (inclusive o que foi enviado online) e leva versões digitais offline.",
            "Organiza em pasta por separadores: identidade, visto, morada, meios, trabalho/estudo, saúde.",
            "Leva extras que façam sentido (dependentes, comprovativos adicionais, cópias).",
          ],
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
          steps: [
            "Confere data/hora/local com antecedência e guarda comprovativos offline.",
            "Planeia rota com margem (trânsito/greves/atrasos) e define Plano B de transporte.",
            "Separa tudo no dia anterior e dorme cedo (parece bobo, mas salva).",
          ],
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
          intro:
            "Se vais dirigir em Portugal, planeia o IMT com antecedência: prazos, elegibilidade e documentos variam e o agendamento pode demorar. 🚗",
          steps: [
            "Confere as regras atuais do IMT para troca/reconhecimento e prazos após residência.",
            "Garante CNH válida e prepara o atestado médico quando exigido.",
            "Organiza documentos e submete/agende o pedido quando estiver com a pasta completa.",
          ],
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
          steps: [
            "Define se vai manter seguro no início (até estabilizar no SNS).",
            "Com número de utente, avalia se vale manter plano/seguro para especialistas/exames.",
            "Considera teu perfil (crônicos, gravidez, necessidade de especialistas) e orçamento.",
          ],
          docs: [
            { key: "utente", label: "Número de utente" },
            { key: "seguro", label: "Apólice/condições do seguro (se tiver)" },
          ],
        },
      },
    ],
  },
];

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

/**
 * Progresso do painel «Meu plano»: respostas preenchidas no formulário (meta), não os checklists das fases.
 */
function planFormProgress(meta: ChecklistData["meta"] | undefined): { pct: number; done: number; total: number } {
  const m = meta ?? {};
  const filled: boolean[] = [
    !!m.visaType,
    !!m.cidade,
    !!m.cidadePlanoB,
    !!m.agregadoFamiliar,
    !!m.numQuartos,
    Array.isArray(m.profissoesPossiveis) && m.profissoesPossiveis.length > 0,
    m.precisaCarro !== undefined,
    Boolean(m.dataViagem && String(m.dataViagem).trim() !== ""),
    Boolean(m.notas && String(m.notas).trim() !== ""),
  ];
  const total = filled.length;
  const done = filled.filter(Boolean).length;
  return { pct: total ? Math.round((done / total) * 100) : 0, done, total };
}

export default function ChecklistPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isMember = user?.tier === "MEMBER";
  const isVisitor = Boolean(user && !isMember);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [data, setData] = useState<ChecklistData>({ meta: {}, checks: {} });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [activePanel, setActivePanel] = useState<"plan" | "brasil" | "portugal">("plan");

  const dirtyRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const phase1 = useMemo(() => phaseProgress(data, "BRASIL"), [data]);
  const phase2 = useMemo(() => phaseProgress(data, "PORTUGAL"), [data]);
  const meuPlano = useMemo(() => planFormProgress(data.meta), [data.meta]);
  const reserva = useMemo(() => estimateReserva(data.meta), [data.meta]);
  /** Nenhum campo do bloco "Meu plano" (meta) preenchido ainda. */
  const semInfoPlanoImigracao = meuPlano.done === 0;
  const eurOuPlaceholder = (value: number) =>
    semInfoPlanoImigracao ? "???" : formatEur(value);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setLoadError("");
      return;
    }
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
  }, [user?.id]);

  // Mobile browsers (especialmente iOS) podem falhar/ignorar `window.print()` quando chamado direto no onClick.
  // Estratégia: navegar para `?print=1&panel=…` e disparar o print no efeito (panel garante a vista certa após reload).
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (searchParams.get("print") !== "1") return;
    const raw = searchParams.get("panel");
    const panel =
      raw === "brasil" || raw === "portugal" || raw === "plan" ? raw : "plan";
    setActivePanel(panel);
    const t = window.setTimeout(() => {
      document.body.dataset.printScope = panel;
      const onAfterPrint = () => {
        delete document.body.dataset.printScope;
        window.removeEventListener("afterprint", onAfterPrint);
      };
      window.addEventListener("afterprint", onAfterPrint);
      try {
        window.print();
      } finally {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("print");
          url.searchParams.delete("panel");
          window.history.replaceState({}, "", url.toString());
        } catch {
          // noop
        }
      }
    }, 320);
    return () => window.clearTimeout(t);
  }, [searchParams, user]);

  function openLoginModal() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "login" } }));
  }

  function openVipModal() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }

  function requireLogin(): boolean {
    if (user) return true;
    openLoginModal();
    return false;
  }

  function guardGuestInteraction(
    e:
      | React.MouseEvent<HTMLElement>
      | React.FocusEvent<HTMLElement>
      | React.KeyboardEvent<HTMLElement>,
  ) {
    if (user) return;
    e.preventDefault();
    e.stopPropagation();
    openLoginModal();
  }

  function queueSave(next: ChecklistData) {
    if (!user) return;
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
    if (!requireLogin()) return;
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

  function toggleMetaArray(key: "profissoesPossiveis", value: string) {
    if (!user) {
      openLoginModal();
      return;
    }
    setData((prev) => {
      const cur = (prev.meta?.[key] ?? []) as string[];
      const nextArr = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      const next: ChecklistData = { ...prev, meta: { ...(prev.meta ?? {}), [key]: nextArr } };
      queueSave(next);
      return next;
    });
  }

  function setMeta<K extends keyof NonNullable<ChecklistData["meta"]>>(key: K, value: any) {
    if (!user) {
      openLoginModal();
      return;
    }
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
    if (!user) {
      openLoginModal();
      return;
    }
    setData((prev) => {
      const checks = { ...(prev.checks ?? {}) };
      checks[id] = !checks[id];
      const next = { ...prev, checks };
      queueSave(next);
      return next;
    });
  }

  function toggleDetails(id: string) {
    if (!user) {
      openLoginModal();
      return;
    }
    if (!isMember) {
      openVipModal();
      return;
    }
    setOpenDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /**
   * Desktop: define `body[data-print-scope]` para o CSS ocultar o que não deve sair na folha.
   * Mobile: recarrega com ?print=1&panel=… (o efeito aplica o mesmo scope antes do print).
   */
  function triggerPrint(forPanel: "plan" | "brasil" | "portugal" = "plan") {
    if (!requireLogin()) return;
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia ? window.matchMedia("(max-width: 1023px)").matches : window.innerWidth < 1024;
    if (isMobile) {
      const url = new URL(window.location.href);
      url.searchParams.set("print", "1");
      url.searchParams.set("panel", forPanel);
      window.location.assign(url.toString());
      return;
    }
    document.body.dataset.printScope = forPanel;
    const onAfterPrint = () => {
      delete document.body.dataset.printScope;
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
  }

  return (
    <>
      {/* Mobile: largura total do <main> (anula p-4); sem moldura — alinhado ao conteúdo abaixo */}
      <div className="-mx-4 mb-5 print:hidden md:hidden">
        <Image
          src="/rafa_cards/plano_hero.png"
          alt="Plano de imigração"
          width={1250}
          height={1875}
          className="h-auto w-full object-contain"
          sizes="100vw"
          priority
        />
      </div>
    <div className="mx-auto w-full max-w-[980px] space-y-6 overflow-x-hidden">
      <div className="p-1">
        <div
          data-print-section="page-intro"
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="hidden text-2xl font-semibold text-zinc-900 print:block md:block">
              Meu Plano de Imigração
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Organize teu plano e acompanhe as etapas do processo até se regularizar em Portugal.
            </p>
          </div>
          <div
            className="w-full print:hidden sm:ml-auto sm:max-w-[32rem] sm:shrink-0"
            role="tablist"
            aria-label="Secções do plano de imigração"
          >
            {/* Segmented control: faixa única, separador ativo = “pastilha” branca */}
            <div className="flex w-full gap-0.5 rounded-2xl bg-zinc-100/95 p-1 ring-1 ring-inset ring-zinc-200/80">
              <button
                type="button"
                role="tab"
                aria-selected={activePanel === "plan"}
                onClick={() => setActivePanel("plan")}
                className={
                  "flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:px-2 sm:py-2.5 " +
                  (activePanel === "plan"
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/60"
                    : "text-zinc-600 hover:bg-zinc-200/45 hover:text-zinc-900")
                }
              >
                <p className="text-[10px] font-semibold leading-tight sm:text-[11px]">Meu plano 🧩</p>
                <p className="text-sm font-extrabold tabular-nums sm:text-base">{meuPlano.pct}%</p>
                <p className="text-[9px] tabular-nums text-zinc-500 sm:text-[10px]">
                  {meuPlano.done}/{meuPlano.total}
                </p>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePanel === "brasil"}
                onClick={() => setActivePanel("brasil")}
                className={
                  "flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:px-2 sm:py-2.5 " +
                  (activePanel === "brasil"
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/60"
                    : "text-zinc-600 hover:bg-zinc-200/45 hover:text-zinc-900")
                }
              >
                <p className="flex items-center justify-center gap-1 text-[10px] font-semibold leading-tight sm:gap-1.5 sm:text-[11px]">
                  <span className="truncate">Fase 1</span>
                  <FlagBr
                    className="h-3.5 w-auto shrink-0 object-contain sm:h-4"
                    alt=""
                    title="Brasil"
                  />
                </p>
                <p className="text-sm font-extrabold tabular-nums sm:text-base">{phase1.pct}%</p>
                <p className="text-[9px] tabular-nums text-zinc-500 sm:text-[10px]">
                  {phase1.done}/{phase1.total}
                </p>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePanel === "portugal"}
                onClick={() => setActivePanel("portugal")}
                className={
                  "flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:px-2 sm:py-2.5 " +
                  (activePanel === "portugal"
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/60"
                    : "text-zinc-600 hover:bg-zinc-200/45 hover:text-zinc-900")
                }
              >
                <p className="flex items-center justify-center gap-1 text-[10px] font-semibold leading-tight sm:gap-1.5 sm:text-[11px]">
                  <span className="truncate">Fase 2</span>
                  <FlagPt
                    className="h-3.5 w-auto shrink-0 object-contain sm:h-4"
                    alt=""
                    title="Portugal"
                  />
                </p>
                <p className="text-sm font-extrabold tabular-nums sm:text-base">{phase2.pct}%</p>
                <p className="text-[9px] tabular-nums text-zinc-500 sm:text-[10px]">
                  {phase2.done}/{phase2.total}
                </p>
              </button>
            </div>
          </div>
        </div>
        {saveError ? (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">{saveError}</div>
        ) : null}
        {saveOk ? (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">{saveOk}</div>
        ) : null}
      </div>

      <div className="space-y-4">
        <section
          data-print-section="plan"
          className={activePanel === "plan" ? "block" : "hidden"}
          aria-label="Meu plano"
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Meu plano 🧩</h2>

            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900">Reserva para imigrar (EUR)</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Valor MINIMO indicado por Rafa
                    </p>
                  </div>
                    <p className="shrink-0 text-sm font-extrabold text-zinc-900 tabular-nums">
                    {eurOuPlaceholder(reserva.reserva3m)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-700">
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
                    <p className="text-[11px] font-medium text-zinc-500">Custo fixo mensal</p>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {eurOuPlaceholder(reserva.mensal)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
                    <p className="text-[11px] font-medium text-zinc-500">Relocation / documentação / cauções</p>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {eurOuPlaceholder(reserva.chegadaDocumentacaoCaucao)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
                    <p className="text-[11px] font-medium text-zinc-500">Reserva para 3 meses</p>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {eurOuPlaceholder(reserva.reserva3m)}
                    </p>
                  </div>
                </div>

                <div className="relative mt-3 rounded-xl bg-white px-3 py-3 text-xs text-zinc-700 ring-1 ring-zinc-200">
                  <p className="font-semibold text-zinc-900">Detalhe dos custos estimados</p>

                  <div
                    className={!isMember ? "mt-2 blur-sm select-none pointer-events-none" : "mt-2"}
                    aria-hidden={!isMember}
                  >
                    <ul className="space-y-1">
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-zinc-600">Moradia (arrendamento)</span>
                        <span className="font-semibold tabular-nums">{eurOuPlaceholder(reserva.renda)}</span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-zinc-600">Água/luz/internet</span>
                        <span className="font-semibold tabular-nums">
                          {eurOuPlaceholder(reserva.contasMensal)}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-zinc-600">Mobilidade (carro/transporte)</span>
                        <span className="font-semibold tabular-nums">
                          {eurOuPlaceholder(reserva.mobilidadeMensal)}
                        </span>
                      </li>
                      {semInfoPlanoImigracao || reserva.financiamentoCarroMensal > 0 ? (
                        <li className="flex items-center justify-between gap-3">
                          <span className="text-zinc-600">Financiamento do carro (mensal)</span>
                          <span className="font-semibold tabular-nums">
                            {semInfoPlanoImigracao
                              ? "???"
                              : formatEur(reserva.financiamentoCarroMensal)}
                          </span>
                        </li>
                      ) : null}
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-zinc-600">Alimentação</span>
                        <span className="font-semibold tabular-nums">
                          {eurOuPlaceholder(reserva.alimentacaoMensal)}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-zinc-600">Documentação</span>
                        <span className="font-semibold tabular-nums">{eurOuPlaceholder(800)}</span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-zinc-600">Relocation</span>
                        <span className="font-semibold tabular-nums">{eurOuPlaceholder(700)}</span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-zinc-600">3 cauções</span>
                        <span className="font-semibold tabular-nums">{eurOuPlaceholder(reserva.renda * 3)}</span>
                      </li>
                    </ul>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {semInfoPlanoImigracao
                        ? "Indica cidade, agregado, quartos e o resto do plano acima para veres valores calculados com base no teu perfil."
                        : "Estes valores são referências de 2026 e variam por bairro, época e perfil. Ajuste a cidade, nº de quartos e agregado familiar para refinar."}
                    </p>
                  </div>

                  {!isMember ? (
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 top-9 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => openVipModal()}
                        className="pointer-events-auto cursor-pointer rounded-full border-0 bg-zinc-900/80 px-3 py-1 text-[11px] font-semibold text-white shadow-sm outline-none ring-offset-2 hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        Exclusivo para membros VIP
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Tipo de visto</label>
                <select
                  value={data.meta?.visaType ?? ""}
                  onChange={(e) => setMeta("visaType", e.target.value as VisaType)}
                  onMouseDown={guardGuestInteraction}
                  onFocus={guardGuestInteraction}
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
                <select
                  value={data.meta?.cidade ?? ""}
                  onChange={(e) => setMeta("cidade", e.target.value as CityKey)}
                  onMouseDown={guardGuestInteraction}
                  onFocus={guardGuestInteraction}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Cidade plano B</label>
                <select
                  value={data.meta?.cidadePlanoB ?? ""}
                  onChange={(e) => setMeta("cidadePlanoB", e.target.value as CityKey)}
                  onMouseDown={guardGuestInteraction}
                  onFocus={guardGuestInteraction}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Tamanho do agregado familiar</label>
                <select
                  value={data.meta?.agregadoFamiliar ?? ""}
                  onChange={(e) => setMeta("agregadoFamiliar", e.target.value)}
                  onMouseDown={guardGuestInteraction}
                  onFocus={guardGuestInteraction}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Selecionar…</option>
                  <option value="1">1 pessoa</option>
                  <option value="2">2 pessoas</option>
                  <option value="3">3 pessoas</option>
                  <option value="4">4 pessoas</option>
                  <option value="5+">5+ pessoas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600">Número de quartos</label>
                <select
                  value={data.meta?.numQuartos ?? ""}
                  onChange={(e) => setMeta("numQuartos", e.target.value)}
                  onMouseDown={guardGuestInteraction}
                  onFocus={guardGuestInteraction}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Selecionar…</option>
                  <option value="0">Quarto em ap compartilhado</option>
                  <option value="1">T1 (ap de 1 quarto)</option>
                  <option value="2">T2 (ap de 2 quartos)</option>
                  <option value="3">T3 (ap de 3 quartos)</option>
                  <option value="4+">T4+ (ap de 4 ou mais quartos)</option>
                </select>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-600">Profissões possíveis para mim</p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {[
                    "Restauração (garçom/cozinha)",
                    "Hotelaria (limpeza/housekeeping)",
                    "Construção civil",
                    "Fábricas (linha de produção)",
                    "Logística / armazém",
                    "Cuidados (idosos/crianças)",
                    "Call center / atendimento",
                    "Agricultura / sazonais",
                    "TI / remoto",
                  ].map((p) => {
                    const checked = Boolean(data.meta?.profissoesPossiveis?.includes(p));
                    return (
                      <label
                        key={p}
                        className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                          checked ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                        } ${!user ? "opacity-70" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMetaArray("profissoesPossiveis", p)}
                          onMouseDown={guardGuestInteraction}
                          onFocus={guardGuestInteraction}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600"
                        />
                        <span className="text-zinc-800">{p}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-600">Vou precisar comprar carro?</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { id: "sim", label: "Sim", value: true },
                    { id: "nao", label: "Não", value: false },
                    { id: "talvez", label: "Talvez", value: null },
                  ].map((opt) => {
                    const selected = (data.meta?.precisaCarro ?? null) === opt.value;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMeta("precisaCarro", opt.value)}
                        className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          selected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        } ${!user ? "opacity-70" : ""}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-600">Data da viagem</label>
                  <input
                    type="date"
                    value={data.meta?.dataViagem ?? ""}
                    onChange={(e) => setMeta("dataViagem", e.target.value)}
                    onMouseDown={guardGuestInteraction}
                    onFocus={guardGuestInteraction}
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
                  onMouseDown={guardGuestInteraction}
                  onFocus={guardGuestInteraction}
                  placeholder="Links, contatos, lembretes…"
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <CardButton
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={() => triggerPrint("plan")}
                  className="hover:!from-[#c07c01] hover:!to-[#e7a01f]"
                >
                  Imprimir plano
                </CardButton>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {activePanel === "brasil" || activePanel === "portugal" ? (
            loading ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
                Carregando teu checklist…
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {loadError}
              </div>
            ) : (
            (() => {
              const sectionsBrasil = SECTIONS.filter((s) => s.phase === "BRASIL");
              const sectionsPortugal = SECTIONS.filter((s) => s.phase === "PORTUGAL");

              const renderSections = (sections: typeof SECTIONS) => (
                <div className="space-y-4">
                  {sections.map((section) => (
                    <div key={section.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 break-words text-base font-semibold text-zinc-900">
                          <span className="mr-2">{section.emoji}</span>
                          {section.title}
                        </h3>
                        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                          <span className="tabular-nums">
                            {section.items.filter((i) => data.checks?.[i.id]).length}/{section.items.length}
                          </span>
                          <span className="inline-flex items-center" aria-hidden>
                            {section.phase === "BRASIL" ? (
                              <FlagBr className="h-3.5 w-auto object-contain" alt="" title="Brasil" />
                            ) : (
                              <FlagPt className="h-3.5 w-auto object-contain" alt="" title="Portugal" />
                            )}
                          </span>
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
                                  className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <p className="min-w-0 break-words text-sm font-medium text-zinc-900">
                                      {item.label}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => toggleDetails(item.id)}
                                      className="shrink-0 cursor-pointer self-start rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100/60"
                                    >
                                      {expanded ? "Fechar" : "Como fazer"}
                                    </button>
                                  </div>
                                  {expanded ? (
                                    <div className="mt-3">
                                      <p className="text-xs font-semibold text-zinc-900">Como fazer ✨</p>
                                      <p className="mt-1 text-sm text-zinc-700">{item.details.intro}</p>
                                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                                        {item.details.steps.map((s, idx) => (
                                          <li key={idx}>{s}</li>
                                        ))}
                                      </ul>

                                      {item.details.docs.length ? (
                                        <div className="mt-3">
                                          <p className="text-xs font-semibold text-zinc-900">Documentos necessarios 📎</p>
                                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                                            {item.details.docs.map((d) => (
                                              <li key={d.key}>{d.label}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : null}
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
              );

              return (
                <div className="space-y-6">
                  <section
                    data-print-section="checklist-brasil"
                    className={activePanel === "brasil" ? "block" : "hidden"}
                    aria-label="Fase 1 — checklist"
                  >
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900">
                      <FlagBr
                        className="h-5 w-auto shrink-0 object-contain sm:h-6"
                        alt=""
                        title="Brasil"
                      />
                      Fase 1 — ainda no Brasil
                    </h2>
                    {renderSections(sectionsBrasil)}
                    <div className="mt-6 flex w-full justify-center print:hidden">
                      <CardButton
                        type="button"
                        variant="primary"
                        fullWidth
                        className="w-full max-w-md hover:!from-[#c07c01] hover:!to-[#e7a01f]"
                        onClick={() => triggerPrint("brasil")}
                      >
                        Imprimir checklist
                      </CardButton>
                    </div>
                  </section>

                  <section
                    data-print-section="checklist-portugal"
                    className={activePanel === "portugal" ? "block" : "hidden"}
                    aria-label="Fase 2 — checklist"
                  >
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900">
                      <FlagPt
                        className="h-5 w-auto shrink-0 object-contain sm:h-6"
                        alt=""
                        title="Portugal"
                      />
                      Fase 2 — já em Portugal
                    </h2>
                    {renderSections(sectionsPortugal)}
                    <div className="mt-6 flex w-full justify-center print:hidden">
                      <CardButton
                        type="button"
                        variant="primary"
                        fullWidth
                        className="w-full max-w-md hover:!from-[#c07c01] hover:!to-[#e7a01f]"
                        onClick={() => triggerPrint("portugal")}
                      >
                        Imprimir checklist
                      </CardButton>
                    </div>
                  </section>
                </div>
              );
            })()
            )
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}

