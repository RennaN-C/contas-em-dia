import { expect, it,vi } from 'vitest';
import { financialOverview } from '../src/features/accounts/overview';
import type { Account } from '../src/features/accounts/accounts.api';
const account: Account = { id: '1', descricao: 'Conta', valor: '100.00', saldo: 60, status: 'ATRASADA', vencimento: '2026-10-01', tipo: 'AVULSA', recorrencia: null };
const payment = { id: 'p', valor: '40.00', pagoEm: '2026-10-05', conta: { id: '1', descricao: 'Conta' } };
const now = new Date('2026-10-25');
it('mês atual do gráfico muda somente à meia-noite de Brasília',()=>{
  vi.useFakeTimers();try{vi.setSystemTime(new Date('2027-01-01T02:59:00Z'));expect(financialOverview([],[]).months.at(-1)!.key).toBe('2026-12');}finally{vi.useRealTimers();}
});
it('agrega saldos e pagamentos sem cobrar sobre valores pagos', () => {
  const view = financialOverview([account], [payment], now);
  expect(view.balance).toBe(60); expect(view.paid).toBe(40); expect(view.late).toBe(60);
});
it('inclui encargos efetivamente pagos nos indicadores e no gráfico mensal',()=>{
 const view=financialOverview([account],[{...payment,encargos:'.90'}],now);expect(view.paid).toBe(40.9);expect(view.balance).toBe(60);expect(view.months.at(-1)!.pagamentos).toBe(40.9);
});
it('usa status da API e exclui quitadas das pendências', () => {
  const view = financialOverview([{ ...account, saldo: 0, status: 'PAGA' }, { ...account, id: '2', status: 'PENDENTE' }], [payment], now);
  expect(view.pending).toHaveLength(1); expect(view.overdue).toHaveLength(0); expect(view.late).toBe(0);
});
it('agrupa pagamentos pela data paga, contas pelo vencimento', () => {
  const view = financialOverview([account], [{ ...payment, pagoEm: '2026-09-05' }], now);
  expect(view.months.find(m => m.key === '2026-09')).toMatchObject({ contas: 0, pagamentos: 40 });
  expect(view.months.find(m => m.key === '2026-10')).toMatchObject({ contas: 100, pagamentos: 0 });
});
it('atravessa a virada de ano com seis meses UTC', () => {
  expect(financialOverview([], [], new Date('2027-01-01')).months.map(m => m.key)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
});
it('ordena as próximas contas sem alterar a resposta da API', () => {
  const rows = [{ ...account, id: 'later', vencimento: '2026-12-01' }, account];
  expect(financialOverview(rows, [], now).upcoming.map(c => c.id)).toEqual(['1', 'later']); expect(rows[0]!.id).toBe('later');
});
it('soma centavos sem erro de ponto flutuante', () => {
  expect(financialOverview([{ ...account, saldo: .1 }, { ...account, saldo: .2 }], [], now).balance).toBe(.3);
});
it('dados vazios produzem valores zero e histórico vazio', () => {
  const view = financialOverview([], [], now); expect(view.balance).toBe(0); expect(view.paid).toBe(0); expect(view.upcoming).toEqual([]); expect(view.months.every(m => m.contas === 0 && m.pagamentos === 0)).toBe(true);
});
