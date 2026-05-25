/**
 * Constantes e regras do formulário de upload de documentos por leads de financiamento.
 *
 * Espelha as constantes do backend (`backend/src/lead-documents/lead-documents.constants.ts`).
 * Mantém os dois lados em sincronia: a fonte da verdade da matriz de regras é esta lista.
 */

/** Modos de envio: principal, do cônjuge ou complementar. */
export const LEAD_DOCUMENT_SUBMISSION_MODES = ['main', 'spouse', 'extra'] as const;
export type LeadDocumentSubmissionMode =
  (typeof LEAD_DOCUMENT_SUBMISSION_MODES)[number];

export function labelForMode(mode: LeadDocumentSubmissionMode): string {
  if (mode === 'spouse') return 'Documentos do cônjuge';
  if (mode === 'extra') return 'Envio complementar';
  return 'Envio principal';
}

/** Vínculos laborais aceites. */
export const VINCULOS_LABORAIS = [
  'Contrato Efetivo',
  'Contrato temporário',
  'Recibos verdes',
] as const;
export type VinculoLaboral = (typeof VINCULOS_LABORAIS)[number];

/** Estados civis aceites (apenas para registo — não alteram a lista de documentos). */
export const ESTADOS_CIVIS = [
  'Solteiro(a)',
  'Casado(a) – comunhão de bens',
  'Casado(a) – separação de bens',
  'União de facto',
  'Divorciado(a)',
  'Viúvo(a)',
  'Outro',
] as const;
export type EstadoCivil = (typeof ESTADOS_CIVIS)[number];

/** Disponibilidade para fiador — só relevante para vínculos não efectivos. */
export const DISPONIBILIDADES_FIADOR = [
  'Sim',
  'Não',
  'Talvez',
] as const;
export type DisponibilidadeFiador = (typeof DISPONIBILIDADES_FIADOR)[number];

export type DocFieldName =
  | 'cartao_residencia_ou_passaporte'
  | 'recibo_vencimento_1'
  | 'recibo_vencimento_2'
  | 'recibo_vencimento_3'
  | 'contrato_ou_declaracao_efetividade'
  | 'contrato_temporario'
  | 'extrato_recibos_12_meses'
  | 'declaracao_abertura_atividade'
  | 'irs_declaracao'
  | 'irs_nota_liquidacao'
  | 'comprovativo_morada'
  | 'mapa_responsabilidades'
  | 'declaracao_nao_divida_financas'
  | 'declaracao_nao_divida_seguranca_social'
  | 'declaracao_predial';

/** Nome canónico (sem extensão) de cada documento. Igual ao backend. */
export const DOC_STANDARD_NAMES: Record<DocFieldName, string> = {
  cartao_residencia_ou_passaporte: 'Cartão de residência ou passaporte',
  recibo_vencimento_1: 'Recibo de vencimento 1',
  recibo_vencimento_2: 'Recibo de vencimento 2',
  recibo_vencimento_3: 'Recibo de vencimento 3',
  contrato_ou_declaracao_efetividade: 'Contrato ou declaração de efetividade',
  contrato_temporario: 'Contrato',
  extrato_recibos_12_meses: 'Extrato dos últimos 12 meses de recibos verdes',
  declaracao_abertura_atividade: 'Declaração de abertura de atividade',
  irs_declaracao: 'Declaração de IRS',
  irs_nota_liquidacao: 'Nota de liquidação IRS',
  comprovativo_morada: 'Comprovativo de morada',
  mapa_responsabilidades: 'Mapa de responsabilidades de crédito',
  declaracao_nao_divida_financas: 'Declaração de não dívida (Finanças)',
  declaracao_nao_divida_seguranca_social:
    'Declaração de não dívida (Segurança Social)',
  declaracao_predial: 'Declaração Predial negativa',
};

