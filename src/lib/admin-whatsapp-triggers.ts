export type AdminWhatsappTrigger = {
  /** Nome curto do gatilho/flow. */
  name: string;
  /** Texto que o utilizador deve enviar (ou exemplo). */
  trigger: string;
  /** Onde é tratado hoje. */
  handledBy: "whatsapp-evolution-verify" | "backend" | "ambos";
  /** O que acontece quando dispara. */
  action: string;
  /** Observações importantes / limitações. */
  notes?: string;
};

export const ADMIN_WHATSAPP_TRIGGERS: AdminWhatsappTrigger[] = [
  {
    name: "Relocation (serviço)",
    trigger: 'Contém "mais sobre o serviço de relocation" ou "atendimento relocation"',
    handledBy: "ambos",
    action:
      "Cria lead na categoria relocation, atribui por prioridade/maxPendingLeads e envia lista ao parceiro.",
    notes: "Mensagens fromMe=true são ignoradas no receiver (anti-loop).",
  },
  {
    name: "Internet (serviço)",
    trigger: 'Contém "mais sobre o serviço de internet" ou "atendimento internet"',
    handledBy: "ambos",
    action:
      "Cria lead na categoria internet, atribui por prioridade/maxPendingLeads e envia lista ao parceiro.",
    notes: "Mensagens fromMe=true são ignoradas no receiver (anti-loop).",
  },
  {
    name: "Interesse em imóvel",
    trigger: 'Contém "tenho interesse no imovel 17" (ID numérico)',
    handledBy: "ambos",
    action:
      "Atribui o lead ao parceiro dono do anúncio (houseId), ignorando maxPendingLeads, e envia lista ao parceiro.",
  },
  {
    name: "Quiz financiamento (início)",
    trigger: 'Ex.: "Olá, quero saber se consigo financiar uma casa em Portugal" (e variações) ou "questionario"',
    handledBy: "whatsapp-evolution-verify",
    action:
      "Inicia o questionário, envia mensagens em sequência e pode sugerir link de grupo.",
  },
  {
    name: "Quiz financiamento (comando direto)",
    trigger: 'Mensagem começando com "QUESTIONARIO" (ex.: "QUESTIONARIO" / "questionario 1")',
    handledBy: "whatsapp-evolution-verify",
    action:
      "Atalho para entrar/continuar o questionário (receiver aceita qualquer texto que comece com questionario).",
  },
  {
    name: "Criar conta",
    trigger: 'Mensagem exata: "criar conta"',
    handledBy: "whatsapp-evolution-verify",
    action: "Cria/reutiliza lead na IA app e envia link de upload.",
  },
  {
    name: "Confirmação de cadastro por código",
    trigger:
      'Quando a mensagem contém "codigo" + um número de 6 dígitos (ou só 6 dígitos)',
    handledBy: "whatsapp-evolution-verify",
    action: "Confirma o cadastro no backend (auth/whatsapp/confirm).",
  },
];

