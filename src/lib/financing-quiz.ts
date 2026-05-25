/**
 * Definição declarativa do quiz de financiamento. Espelhamos no frontend as mesmas
 * perguntas, ramificações e textos que o backend usa para classificar — assim a UI
 * decide o próximo passo localmente e só chama a API uma vez no final.
 */

export type YesNo = 'SIM' | 'NAO';
export type MaritalStatus = 'casado' | 'solteiro';

export type FinancingAnswers = {
  residencePt?: YesNo;
  mode?: MaritalStatus;
  q2?: YesNo;
  q3?: YesNo;
  q5?: YesNo;
  q7?: YesNo;
  capitalOk?: YesNo;
  capitalPercent?: 10 | 20;
  foreignCtef?: YesNo;
  foreignCapital?: YesNo;
};

export type QuizStepId =
  | 'AWAIT_RESIDENCE'
  | 'AWAIT_MARITAL'
  | 'AWAIT_Q2'
  | 'AWAIT_Q3'
  | 'AWAIT_Q7'
  | 'AWAIT_Q5'
  | 'AWAIT_CAPITALS'
  | 'AWAIT_FOREIGN_CTEF'
  | 'AWAIT_FOREIGN_CAPITAL'
  | 'DONE';

/** Próximo passo do quiz em função das respostas atuais. */
export function nextStep(answers: FinancingAnswers): QuizStepId {
  if (!answers.residencePt) return 'AWAIT_RESIDENCE';
  if (!answers.mode) return 'AWAIT_MARITAL';

  if (answers.residencePt === 'NAO') {
    if (!answers.foreignCtef) return 'AWAIT_FOREIGN_CTEF';
    if (answers.foreignCtef === 'NAO') return 'DONE';
    if (!answers.foreignCapital) return 'AWAIT_FOREIGN_CAPITAL';
    return 'DONE';
  }

  if (!answers.q2) return 'AWAIT_Q2';
  if (!answers.q3) return 'AWAIT_Q3';

  if (answers.q3 === 'NAO') {
    if (!answers.q7) return 'AWAIT_Q7';
    if (answers.q7 === 'NAO') return 'DONE';
    if (!answers.q5) return 'AWAIT_Q5';
    return 'DONE';
  }

  if (!answers.q5) return 'AWAIT_Q5';

  const requiredPct = computeRequiredCapitalPercent(answers.q2, answers.q3, answers.q5);
  if (requiredPct !== null && !answers.capitalOk) return 'AWAIT_CAPITALS';
  return 'DONE';
}

function computeRequiredCapitalPercent(
  q2: YesNo | undefined,
  q3: YesNo | undefined,
  q5: YesNo | undefined,
): 10 | 20 | null {
  if (q2 === 'NAO' && q3 === 'SIM') return 20;
  if (q2 === 'SIM' && q3 === 'SIM' && q5 === 'NAO') return 10;
  return null;
}

export type QuizQuestion = {
  id: QuizStepId;
  title: string;
  subtitle?: string;
  options: { value: string; label: string; sub?: string }[];
};

