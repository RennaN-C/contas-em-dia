import { Prisma } from '@prisma/client';
import { listAccounts } from '../accounts/accounts.service.js';
import { getAnnualSelic } from '../../integrations/brasil-api/rate.service.js';
import { DAY_MS, utcDay, businessDay } from './dates.js';

export const INTEREST_NOTICE = 'Estimativa demonstrativa com Selic anual atual, juros simples e base de 365 dias. Não é cobrança contratual.';
export function estimateInterest(saldo: number, vencimento: Date, taxaAnual: number, now = businessDay()) {
  const dias = Math.max(0, Math.round((utcDay(now).getTime() - utcDay(vencimento).getTime()) / DAY_MS));
  const principal = new Prisma.Decimal(Math.max(0, saldo));
  const juros = dias && principal.gt(0) ? principal.mul(taxaAnual).mul(dias).div(36500).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);
  return { dias, taxaAnual, saldo: principal.toFixed(2), juros: juros.toFixed(2), valorEstimado: principal.plus(juros).toFixed(2) };
}
export async function listInterestEstimates(usuarioId: string, now = businessDay()) {
  const accounts = (await listAccounts(usuarioId)).filter(c => c.saldo > 0 && utcDay(c.vencimento) < utcDay(now));
  const selic = accounts.length ? await getAnnualSelic() : null;
  return { aviso: INTEREST_NOTICE, estimates: accounts.map(c => ({ conta: { id: c.id, descricao: c.descricao, vencimento: c.vencimento }, ...(selic?.status === 'disponivel' ? { ...selic, ...estimateInterest(c.saldo, c.vencimento, selic.taxaAnual, now) } : { status: 'indisponivel' as const, dias: Math.round((utcDay(now).getTime() - utcDay(c.vencimento).getTime()) / DAY_MS), saldo: c.saldo.toFixed(2) }) })) };
}
