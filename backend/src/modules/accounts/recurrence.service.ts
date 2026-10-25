import type { Conta, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { transaction } from '../../jobs/transaction.js';
import { AccountError, nextDue } from './accounts.service.js';
import { businessDay } from '../notifications/dates.js';

/** Same Conta chain and unique origemId as payments. Forecast is independent of payment. */
export async function extendRecurrence(tx: Prisma.TransactionClient, initial: Conta, now = businessDay()) {
  const horizon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0));
  let current = initial, created = 0;
  const visited = new Set<string>();
  for (let i = 0; i < 120; i++) {
    if(visited.has(current.id)) throw new AccountError('Série recorrente inválida');
    visited.add(current.id);
    if (current.tipo !== 'RECORRENTE' || !current.recorrenciaAtiva) break;
    const due = nextDue(current.vencimento, current.diaRecorrencia ?? current.vencimento.getUTCDate());
    if (due > horizon) break;
    const existing = await tx.conta.findUnique({ where: { origemId: current.id } });
    if (existing) { current = existing; i--; continue; }
    current = await tx.conta.upsert({ where: { origemId: current.id }, update: {}, create: { origemId: current.id, usuarioId: current.usuarioId, descricao: current.descricao, valor: current.valor, vencimento: due, tipo: 'RECORRENTE', recorrencia: 'MENSAL', recorrenciaAtiva: true, diaRecorrencia: current.diaRecorrencia ?? current.vencimento.getUTCDate() } });
    created++;
  }
  return created;
}
export async function materializeRecurrences(now = businessDay(), usuarioId?: string) {
  const roots = await prisma.conta.findMany({ where: { tipo: 'RECORRENTE', origemId: null, recorrenciaAtiva: true, ...(usuarioId ? { usuarioId } : {}) }, orderBy: { id: 'asc' } });
  let created = 0;
  for (const root of roots) created += await transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM contas WHERE id = ${root.id} FOR UPDATE`;
    const current = await tx.conta.findUnique({ where: { id: root.id } });
    return current ? extendRecurrence(tx, current, now) : 0;
  });
  return { created };
}
export async function setRecurrenceActive(usuarioId: string, id: string, ativa: boolean) {
  return transaction(async tx => {
    const roots = await tx.$queryRaw<{ id: string }[]>`WITH RECURSIVE parents AS (
      SELECT id, origem_id FROM contas WHERE id = ${id} AND usuario_id = ${usuarioId}
      UNION ALL SELECT c.id, c.origem_id FROM contas c JOIN parents p ON c.id = p.origem_id WHERE c.usuario_id = ${usuarioId}
    ) SELECT id FROM parents WHERE origem_id IS NULL`;
    if (!roots[0]) throw new AccountError('Conta não encontrada', 404);
    const rootId = roots[0].id;
    await tx.$queryRaw`SELECT id FROM contas WHERE id = ${rootId} FOR UPDATE`;
    const root = await tx.conta.findUnique({ where: { id: rootId } });
    if (!root || root.tipo !== 'RECORRENTE') throw new AccountError('Conta não é recorrente', 400);
    await tx.$executeRaw`WITH RECURSIVE series AS (
      SELECT id FROM contas WHERE id = ${rootId} AND usuario_id = ${usuarioId}
      UNION ALL SELECT c.id FROM contas c JOIN series s ON c.origem_id = s.id WHERE c.usuario_id = ${usuarioId}
    ) UPDATE contas SET recorrencia_ativa = ${ativa}, atualizado_em = NOW() WHERE id IN (SELECT id FROM series)`;
    return { ativa };
  });
}
