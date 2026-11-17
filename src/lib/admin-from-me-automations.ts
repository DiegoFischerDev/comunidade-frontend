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
  {
    name: 'Primeiro contacto do dia',
    trigger: 'Primeira mensagem do dia (DM)',
    action:
      'Dá bom dia e pergunta se quer fazer o relocation com o Rafa (1 sim / 2 não). Se responder 1, entra na coluna «Sem data para imigrar».',
    notes: 'Instância comunidade MEO. A lista dos números do dia aparece nesta página.',
  },
];
