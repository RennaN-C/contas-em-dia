import type { Account } from './accounts.api';
import { csvCell } from '../../services/csv';
import { categoryLabel } from './categories';

export const accountStatusLabel = (status: string) =>
  ({ PAGA: 'Paga', PENDENTE: 'A vencer', ATRASADA: 'Em atraso' })[status] ?? status;

export function filterAccounts(rows: Account[], search: string, month: string, type: string, category='') {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const query = normalize(search);
  return rows.filter(account => normalize(account.descricao).includes(query)
    && (!month || account.vencimento.startsWith(month))
    && (!type || account.tipo === type)
    && (!category || (account.categoria??'OUTRAS')===category));
}

/** Totals reflect only API balances; estimated interest never changes the principal. */
export function summarizeAccounts(rows: Account[]) {
  let value = 0, balance = 0, late = 0;
  for (const row of rows) {
    value += Math.round(Number(row.valor) * 100);
    balance += Math.round(row.saldo * 100);
    if (row.status === 'ATRASADA') late += Math.round(row.saldo * 100);
  }
  return { count: rows.length, balance: balance / 100, late: late / 100, paid: (value - balance) / 100 };
}

export function buildAccountCsv(rows: Account[]) {
  return '\uFEFF' + ['Conta;Valor;Vencimento;Tipo;Status;Principal pago;Saldo principal;Categoria',
    ...rows.map(row => [row.descricao, Number(row.valor).toFixed(2), row.vencimento.slice(0, 10),
      row.tipo === 'RECORRENTE' ? 'Recorrente' : 'Avulsa', accountStatusLabel(row.status),
      ((Math.round(Number(row.valor) * 100) - Math.round(row.saldo * 100)) / 100).toFixed(2),
      row.saldo.toFixed(2), categoryLabel(row.categoria)].map(csvCell).join(';'))].join('\r\n');
}
