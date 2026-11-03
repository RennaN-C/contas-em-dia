import { expect,it } from 'vitest';
import { calendarDays,shiftMonth } from '../src/features/accounts/calendar';
import { filterAccounts } from '../src/features/accounts/accounts.report';
import type {Account} from '../src/features/accounts/accounts.api';
it('calendário contempla fevereiro bissexto e semana iniciada na segunda',()=>{
  const days=calendarDays('2024-02',1);
  expect(days[0].key).toBe('2024-01-29');expect(days.filter(day=>day.current)).toHaveLength(29);expect(days.find(day=>day.key==='2024-02-29')?.current).toBe(true);expect(days.length%7).toBe(0);
});
it('navegação entre anos preserva o mês civil',()=>{expect(shiftMonth('2026-12',1)).toBe('2027-01');expect(shiftMonth('2026-01',-1)).toBe('2025-12');});
it('filtro de categoria combina com busca, mês e tipo, incluindo legado como Outras',()=>{
  const rows=[{id:'a',descricao:'Água',vencimento:'2026-11-05',tipo:'AVULSA',categoria:'MORADIA'},{id:'b',descricao:'Água antiga',vencimento:'2026-11-05',tipo:'AVULSA'}] as Account[];
  expect(filterAccounts(rows,'agua','2026-11','AVULSA','MORADIA').map(row=>row.id)).toEqual(['a']);expect(filterAccounts(rows,'','','','OUTRAS').map(row=>row.id)).toEqual(['b']);
});
