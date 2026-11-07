import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AccountError } from '../accounts/accounts.service.js';
import { hashCode } from '../../integrations/discord/crypto.js';
import { discordConfig } from '../../integrations/discord/config.js';

export async function connectionStatus(usuarioId: string) {
  const channel = await prisma.canalUsuario.findUnique({ where: { usuarioId } });
  const lastFailure = await prisma.mensagem.findFirst({ where: { usuarioId, plataforma: 'DISCORD', estado: 'falha', codigoErro: { notIn: ['REVOGADO', 'SEM_VINCULO'] } }, orderBy: { criadoEm: 'desc' }, select: { descricaoErro: true } });
  return { configured: discordConfig().enabled, ativo: channel?.ativo ?? false, pendente: !!channel?.codigoConvite && !!channel.expiraEm && channel.expiraEm > new Date(), expiraEm: channel?.expiraEm ?? null, erro: channel?.erro ?? lastFailure?.descricaoErro ?? null };
}
export async function invite(usuarioId: string) {
  if (!discordConfig().enabled) throw new AccountError('Discord não configurado', 503);
  const codigo = randomBytes(16).toString('hex'), expiraEm = new Date(Date.now() + 10 * 60_000);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM canais_usuario WHERE usuario_id = ${usuarioId} FOR UPDATE`;
    const channel = await tx.canalUsuario.findUnique({ where: { usuarioId } });
    if (channel?.ativo) throw new AccountError('Desconecte antes de gerar outro convite', 409);
    if (channel?.discordId) await revoke(usuarioId, tx);
    await tx.canalUsuario.upsert({ where: { usuarioId }, create: { usuarioId, codigoConvite: hashCode(codigo), expiraEm }, update: { codigoConvite: hashCode(codigo), expiraEm, erro: null } });
  });
  return { codigo, expiraEm };
}
export async function revoke(usuarioId: string, tx?: Prisma.TransactionClient): Promise<void> {
  if (!tx) { await prisma.$transaction(db => revoke(usuarioId, db)); return; }
  await tx.$queryRaw`SELECT id FROM canais_usuario WHERE usuario_id = ${usuarioId} FOR UPDATE`;
  await tx.canalUsuario.updateMany({ where: { usuarioId }, data: { ativo: false, discordId: null, codigoConvite: null, expiraEm: null, erro: null } });
  await tx.mensagem.updateMany({ where: { usuarioId, plataforma: 'DISCORD', estado: 'enfileirada' }, data: { estado: 'falha', codigoErro: 'REVOGADO', descricaoErro: 'Recebimento revogado' } });
}
export async function linkCode(tx: Prisma.TransactionClient, hash: string, discordId: string, now = new Date()) {
  // Locks both identities across workers; never transfers an existing Discord identity.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${discordId}))::text`;
  const existing = await tx.canalUsuario.findUnique({ where: { discordId } });
  if (existing) return 'Esta identidade Discord já possui vínculo. Desvincule primeiro.';
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM canais_usuario WHERE codigo_convite = ${hash} AND expira_em > ${now} AND ativo = false FOR UPDATE`;
  if (!rows[0]) return 'Código inválido, expirado ou já utilizado. Gere outro no Saldo+.';
  await tx.canalUsuario.update({ where: { id: rows[0].id }, data: { ativo: true, discordId, codigoConvite: null, expiraEm: null, vinculadoEm: now, erro: null } });
  return 'Discord conectado ao Saldo+! Você autorizou avisos pessoais por DM.';
}
