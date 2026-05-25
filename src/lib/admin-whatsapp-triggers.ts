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

export const ADMIN_WHATSAPP_TRIGGERS: AdminWhatsappTrigger[] = [];
