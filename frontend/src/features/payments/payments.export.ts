import type { Payment } from './Payments';
export function buildPaymentCsv(rows: Payment[]) {
  const cell = (value: string) => `"${(/^[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  return '\uFEFF' + ['Conta;Valor;Data;Encargos;Total pago', ...rows.map(p => [p.conta.descricao, Number(p.valor).toFixed(2), p.pagoEm.slice(0, 10),Number(p.encargos??0).toFixed(2),((Math.round(Number(p.valor)*100)+Math.round(Number(p.encargos??0)*100))/100).toFixed(2)].map(cell).join(';'))].join('\r\n');
}
