import {expect,it} from 'vitest';
import {buildPaymentCsv} from '../src/features/payments/payments.export';
import {todayISO} from '../src/services/dates';
const payment={id:'p',valor:'40.00',pagoEm:'2026-10-25T00:00:00Z',conta:{id:'c',descricao:'Internet; casa "A"'}};
it('exporta CSV com BOM, valores reais e aspas escapadas',()=>{const csv=buildPaymentCsv([payment]);expect(csv.startsWith('\uFEFF')).toBe(true);expect(csv).toContain('"Internet; casa ""A""";"40.00";"2026-10-25"');});
it.each(['=HYPERLINK("evil")','+SUM(1)','-1+1','@SUM(1)','\t=1+1'])('neutraliza fórmula de planilha %s',descricao=>expect(buildPaymentCsv([{...payment,conta:{...payment.conta,descricao}}])).toContain(`"'${descricao.replaceAll('"','""')}"`));
it('CSV vazio tem somente cabeçalho',()=>expect(buildPaymentCsv([])).toBe('\uFEFFConta;Valor;Data'));
it('frontend usa a mesma data brasileira do backend',()=>{expect(todayISO(new Date('2026-10-26T02:59:00Z'))).toBe('2026-10-25');expect(todayISO(new Date('2026-10-26T03:00:00Z'))).toBe('2026-10-26');});