/** Descrição apresentada no card de cada documento (orienta o lead). */
export const DOC_DESCRIPTIONS: Record<DocFieldName, string> = {
  cartao_residencia_ou_passaporte:
    'Documento de identificação válido: cartão de residência (titular de autorização de residência) ou passaporte. Deve estar dentro do prazo de validade.',
  recibo_vencimento_1:
    'Comprovativo de rendimento — o recibo do empregador com o valor líquido do salário. Anexa os 3 últimos meses; este é o mais recente.',
  recibo_vencimento_2: 'Mês imediatamente anterior ao recibo 1.',
  recibo_vencimento_3: 'Terceiro recibo (o mais antigo dos três meses).',
  contrato_ou_declaracao_efetividade:
    'Comprova o vínculo laboral e se está efetivo. Pode ser o contrato de trabalho assinado ou uma declaração da entidade patronal a indicar regime de efetividade.',
  contrato_temporario:
    'Contrato de trabalho temporário ou a termo certo. Deve ser o contrato assinado e válido.',
  extrato_recibos_12_meses:
    'Comprovativo dos rendimentos como trabalhador independente. No Portal das Finanças → «Faturas e Recibos» / «Recibos Verdes Eletrónicos» → «Consultar Recibos» dos últimos 12 meses. Faz print da página e anexa.',
  declaracao_abertura_atividade:
    'Documento que comprova a inscrição como trabalhador independente — declaração de início de atividade das Finanças.',
  irs_declaracao:
    'Declaração de IRS do último ano fiscal. No Portal das Finanças → Área reservada → Declarações → Consultar declarações entregues → download em PDF.',
  irs_nota_liquidacao:
    'Nota de liquidação do IRS (reembolso ou valor a pagar). Disponível no Portal das Finanças após a entrega da declaração.',
  comprovativo_morada:
    'Documento que comprova a tua morada fiscal — extrato de morada gerado em PDF no Portal das Finanças (Área reservada → Dados pessoais / Morada fiscal).',
  mapa_responsabilidades:
    'Documento oficial do Banco de Portugal com a lista dos teus créditos. No site do Banco de Portugal → Particulares → Central de Responsabilidades de Crédito → autentica-te com Cartão de Cidadão ou Finanças → o download é feito automaticamente.',
  declaracao_nao_divida_financas:
    'No Portal das Finanças → Área reservada → procura «Certidão de situação contributiva» ou «Declaração de não dívida fiscal» → seleciona o tipo de certidão → gera o PDF.',
  declaracao_nao_divida_seguranca_social:
    'Em segurança social Direta (seg-social.pt) → procura «Certidão de situação contributiva» ou «Declaração de não dívida» → seleciona o período → gera o PDF.',
  declaracao_predial:
    'Comprova que não tens imóveis em teu nome. No Portal das Finanças → Área reservada → Serviços → Registo e notários → «Declaração de não titularidade» ou «Certidão permanente de conteúdo de registo predial».',
};

/** Conjunto base (sempre pedido, independente do vínculo). */
const COMMON_FIELDS: DocFieldName[] = [
  'cartao_residencia_ou_passaporte',
  'irs_declaracao',
  'irs_nota_liquidacao',
  'comprovativo_morada',
  'mapa_responsabilidades',
];

/** Devolve a lista ordenada de campos obrigatórios para um lead. Igual ao backend. */
export function getRequiredDocFields(input: {
  vinculo: VinculoLaboral;
  financiamento100: boolean;
}): DocFieldName[] {
  const byVinculo: DocFieldName[] =
    input.vinculo === 'Contrato temporário'
      ? [
          'recibo_vencimento_1',
          'recibo_vencimento_2',
          'recibo_vencimento_3',
          'contrato_temporario',
        ]
      : input.vinculo === 'Recibos verdes'
        ? ['extrato_recibos_12_meses', 'declaracao_abertura_atividade']
        : [
            'recibo_vencimento_1',
            'recibo_vencimento_2',
            'recibo_vencimento_3',
            'contrato_ou_declaracao_efetividade',
          ];

  const cartao: DocFieldName = 'cartao_residencia_ou_passaporte';
  const base = [cartao, ...byVinculo, ...COMMON_FIELDS.filter((f) => f !== cartao)];

  if (!input.financiamento100) return base;

  return [
    ...base,
    'declaracao_nao_divida_financas',
    'declaracao_nao_divida_seguranca_social',
    'declaracao_predial',
  ];
}

/** Extensões aceites no input file. */
export const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png';

/** 15 MB por ficheiro. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export function bytesToHumanReadable(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

export function digitsOnly(value: string): string {
  return String(value ?? '').replace(/\D+/g, '');
}
