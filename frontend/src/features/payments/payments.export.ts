import type { Payment } from './Payments';
import { csvCell } from '../../services/csv';
export function buildPaymentCsv(rows: Payment[]) {
  return '\uFEFF' + ['Conta;Valor;Data;Encargos;Total pago', ...rows.map(p => [p.conta.descricao, Number(p.valor).toFixed(2), p.pagoEm.slice(0, 10),Number(p.encargos??0).toFixed(2),((Math.round(Number(p.valor)*100)+Math.round(Number(p.encargos??0)*100))/100).toFixed(2)].map(csvCell).join(';'))].join('\r\n');
}
