import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { cents, present } from './accounts.service.js';

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe o mês em AAAA-MM').refine(value => Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 9998, 'Ano inválido');
export function monthRange(month: string) {
  const valid = monthSchema.parse(month);
  const [year, number] = valid.split('-').map(Number) as [number, number];
  return { start: new Date(Date.UTC(year, number - 1, 1)), end: new Date(Date.UTC(year, number, 1)) };
}
export async function monthlyReport(usuarioId: string, month: string) {
  const { start, end } = monthRange(month);
  // A single snapshot keeps balances and payments coherent during concurrent writes.
  return prisma.$transaction(async tx => {
    const user = await tx.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: { nome: true, email: true } });
    const rows = await tx.conta.findMany({ where: { usuarioId, vencimento: { gte: start, lt: end } }, include: { pagamentos: true }, orderBy: [{ vencimento: 'asc' }, { id: 'asc' }] });
    const payments = await tx.pagamento.findMany({ where: { conta: { usuarioId }, pagoEm: { gte: start, lt: end } }, include: { conta: { select: { id: true, descricao: true, categoria: true } } }, orderBy: [{ pagoEm: 'asc' }, { id: 'asc' }] });
    const accounts = rows.map(present);
    const groups = new Map<string, { categoria: string; previsto: number; principalPago: number; encargos: number; saldoPendente: number }>();
    const group = (categoria: string) => {
      if (!groups.has(categoria)) groups.set(categoria, { categoria, previsto: 0, principalPago: 0, encargos: 0, saldoPendente: 0 });
      return groups.get(categoria)!;
    };
    let expected = 0, balance = 0, principal = 0, charges = 0;
    for (const account of accounts) {
      expected += cents(account.valor); balance += cents(account.saldo);
      const entry = group(account.categoria); entry.previsto += cents(account.valor); entry.saldoPendente += cents(account.saldo);
    }
    for (const payment of payments) {
      principal += cents(payment.valor); charges += cents(payment.encargos);
      const entry = group(payment.conta.categoria); entry.principalPago += cents(payment.valor); entry.encargos += cents(payment.encargos);
    }
    return { mes: month, geradoEm: new Date().toISOString(), usuario: user,
      totais: { previsto: expected / 100, saldoPendente: balance / 100, principalPago: principal / 100, encargos: charges / 100, totalPago: (principal + charges) / 100 },
      contas: accounts, pagamentos: payments,
      categorias: [...groups.values()].map(row => ({ categoria: row.categoria, previsto: row.previsto / 100, principalPago: row.principalPago / 100, encargos: row.encargos / 100, saldoPendente: row.saldoPendente / 100 })) };
  }, { isolationLevel: 'RepeatableRead' });
}
