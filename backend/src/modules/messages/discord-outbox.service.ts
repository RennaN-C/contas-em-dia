import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { discordConfig } from '../../integrations/discord/config.js';

type InternalMessage = { usuarioId: string; contaId?: string; chave: string; titulo: string; conteudo: string; discordConteudo?: string };
export async function enqueueDiscord(tx: Prisma.TransactionClient, message: InternalMessage) {
  if (!discordConfig().enabled) return;
  const channel = await tx.canalUsuario.findUnique({ where: { usuarioId: message.usuarioId } });
  if (!channel?.ativo) return;
  await tx.mensagem.createMany({ data: {
    id: randomUUID(), usuarioId: message.usuarioId, contaId: message.contaId,
    chave: `discord:${message.chave}`, tipo: 'DISCORD', titulo: message.titulo,
    conteudo: message.discordConteudo ?? `Saldo+ — ${message.titulo}\n${message.conteudo}\nAcompanhe suas despesas pelo Saldo+.`,
    plataforma: 'DISCORD', direcao: 'saida', estado: 'enfileirada', canalId: channel.id
  }, skipDuplicates: true });
}
