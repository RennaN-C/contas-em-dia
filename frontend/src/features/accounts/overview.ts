import type { Account } from './accounts.api';
import type { Payment } from '../payments/Payments';

/** Presentation aggregates only; balances/statuses come from the authenticated API. */
export function financialOverview(accounts: Account[], payments: Payment[], today = new Date()) {
  const sum = (values: number[]) => values.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
  const pending = accounts.filter(c => c.saldo > 0);
  const overdue = pending.filter(c => c.status === 'ATRASADA');
  const paid = sum(payments.map(p => Number(p.valor)));
  const balance = sum(pending.map(c => c.saldo));
  const late = sum(overdue.map(c => c.saldo));
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + index, 1));
    const key = date.toISOString().slice(0, 7);
    return { key, label: date.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
      contas: sum(accounts.filter(c => c.vencimento.startsWith(key)).map(c => Number(c.valor))),
      pagamentos: sum(payments.filter(p => p.pagoEm.startsWith(key)).map(p => Number(p.valor))) };
  });
  return { balance, paid, late, pending, overdue, months, upcoming: [...pending].sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 5) };
}
