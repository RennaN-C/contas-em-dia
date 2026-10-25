import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AccountError, cents } from '../accounts/accounts.service.js';
import { addDays, utcDay, weekStart } from '../notifications/dates.js';
import { transaction } from '../../jobs/transaction.js';

type MessageInput = { usuarioId: string; contaId?: string; chave: string; tipo: string; titulo: string; conteudo: string };
export async function persistMessage(tx: Prisma.TransactionClient, input: MessageInput) {
  return tx.mensagem.createMany({ data: { id: randomUUID(), ...input }, skipDuplicates: true });
}
const accountReference = { conta: { select: { id: true, descricao: true, vencimento: true } } };
export function listMessages(usuarioId: string) {
  return prisma.mensagem.findMany({ where: { usuarioId }, include: accountReference, orderBy: [{ criadoEm: 'desc' }, { id: 'asc' }] });
}
export async function markRead(usuarioId: string, id: string) {
  const result = await prisma.mensagem.updateMany({ where: { id, usuarioId }, data: { lida: true } });
  if (!result.count) throw new AccountError('Mensagem não encontrada', 404);
  return prisma.mensagem.findFirstOrThrow({ where: { id, usuarioId }, include: accountReference });
}

export async function weeklySummary(usuarioId: string, now = new Date(), db: Prisma.TransactionClient = prisma) {
  const start = utcDay(now), end = addDays(start, 7);
  const rows = await db.conta.findMany({ where: { usuarioId, vencimento: { gte: start, lt: end } }, include: { pagamentos: true }, orderBy: [{ vencimento: 'asc' }, { id: 'asc' }] });
  const accounts = rows.map(c => ({ id: c.id, descricao: c.descricao, vencimento: c.vencimento, saldo: Math.max(0, cents(c.valor) - c.pagamentos.reduce((n, p) => n + cents(p.valor), 0)) / 100 })).filter(c => c.saldo > 0);
  return { inicio: start, fimExclusivo: end, accounts, total: accounts.reduce((n, c) => n + cents(c.saldo), 0) / 100 };
}

export async function processWeeklySummaries(now = new Date()) {
  const users = await prisma.usuario.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
  const failures: unknown[] = [];
  for (const user of users) {
    try {
      await transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${user.id} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM contas WHERE usuario_id = ${user.id} ORDER BY id FOR UPDATE`;
        const summary = await weeklySummary(user.id, now, tx);
        const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const detail = summary.accounts.map(c => `${c.descricao}: ${money(c.saldo)}, vencimento ${c.vencimento.toISOString().slice(0, 10)}`).join('\n');
        await persistMessage(tx, { usuarioId: user.id, chave: `semana:${user.id}:${weekStart(now).toISOString().slice(0, 10)}`, tipo: 'RESUMO_SEMANAL', titulo: 'Resumo semanal', conteudo: `Próximos 7 dias (${summary.inicio.toISOString().slice(0, 10)} a ${addDays(summary.inicio, 6).toISOString().slice(0, 10)}): ${summary.accounts.length} conta(s). Saldo total: ${money(summary.total)}.\n${detail || 'Nenhuma conta a vencer.'}` });
      });
    } catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, 'Falha ao gerar resumos semanais; reexecute o job');
}
