/**
 * Automações WhatsApp disparadas pelo admin (`fromMe`).
 * Só documentação no UI — a lógica vive no backend/código.
 */

export type AdminFromMeAutomation = {
  name: string;
  trigger: string;
  action: string;
  notes?: string;
};

export const ADMIN_FROM_ME_AUTOMATIONS: AdminFromMeAutomation[] = [
  {
    name: 'Link para agendar chamada',
    trigger: 'link para agendar chamada',
    action:
      'Envia ao cliente o link para agendar ou alterar agendamento de chamada de video.',
    notes:
      '',
  },
];
