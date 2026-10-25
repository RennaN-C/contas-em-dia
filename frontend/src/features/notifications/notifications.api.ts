import { api } from '../../services/api';
import type { AccountReference } from '../messages/messages.api';

export type Summary = { inicio: string; fimExclusivo: string; accounts: (AccountReference & { saldo: number })[]; total: number };
export type Estimate = { conta: AccountReference; dias: number; saldo: string } & ({ status: 'disponivel'; taxaAnual: number; juros: string; valorEstimado: string } | { status: 'indisponivel' });
export const notificationsApi = {
  summary: () => api<{ summary: Summary }>('/notifications/weekly-summary'),
  interest: () => api<{ aviso: string; estimates: Estimate[] }>('/notifications/interest-estimates')
};
