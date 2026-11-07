import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { discordConfig } from '../integrations/discord/config.js';
import { discordClient, DiscordError } from '../integrations/discord/client.js';
import { unseal } from '../integrations/discord/crypto.js';
import { executeInteraction } from '../modules/messages/discord-interactions.service.js';
import { jobRuns } from '../lib/metrics.js';

const MAX_ATTEMPTS = 5;
export const retryDelay = (attempt: number, retryAfter = 0) => Math.max(1000, 2000 * 2 ** Math.min(attempt, 8), retryAfter * 1000);
const asJson = (value: unknown) => value as Prisma.InputJsonValue;
async function databaseNow() {
  const rows = await prisma.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return rows[0]!.now;
}
async function apiAvailable(now: Date) {
  const pause = await prisma.controleDiscord.findUnique({ where: { chave: 'api' } });
  return !pause || pause.pausadoAte <= now;
}
async function pauseApi(db: Prisma.TransactionClient, now: Date, milliseconds: number) {
  const until = new Date(now.getTime() + milliseconds);
  await db.controleDiscord.upsert({ where: { chave: 'api' }, create: { chave: 'api', pausadoAte: until }, update: {} });
  await db.controleDiscord.updateMany({ where: { chave: 'api', pausadoAte: { lt: until } }, data: { pausadoAte: until } });
}

export async function processDiscordInteraction(now?: Date) {
  const clock = now ?? await databaseNow();
  if (!await apiAvailable(clock)) return false;
  return prisma.$transaction(async tx => {
    const now = clock;
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM interacoes_discord WHERE concluido = false AND proxima_tentativa <= ${now} ORDER BY criado_em FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!rows[0]) return false;
    let event = await tx.interacaoDiscord.findUniqueOrThrow({ where: { id: rows[0].id } });
    if (event.criadoEm.getTime() < now.getTime() - 14 * 60_000 || !event.segredo) {
      await tx.mensagem.updateMany({ where: { interacaoId: event.id }, data: { estado: 'falha', codigoErro: 'EXPIRADA', descricaoErro: 'Prazo para resposta Discord expirado' } });
      await tx.interacaoDiscord.update({ where: { id: event.id }, data: { concluido: true, segredo: null } }); return true;
    }
    if (!event.processado) {
      const channel = await tx.canalUsuario.findUnique({ where: { discordId: event.discordId } });
      const reply = await executeInteraction(tx, event.discordId, event.payload, now);
      const owner = channel ?? await tx.canalUsuario.findUnique({ where: { discordId: event.discordId } });
      await tx.mensagem.updateMany({ where: { interacaoId: event.id }, data: { usuarioId: owner?.usuarioId ?? null, canalId: owner?.id ?? null, estado: 'enviada' } });
      await tx.mensagem.upsert({ where: { chave: `resposta:${event.id}` }, create: {
        chave: `resposta:${event.id}`, usuarioId: owner?.usuarioId, canalId: owner?.id, plataforma: 'DISCORD', direcao: 'saida', estado: 'enfileirada', tipo: 'DISCORD_RESPOSTA', titulo: 'Resposta Discord', conteudo: JSON.stringify(reply)
      }, update: {} });
      event = await tx.interacaoDiscord.update({ where: { id: event.id }, data: { processado: true, resposta: asJson(reply) } });
    }
    // PATCH of the same original response is idempotent even after uncertain delivery.
    try {
      const result = await discordClient.editResponse(unseal(event.segredo!), event.resposta);
      const body = z.object({ id: z.string().regex(/^\d{17,20}$/) }).parse(result.json);
      await tx.mensagem.updateMany({ where: { chave: `resposta:${event.id}` }, data: { estado: 'enviada', idExterno: body.id, enviadoEm: now, codigoErro: null, descricaoErro: null } });
      await tx.mensagem.updateMany({ where: { interacaoId: event.id }, data: { estado: 'respondida', respondidoEm: now } });
      await tx.interacaoDiscord.update({ where: { id: event.id }, data: { concluido: true, segredo: null } });
    } catch (error) {
      const e = error instanceof DiscordError ? error : new DiscordError(503);
      const terminal = event.tentativas + 1 >= MAX_ATTEMPTS || (e.status >= 400 && e.status < 500 && e.status !== 429);
      if (e.status === 429) await pauseApi(tx, now, retryDelay(event.tentativas, e.retryAfter));
      await tx.mensagem.updateMany({ where: { chave: `resposta:${event.id}` }, data: { estado: terminal ? 'falha' : 'enfileirada', codigoErro: String(e.status), descricaoErro: `Falha na resposta Discord (HTTP ${e.status})`, tentativas: { increment: 1 } } });
      await tx.interacaoDiscord.update({ where: { id: event.id }, data: { tentativas: { increment: 1 }, concluido: terminal, ...(terminal ? { segredo: null } : {}), proximaTentativa: new Date(now.getTime() + retryDelay(event.tentativas, e.retryAfter)) } });
    }
    return true;
  }, { maxWait: 10_000, timeout: 20_000 });
}

