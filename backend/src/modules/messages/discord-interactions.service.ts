import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { linkCode, revoke } from './discord-link.service.js';
import { weeklySummary } from './messages.service.js';

const storedSchema = z.object({
  type: z.number(), data: z.object({ name: z.string().optional(), custom_id: z.string().optional(), options: z.array(z.object({ name: z.string(), value: z.string() })).optional() }),
  message: z.object({ id: z.string() }).optional()
});
type Reply = { content: string; components?: { type: number; components: { type: number; style: number; label: string; custom_id: string }[] }[]; allowed_mentions: { parse: string[] } };
export async function executeInteraction(tx: Prisma.TransactionClient, discordId: string, raw: unknown, now = new Date()): Promise<Reply> {
  const event = storedSchema.parse(raw);
  const reply = (content: string): Reply => ({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } });
  await tx.$queryRaw`SELECT id FROM canais_usuario WHERE chat_id = ${discordId} FOR UPDATE`;
  const channel = await tx.canalUsuario.findUnique({ where: { discordId } });
  if (event.type === 2 && event.data.name === 'vincular') {
    const code = event.data.options?.find(o => o.name === 'codigo')?.value;
    return reply(code && /^[a-f\d]{64}$/.test(code) ? await linkCode(tx, code, discordId, now) : 'Código inválido. Gere outro no Perfil do Saldo+.');
  }
  if (event.type === 2 && event.data.name === 'status') return reply(channel?.ativo ? 'Sua conta está vinculada ao Saldo+ e recebe avisos por DM.' : 'Sem vínculo ativo. Conecte pelo Perfil do Saldo+.');
  if (!channel?.ativo) return reply('Conecte sua conta no Perfil do Saldo+ antes de usar este comando.');
  if (event.type === 2 && event.data.name === 'proximas-contas') {
    const summary = await weeklySummary(channel.usuarioId, undefined, tx);
    const details = summary.accounts.slice(0, 10).map(c => `${c.descricao}: ${c.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, vence ${c.vencimento.toISOString().slice(0, 10)}`).join('\n');
    return reply(`Próximos 7 dias: ${summary.accounts.length} despesa(s).\n${details || 'Nenhuma conta a vencer.'}\nConsulte todas no Saldo+.`);
  }
  if (event.type === 2 && event.data.name === 'desvincular') return { ...reply('Deseja interromper os avisos e desvincular o Discord?'), components: [{ type: 1, components: [{ type: 2, style: 4, label: 'Sim, desvincular', custom_id: `desvincular:${channel.id}` }] }] };
  if (event.type === 3 && event.data.custom_id === `desvincular:${channel.id}`) {
    await revoke(channel.usuarioId, tx); return reply('Discord desvinculado. Você pode conectar novamente pelo Saldo+.');
  }
  if (event.type === 3 && event.data.custom_id?.startsWith('confirmar:')) {
    const messageId = event.data.custom_id.slice(10);
    if (!z.uuid().safeParse(messageId).success || !event.message) return reply('Confirmação inválida.');
    const updated = await tx.mensagem.updateMany({ where: { id: messageId, usuarioId: channel.usuarioId, canalId: channel.id, plataforma: 'DISCORD', direcao: 'saida', idExterno: event.message.id, estado: { in: ['enviada', 'respondida'] } }, data: { estado: 'respondida', respondidoEm: now } });
    return reply(updated.count ? 'Recebimento confirmado. Isso não registra pagamento.' : 'Mensagem não encontrada para sua conta.');
  }
  return reply('Comando ou botão não reconhecido.');
}
