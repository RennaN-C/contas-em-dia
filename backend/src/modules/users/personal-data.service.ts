import { prisma } from '../../lib/prisma.js';
import { cents, accountStatus } from '../accounts/accounts.service.js';

export async function personalSummary(usuarioId: string) {
  const [accounts, payments, unread] = await Promise.all([
    prisma.conta.findMany({ where: { usuarioId }, include: { pagamentos: true } }),
    prisma.pagamento.findMany({ where: { conta: { usuarioId } } }),
    prisma.mensagem.count({ where: { usuarioId, lida: false, plataforma: 'INTERNA' } })
  ]);
  const balance = accounts.reduce((sum, row) => sum + cents(row.valor) - row.pagamentos.reduce((paid, p) => paid + cents(p.valor), 0), 0);
  return { contas: accounts.length, quitadas: accounts.filter(row => accountStatus(row.valor, row.vencimento, row.pagamentos) === 'PAGA').length,
    atrasadas: accounts.filter(row => accountStatus(row.valor, row.vencimento, row.pagamentos) === 'ATRASADA').length,
    saldoPendente: balance / 100, pagamentos: payments.length,
    totalPago: payments.reduce((sum, row) => sum + cents(row.valor) + cents(row.encargos), 0) / 100, mensagensNaoLidas: unread };
}
export function exportPersonalData(usuarioId: string) {
  return prisma.$transaction(async tx => ({
    formato: 'saldo-plus-dados-v1', exportadoEm: new Date().toISOString(),
    usuario: await tx.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: { id: true, nome: true, email: true, criadoEm: true, atualizadoEm: true } }),
    preferencias: await tx.preferenciaUsuario.findUnique({ where: { usuarioId } }),
    contas: await tx.conta.findMany({ where: { usuarioId }, include: { pagamentos: true }, orderBy: { vencimento: 'asc' } }),
    mensagens: await tx.mensagem.findMany({ where: { usuarioId }, orderBy: { criadoEm: 'asc' } }),
    avisos: await tx.aviso.findMany({ where: { conta: { usuarioId } }, orderBy: { agendadoPara: 'asc' } }),
    historico: await tx.historicoConta.findMany({ where: { usuarioId }, orderBy: { criadoEm: 'asc' } })
  }), { isolationLevel: 'RepeatableRead' });
}