async function claimMessage(now: Date) {
  return prisma.$transaction(async tx => {
    await tx.controleDiscord.upsert({ where: { chave: 'envios' }, create: { chave: 'envios', pausadoAte: new Date(0) }, update: {} });
    const lock = await tx.$queryRaw<{ chave: string }[]>`SELECT chave FROM controle_discord WHERE chave = 'envios' AND pausado_ate <= ${now} FOR UPDATE SKIP LOCKED`;
    if (!lock.length) return null;
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM mensagens WHERE plataforma = 'DISCORD' AND tipo = 'DISCORD' AND status = 'enfileirada' AND proxima_tentativa <= ${now} ORDER BY criado_em FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!rows[0]) return null;
    const message = await tx.mensagem.findUniqueOrThrow({ where: { id: rows[0].id } });
    if (message.codigoErro === 'EM_ENVIO') {
      // A previous process died after reserving. Do not risk a second financial DM.
      await tx.mensagem.update({ where: { id: message.id }, data: { estado: 'falha', codigoErro: 'RESULTADO_INCERTO', descricaoErro: 'Envio interrompido; conferir no Discord antes de qualquer reenvio manual' } }); return null;
    }
    await tx.controleDiscord.update({ where: { chave: 'envios' }, data: { pausadoAte: new Date(now.getTime() + 15_000) } });
    return tx.mensagem.update({ where: { id: message.id }, data: { codigoErro: 'EM_ENVIO', tentativas: { increment: 1 }, proximaTentativa: new Date(now.getTime() + 60_000) } });
  });
}

export async function processDiscordOutbox(date?: Date) {
  const now = date ?? await databaseNow();
  if (!await apiAvailable(now)) return false;
  const message = await claimMessage(now);
  if (!message) return false;
  await prisma.$transaction(async tx => {
    // Revoke and sending serialize on the channel row. Never fall back to a public channel.
    await tx.$queryRaw`SELECT id FROM canais_usuario WHERE id = ${message.canalId} FOR UPDATE`;
    const channel = message.canalId ? await tx.canalUsuario.findUnique({ where: { id: message.canalId } }) : null;
    const current = await tx.mensagem.findUniqueOrThrow({ where: { id: message.id } });
    if (!channel?.ativo || !channel.discordId || current.estado !== 'enfileirada') {
      await tx.mensagem.update({ where: { id: message.id }, data: { estado: 'falha', codigoErro: 'SEM_VINCULO', descricaoErro: 'Vínculo inativo' } }); return;
    }
    let wait: number;
    try {
      const result = await discordClient.sendDM(channel.discordId, message.id, message.conteudo);
      wait = result.wait * 1000;
      await tx.mensagem.update({ where: { id: message.id }, data: { estado: 'enviada', idExterno: result.id, enviadoEm: now, codigoErro: null, descricaoErro: null } });
    } catch (error) {
      const e = error instanceof DiscordError ? error : new DiscordError(503, 0, true);
      const retry = !e.uncertain && message.tentativas < MAX_ATTEMPTS && (e.status === 429 || e.status >= 500);
      wait = retryDelay(message.tentativas, e.retryAfter);
      await tx.mensagem.update({ where: { id: message.id }, data: {
        estado: retry ? 'enfileirada' : 'falha', codigoErro: e.uncertain ? 'RESULTADO_INCERTO' : String(e.status),
        descricaoErro: e.uncertain ? 'Resposta de envio incerta; conferir no Discord' : e.status === 403 ? 'DM bloqueada ou indisponível; reconecte após permitir mensagens diretas' : `Discord indisponível (HTTP ${e.status})`,
        proximaTentativa: new Date(now.getTime() + wait)
      } });
      if (e.status === 403) await tx.canalUsuario.update({ where: { id: channel.id }, data: { ativo: false, erro: 'DM bloqueada ou indisponível. Permita DMs no Discord e conecte novamente.' } });
      if (e.status === 401) wait = Math.max(wait, 15 * 60_000);
      if (e.status === 429 || e.status === 401) await pauseApi(tx, now, wait);
    }
    await tx.controleDiscord.update({ where: { chave: 'envios' }, data: { pausadoAte: new Date(now.getTime() + Math.max(wait, 1000)) } });
  }, { maxWait: 10_000, timeout: 20_000 });
  return true;
}

let running = false;
let verifiedUntil = 0;
export async function runDiscord() {
  if (!discordConfig().enabled || running) return;
  running = true;
  try {
    if (!await apiAvailable(await databaseNow())) return;
    // Identity is checked before either financial responses or DMs are sent.
    if (Date.now() >= verifiedUntil) {
      await discordClient.identity();
      verifiedUntil = Date.now() + 5 * 60_000;
    }
    for (let n = 0; n < 10 && await processDiscordInteraction(); n++) { /* bounded inbox batch */ }
    await processDiscordOutbox();
    jobRuns.inc({ job: 'discord', result: 'ok' });
  } catch (error) {
    if (error instanceof DiscordError && (error.status === 429 || error.status === 401)) {
      await prisma.$transaction(tx => pauseApi(tx, new Date(), error.status === 401 ? 900_000 : retryDelay(0, error.retryAfter))).catch(() => {});
    }
    jobRuns.inc({ job: 'discord', result: 'error' }); console.error('Falha controlada no processamento Discord; verifique configuração e conectividade');
  }
  finally { running = false; }
}
