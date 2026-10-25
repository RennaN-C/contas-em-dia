import type { Payment } from './Payments';
export function buildPaymentCsv(rows: Payment[]) {
  const cell = (value: string) => `"${(/^[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  return '\uFEFF' + ['Conta;Valor;Data', ...rows.map(p => [p.conta.descricao, Number(p.valor).toFixed(2), p.pagoEm.slice(0, 10)].map(cell).join(';'))].join('\r\n');
}