export function renderQuestion(stepId: QuizStepId, answers: FinancingAnswers): QuizQuestion | null {
  const isCasado = answers.mode === 'casado';
  const possessive = isCasado ? 'Vocês têm' : 'Você tem';
  const possessivoTem = isCasado ? 'Pelo menos um dos dois' : 'Você';

  switch (stepId) {
    case 'AWAIT_RESIDENCE':
      return {
        id: stepId,
        title: 'Você já mora em Portugal?',
        subtitle: 'Vamos descobrir, em poucos passos, se consegue financiar uma casa em Portugal.',
        options: [
          { value: 'SIM', label: 'Sim, já moro em Portugal' },
          { value: 'NAO', label: 'Ainda não moro' },
        ],
      };
    case 'AWAIT_MARITAL':
      return {
        id: stepId,
        title: 'Estado civil',
        subtitle: 'Se está em união de facto, responda como CASADO.',
        options: [
          { value: 'casado', label: 'Casado(a) / União de facto' },
          { value: 'solteiro', label: 'Solteiro(a)' },
        ],
      };
    case 'AWAIT_Q2':
      return {
        id: stepId,
        title: isCasado
          ? 'Pelo menos um dos dois já possui Cartão de Cidadão ou Título de Residência (no formato cartão)?'
          : 'Já possui Cartão de Cidadão ou Título de Residência (no formato cartão)?',
        options: [
          { value: 'SIM', label: 'Sim' },
          { value: 'NAO', label: 'Ainda não' },
        ],
      };
    case 'AWAIT_Q3':
      return {
        id: stepId,
        title: `${possessivoTem} ${isCasado ? 'possuem' : 'possui'} Contrato de Trabalho Efetivo?`,
        subtitle: 'Contrato sem termo (efetivo), na empresa onde trabalha.',
        options: [
          { value: 'SIM', label: 'Sim' },
          { value: 'NAO', label: 'Não / Recibos verdes / Termo' },
        ],
      };
    case 'AWAIT_Q7':
      return {
        id: stepId,
        title: isCasado
          ? 'Teriam 10% do valor da casa em capitais próprios para dar de entrada?'
          : 'Teria 10% do valor da casa em capitais próprios para dar de entrada?',
        subtitle:
          'Sem contrato de trabalho efetivo, o caso é mais complexo — confirmar a entrada ajuda a perceber a viabilidade.',
        options: [
          { value: 'SIM', label: 'Sim, conseguiria' },
          { value: 'NAO', label: 'Não' },
        ],
      };
    case 'AWAIT_Q5':
      return {
        id: stepId,
        title: isCasado ? 'Ambos têm menos de 35 anos?' : 'Tem menos de 35 anos?',
        options: [
          { value: 'SIM', label: 'Sim' },
          { value: 'NAO', label: 'Não' },
        ],
      };
    case 'AWAIT_CAPITALS': {
      const pct = computeRequiredCapitalPercent(answers.q2, answers.q3, answers.q5) ?? 20;
      return {
        id: stepId,
        title: `${possessive} ${pct}% do valor da casa em capitais próprios para dar de entrada?`,
        subtitle: `É a entrada habitualmente exigida pelos bancos no seu perfil (~${pct}%).`,
        options: [
          { value: 'SIM', label: `Sim, ${pct}% ou mais` },
          { value: 'NAO', label: 'Não' },
        ],
      };
    }
    case 'AWAIT_FOREIGN_CTEF':
      return {
        id: stepId,
        title: isCasado
          ? 'Pelo menos um dos dois possui Contrato de Trabalho Efetivo?'
          : 'Possui Contrato de Trabalho Efetivo?',
        subtitle: 'Para os bancos em Portugal, este é o principal fator de aprovação.',
        options: [
          { value: 'SIM', label: 'Sim' },
          { value: 'NAO', label: 'Não / Recibos verdes / Termo' },
        ],
      };
    case 'AWAIT_FOREIGN_CAPITAL':
      return {
        id: stepId,
        title: isCasado
          ? 'Teriam 20% do valor da casa em capitais próprios para a entrada?'
          : 'Teria 20% do valor da casa em capitais próprios para a entrada?',
        subtitle:
          'Como investidor estrangeiro, os bancos em Portugal costumam financiar cerca de 80% do imóvel.',
        options: [
          { value: 'SIM', label: 'Sim, conseguiria' },
          { value: 'NAO', label: 'Não' },
        ],
      };
    case 'DONE':
    default:
      return null;
  }
}

