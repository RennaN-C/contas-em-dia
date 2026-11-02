import { expect, it } from 'vitest';
import { buildAccountCsv, filterAccounts, summarizeAccounts } from '../src/features/accounts/accounts.report';
import type { Account } from '../src/features/accounts/accounts.api';
import { csvCell } from '../src/services/csv';

const rows: Account[] = [
  { id: 'a', descricao: 'Água', valor: '100.10', saldo: 60.10, vencimento: '2026-11-02T00:00:00Z', tipo: 'AVULSA', recorrencia: null, status: 'ATRASADA' },
  { id: 'b', descricao: 'Internet', valor: '50.20', saldo: 50.20, vencimento: '2026-11-30', tipo: 'RECORRENTE', recorrencia: 'MENSAL', status: 'PENDENTE' },
  { id: 'c', descricao: 'Água dezembro', valor: '30.10', saldo: 0, vencimento: '2026-12-01', tipo: 'AVULSA', recorrencia: null, status: 'PAGA' }
];
it('combina busca sem acentos, mês civil e tipo', () => {
  expect(filterAccounts(rows, ' AGUA ', '2026-11', 'AVULSA')).toEqual([rows[0]]);
  expect(filterAccounts(rows, '', '2026-11', 'RECORRENTE')).toEqual([rows[1]]);
  expect(filterAccounts(rows, 'inexistente', '', '')).toEqual([]);
});
it('resume pagamentos parciais, quitação e atraso em centavos', () => {
  expect(summarizeAccounts(rows)).toEqual({ count: 3, balance: 110.3, paid: 70.1, late: 60.1 });
  expect(summarizeAccounts([])).toEqual({ count: 0, balance: 0, paid: 0, late: 0 });
});
it('exporta data sem deslocamento, saldo e principal pago separados', () => {
  const csv = buildAccountCsv([rows[0]!]);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"Água";"100.10";"2026-11-02";"Avulsa";"Em atraso";"40.00";"60.10"');
  expect(csv).not.toContain('Internet');
});
it('neutraliza fórmulas, espaços antes de fórmulas e aspas no CSV', () => {
  expect(csvCell(' =HYPERLINK("x")')).toBe('"\' =HYPERLINK(""x"")"');
  expect(buildAccountCsv([{ ...rows[0]!, descricao: '+SUM(1)' }])).toContain('"\'+SUM(1)"');
  expect(csvCell('\ttexto')).toBe('"\'\ttexto"');
});
