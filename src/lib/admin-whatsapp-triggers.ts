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
    name: "Quiz financiamento (início)",
    trigger:
      'Ex.: "Olá, quero saber se consigo financiar uma casa em Portugal" (e variações) ou "questionario". Aceita a mesma frase seguida de espaço/URL (pré-visualização do WhatsApp).',
    handledBy: "whatsapp-evolution-verify",
    action:
      "Inicia o questionário, envia mensagens em sequência e pode sugerir link de grupo.",
  },
  {
    name: "Quiz financiamento (comando direto)",
    trigger:
      'Mensagem começando com "QUESTIONARIO" (ex.: "QUESTIONARIO" / "questionario 1")',
    handledBy: "whatsapp-evolution-verify",
    action:
      "Atalho para entrar/continuar o questionário (receiver aceita qualquer texto que comece com questionario).",
  },
];
