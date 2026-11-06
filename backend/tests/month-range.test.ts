import { expect,it } from 'vitest';
import { monthRange } from '../src/modules/accounts/reports.service.js';
it('intervalo de mês civil é exclusivo no início do próximo mês',()=>{
  expect(monthRange('2024-02')).toEqual({start:new Date('2024-02-01'),end:new Date('2024-03-01')});
  expect(monthRange('2026-12').end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
});
it('rejeita meses malformados e anos fora do intervalo suportado',()=>{
  for(const month of ['2026-00','2026-13','2026-1','0001-01','9999-12'])expect(()=>monthRange(month)).toThrow();
});