/** Aplica uma resposta no `answers` e devolve um novo objeto. */
export function applyAnswer(
  answers: FinancingAnswers,
  stepId: QuizStepId,
  value: string,
): FinancingAnswers {
  const next: FinancingAnswers = { ...answers };
  switch (stepId) {
    case 'AWAIT_RESIDENCE':
      next.residencePt = value as YesNo;
      // ao mudar a trilha, limpa respostas conflituantes
      if (value === 'SIM') {
        next.foreignCtef = undefined;
        next.foreignCapital = undefined;
      } else {
        next.q2 = undefined;
        next.q3 = undefined;
        next.q5 = undefined;
        next.q7 = undefined;
        next.capitalOk = undefined;
        next.capitalPercent = undefined;
      }
      break;
    case 'AWAIT_MARITAL':
      next.mode = value as MaritalStatus;
      break;
    case 'AWAIT_Q2':
      next.q2 = value as YesNo;
      break;
    case 'AWAIT_Q3':
      next.q3 = value as YesNo;
      if (value === 'SIM') {
        next.q7 = undefined;
      }
      break;
    case 'AWAIT_Q7':
      next.q7 = value as YesNo;
      if (value === 'SIM') {
        next.capitalOk = 'SIM';
        next.capitalPercent = 10;
      }
      break;
    case 'AWAIT_Q5':
      next.q5 = value as YesNo;
      break;
    case 'AWAIT_CAPITALS': {
      next.capitalOk = value as YesNo;
      const pct = computeRequiredCapitalPercent(next.q2, next.q3, next.q5);
      if (pct !== null) next.capitalPercent = pct;
      break;
    }
    case 'AWAIT_FOREIGN_CTEF':
      next.foreignCtef = value as YesNo;
      break;
    case 'AWAIT_FOREIGN_CAPITAL':
      next.foreignCapital = value as YesNo;
      break;
  }
  return next;
}

/** Reverte (apaga) a resposta de um passo para permitir voltar. */
export function clearAnswer(answers: FinancingAnswers, stepId: QuizStepId): FinancingAnswers {
  const next = { ...answers };
  switch (stepId) {
    case 'AWAIT_RESIDENCE':
      next.residencePt = undefined;
      break;
    case 'AWAIT_MARITAL':
      next.mode = undefined;
      break;
    case 'AWAIT_Q2':
      next.q2 = undefined;
      break;
    case 'AWAIT_Q3':
      next.q3 = undefined;
      next.q7 = undefined;
      break;
    case 'AWAIT_Q7':
      next.q7 = undefined;
      next.capitalOk = undefined;
      next.capitalPercent = undefined;
      break;
    case 'AWAIT_Q5':
      next.q5 = undefined;
      break;
    case 'AWAIT_CAPITALS':
      next.capitalOk = undefined;
      next.capitalPercent = undefined;
      break;
    case 'AWAIT_FOREIGN_CTEF':
      next.foreignCtef = undefined;
      next.foreignCapital = undefined;
      break;
    case 'AWAIT_FOREIGN_CAPITAL':
      next.foreignCapital = undefined;
      break;
  }
  return next;
}

/** Lista ordenada de passos já preenchidos (para o botão Voltar). */
export function answeredSteps(answers: FinancingAnswers): QuizStepId[] {
  const out: QuizStepId[] = [];
  if (answers.residencePt) out.push('AWAIT_RESIDENCE');
  if (answers.mode) out.push('AWAIT_MARITAL');
  if (answers.residencePt === 'SIM') {
    if (answers.q2) out.push('AWAIT_Q2');
    if (answers.q3) out.push('AWAIT_Q3');
    if (answers.q7) out.push('AWAIT_Q7');
    if (answers.q5) out.push('AWAIT_Q5');
    if (answers.capitalOk) out.push('AWAIT_CAPITALS');
  } else if (answers.residencePt === 'NAO') {
    if (answers.foreignCtef) out.push('AWAIT_FOREIGN_CTEF');
    if (answers.foreignCapital) out.push('AWAIT_FOREIGN_CAPITAL');
  }
  return out;
}

/** Estimativa de progresso (0..1) — usado na barra superior. */
export function estimateProgress(answers: FinancingAnswers): number {
  const isForeign = answers.residencePt === 'NAO';
  const total = isForeign ? 4 : 6;
  return Math.min(answeredSteps(answers).length / total, 1);
}
