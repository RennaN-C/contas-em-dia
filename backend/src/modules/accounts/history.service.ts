import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getAccount } from './accounts.service.js';

export function accountSnapshot(account: { descricao: string; valor: unknown; vencimento: Date; tipo: string; categoria?: string; recorrenciaAtiva?: boolean }) {
  return { descricao: account.descricao, valor: String(account.valor), vencimento: account.vencimento.toISOString().slice(0, 10),
    tipo: account.tipo, categoria: account.categoria ?? 'OUTRAS', ...(account.tipo === 'RECORRENTE' ? { recorrenciaAtiva: account.recorrenciaAtiva ?? true } : {}) };
}
export function recordAccountHistory(tx: Prisma.TransactionClient, account: { id: string; usuarioId: string; descricao: string }, acao: string, detalhes: Prisma.InputJsonObject) {
  const chave = ['CONTA_CRIADA','RECORRENCIA_GERADA'].includes(acao) ? `criacao:${account.id}` : undefined;
  return tx.historicoConta.createMany({ data: { chave, usuarioId: account.usuarioId, contaId: account.id, descricao: account.descricao, acao, detalhes }, skipDuplicates: true });
}
export async function listAccountHistory(usuarioId: string, contaId?: string) {
  if (contaId) await getAccount(usuarioId, contaId);
  return prisma.historicoConta.findMany({ where: { usuarioId, ...(contaId ? { contaId } : {}) }, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }] });
}
