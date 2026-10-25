import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { accountStatus, cents } from '../accounts/accounts.service.js';
import { persistMessage } from '../messages/messages.service.js';
import { transaction } from '../../jobs/transaction.js';
import { addDays, utcDay } from './dates.js';

export const ALERT_RULES = [{ days: 3, tipo: 'TRES_DIAS' }, { days: 1, tipo: 'VESPERA' }, { days: 0, tipo: 'VENCIMENTO' }] as const;

export async function processNotifications(now = new Date()) {
  const day = utcDay(now);
  const candidates = await prisma.conta.findMany({ where: { OR: ALERT_RULES.map(r => ({ vencimento: { gte: addDays(day, r.days), lt: addDays(day, r.days + 1) } })) }, select: { id: true }, orderBy: { id: 'asc' } });
  const failures: unknown[] = [];
  for (const candidate of candidates) {
    try {
      await transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM contas WHERE id = ${candidate.id} FOR UPDATE`;
        const c = await tx.conta.findUnique({ where: { id: candidate.id }, include: { pagamentos: true } });
        if (!c || accountStatus(c.valor, c.vencimento, c.pagamentos, day) === 'PAGA') return;
        const rule = ALERT_RULES.find(r => addDays(day, r.days).getTime() === utcDay(c.vencimento).getTime());
        if (!rule) return;
        await tx.aviso.createMany({ data: { id: randomUUID(), contaId: c.id, diasAntes: rule.days, tipo: rule.tipo, agendadoPara: day }, skipDuplicates: true });
        const aviso = await tx.aviso.findUniqueOrThrow({ where: { contaId_tipo_agendadoPara: { contaId: c.id, tipo: rule.tipo, agendadoPara: day } } });
        const balance = (cents(c.valor) - c.pagamentos.reduce((n, p) => n + cents(p.valor), 0)) / 100;
        await persistMessage(tx, { usuarioId: c.usuarioId, contaId: c.id, chave: `aviso:${aviso.id}`, tipo: 'AVISO', titulo: rule.days ? `Vencimento em ${rule.days} dia(s)` : 'Vencimento hoje', conteudo: `${c.descricao}: saldo de ${balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, vencimento ${c.vencimento.toISOString().slice(0, 10)}.` });
        if (!aviso.enviadoEm) await tx.aviso.update({ where: { id: aviso.id }, data: { enviadoEm: now } });
      });
    } catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, 'Falha ao processar avisos; reexecute o job');
}
export function listNotifications(usuarioId: string) {
  return prisma.aviso.findMany({ where: { conta: { usuarioId } }, include: { conta: { select: { id: true, descricao: true, vencimento: true } } }, orderBy: [{ agendadoPara: 'desc' }, { id: 'asc' }] });
}
