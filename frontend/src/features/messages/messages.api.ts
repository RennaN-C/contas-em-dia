import { api } from '../../services/api';

export type AccountReference = { id: string; descricao: string; vencimento: string };
export type Message = { id: string; titulo: string; conteudo: string; tipo: string; lida: boolean; criadoEm: string; conta: AccountReference | null };
export const messagesApi = {
  list: () => api<{ messages: Message[] }>('/messages'),
  read: (id: string) => api<{ message: Message }>(`/messages/${id}/read`, { method: 'PATCH' })
};
