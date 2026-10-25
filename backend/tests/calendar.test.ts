import {afterEach,expect,it,vi} from 'vitest';
import {businessDay} from '../src/modules/notifications/dates.js';
import {accountStatus} from '../src/modules/accounts/accounts.service.js';
import {paymentSchema} from '../src/modules/payments/payments.service.js';
afterEach(()=>vi.useRealTimers());
it.each([['2026-10-26T02:59:59Z','2026-10-25'],['2026-10-26T03:00:00Z','2026-10-26'],['2027-01-01T01:00:00Z','2026-12-31']])('calendário de Brasília em %s', (instant,day)=>expect(businessDay(new Date(instant)).toISOString().slice(0,10)).toBe(day));
it('às 23h59 de Brasília uma conta do mesmo dia ainda não está atrasada',()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T02:59:59Z'));expect(accountStatus(100,new Date('2026-10-25'),[])).toBe('PENDENTE');});
it('atraso inicia à meia-noite de Brasília',()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T03:00:00Z'));expect(accountStatus(100,new Date('2026-10-25'),[])).toBe('ATRASADA');});
it('pagamento não pode antecipar o dia brasileiro usando a data UTC',()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T01:00:00Z'));expect(paymentSchema.safeParse({valor:1,pagoEm:'2026-10-26',chave:'11111111-1111-4111-8111-111111111111'}).success).toBe(false);});
