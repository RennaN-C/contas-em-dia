import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/config/env.js';
import { createAccessToken } from '../src/modules/auth/token.service.js';
import { discordClient, DiscordError } from '../src/integrations/discord/client.js';
import { processDiscordInteraction, processDiscordOutbox } from '../src/jobs/discord.js';
import { hashCode } from '../src/integrations/discord/crypto.js';
import { invite, revoke } from '../src/modules/messages/discord-link.service.js';
import { persistMessage, processWeeklySummaries } from '../src/modules/messages/messages.service.js';
import { processNotifications } from '../src/modules/notifications/notifications.service.js';
import { businessDay, addDays } from '../src/modules/notifications/dates.js';

describe.skipIf(process.env.RUN_DATABASE_TESTS !== '1')('Discord com PostgreSQL real e API Discord simulada', () => {
  const owner = randomUUID(), other = randomUUID(), discordId = '111111111111111111', foreignId = '222222222222222222';
  const appId = '333333333333333333', keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
  const auth = { Authorization: `Bearer ${createAccessToken(owner, env.JWT_SECRET)}` }, foreign = { Authorization: `Bearer ${createAccessToken(other, env.JWT_SECRET)}` };
  let serial = 400000000000000000n;
  const eventIds: string[] = [];
  beforeAll(async () => {
    vi.stubEnv('DISCORD_ENABLED', 'true'); vi.stubEnv('DISCORD_BOT_TOKEN', 'token-falso-nao-enviar'); vi.stubEnv('DISCORD_APPLICATION_ID', appId); vi.stubEnv('DISCORD_PUBLIC_KEY', publicKey); vi.stubEnv('DISCORD_ENCRYPTION_KEY', 'ab'.repeat(32));
    await prisma.usuario.createMany({ data: [owner, other].map(id => ({ id, nome: 'Discord testes', email: `${id}@invalid.example`, senhaHash: 'sem-login' })) });
  });
  afterAll(async () => {
    await prisma.mensagem.deleteMany({ where: { OR: [{ interacaoId: { in: eventIds } }, { chave: { in: eventIds.map(id => `resposta:${id}`) } }] } });
    await prisma.interacaoDiscord.deleteMany({ where: { id: { in: eventIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: [owner, other] } } });
    vi.unstubAllEnvs(); vi.restoreAllMocks(); await prisma.$disconnect();
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(discordClient, 'editResponse').mockImplementation(async () => ({ json: { id: String(++serial) }, wait: 0 }));
    vi.spyOn(discordClient, 'sendDM').mockImplementation(async () => ({ id: String(++serial), wait: 0 }));
    await prisma.controleDiscord.upsert({ where: { chave: 'envios' }, create: { chave: 'envios', pausadoAte: new Date(0) }, update: { pausadoAte: new Date(0) } });
    await prisma.controleDiscord.upsert({ where: { chave: 'api' }, create: { chave: 'api', pausadoAte: new Date(0) }, update: { pausadoAte: new Date(0) } });
  });
  async function submit(data: object, actor = discordId, type = 2, externalMessage?: string, eventId = String(++serial)) {
    eventIds.push(eventId);
    const payload = { id: eventId, application_id: appId, type, token: 'token-continuacao-nao-publicar', user: { id: actor }, data, ...(externalMessage ? { message: { id: externalMessage } } : {}) };
    const raw = JSON.stringify(payload), timestamp = String(Math.floor(Date.now() / 1000));
    const signature = sign(null, Buffer.from(timestamp + raw), keys.privateKey).toString('hex');
    const response = await request(app).post('/api/webhook/discord').set('Content-Type', 'application/json').set('X-Signature-Timestamp', timestamp).set('X-Signature-Ed25519', signature).send(raw);
    expect(response.status).toBe(200); expect(response.body).toEqual({ type: 5, data: { flags: 64 } });
    return eventId;
  }
  async function command(name: string, options?: { name: string; type: number; value: string }[], actor = discordId) {
    const id = await submit({ name, ...(options ? { options } : {}) }, actor);
    await processDiscordInteraction();
    return prisma.interacaoDiscord.findUniqueOrThrow({ where: { id } });
  }
  async function connect() {
    await revoke(owner); const code = await invite(owner);
    await command('vincular', [{ name: 'codigo', type: 3, value: code.codigo }]);
    return prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } });
  }
  async function queued() {
    const key = randomUUID();
    await prisma.$transaction(tx => persistMessage(tx, { usuarioId: owner, chave: key, titulo: 'Lembrete', conteudo: 'Valor restante a pagar R$ 12,00', tipo: 'AVISO' }));
    return prisma.mensagem.findUniqueOrThrow({ where: { chave: `discord:${key}` } });
  }
  it('rotas exigem autenticação e estado não revela identificador Discord', async () => {
    expect((await request(app).get('/api/integrations/discord')).status).toBe(401);
    const r = await request(app).get('/api/integrations/discord').set(auth);
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ configured: true, ativo: false }); expect(JSON.stringify(r.body)).not.toContain(discordId);
  });
  it('vincula código válido de uso único e persiste entrada/saída sem token nem código', async () => {
    const code = await invite(owner);
    expect((await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } })).codigoConvite).toBe(hashCode(code.codigo));
    const event = await command('vincular', [{ name: 'codigo', type: 3, value: code.codigo }]);
    expect(event.processado).toBe(true); expect(event.concluido).toBe(true); expect(event.segredo).toBeNull();
    expect(JSON.stringify(event.payload)).not.toContain(code.codigo); expect(JSON.stringify(event.payload)).not.toContain('token-continuacao');
    const link = await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } });
    expect(link).toMatchObject({ ativo: true, discordId, codigoConvite: null, expiraEm: null });
    expect(await prisma.mensagem.count({ where: { usuarioId: owner, direcao: 'entrada', interacaoId: event.id } })).toBe(1);
    const reuse = await command('vincular', [{ name: 'codigo', type: 3, value: code.codigo }], foreignId);
    expect(JSON.stringify(reuse.resposta)).toContain('inválido');
  });
  it('código expirado não cria vínculo', async () => {
    const code = await invite(other);
    await prisma.canalUsuario.update({ where: { usuarioId: other }, data: { expiraEm: new Date(0) } });
    const result = await command('vincular', [{ name: 'codigo', type: 3, value: code.codigo }], foreignId);
    expect(JSON.stringify(result.resposta)).toContain('expirado');
    expect((await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: other } })).ativo).toBe(false);
  });
  it('identidade já vinculada não é transferida para terceiro', async () => {
    const code = await invite(other);
    expect(JSON.stringify((await command('vincular', [{ name: 'codigo', type: 3, value: code.codigo }])).resposta)).toContain('já possui vínculo');
    expect((await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } })).discordId).toBe(discordId);
  });
  it('interação duplicada executa uma única vez, inclusive em workers concorrentes', async () => {
    const id = await submit({ name: 'status' });
    await submit({ name: 'status' }, discordId, 2, undefined, id);
    await Promise.all([processDiscordInteraction(), processDiscordInteraction()]);
    expect(await prisma.interacaoDiscord.count({ where: { id } })).toBe(1);
    expect(await prisma.mensagem.count({ where: { interacaoId: id } })).toBe(1);
    expect(discordClient.editResponse).toHaveBeenCalledOnce();
  });
  it('próximas contas são privadas e isoladas, inclusive pagamento parcial', async () => {
    await prisma.conta.createMany({ data: [{ usuarioId: owner, descricao: 'Internet pessoal', valor: 100, vencimento: addDays(businessDay(), 1) }, { usuarioId: other, descricao: 'Segredo de outra pessoa', valor: 999, vencimento: addDays(businessDay(), 1) }] });
    const own = await prisma.conta.findFirstOrThrow({ where: { usuarioId: owner } });
    await prisma.pagamento.create({ data: { contaId: own.id, valor: 40, pagoEm: new Date() } });
    const result = await command('proximas-contas');
    expect(JSON.stringify(result.resposta)).toContain('60,00'); expect(JSON.stringify(result.resposta)).not.toContain('Segredo de outra pessoa');
    expect(JSON.stringify((await command('proximas-contas', undefined, foreignId)).resposta)).not.toContain('Internet pessoal');
  });
  it('jobs existentes enfileiram só para opt-in e permanecem idempotentes', async () => {
    await processNotifications(businessDay(), owner); await processNotifications(businessDay(), owner);
    await processWeeklySummaries(businessDay(), owner); await processWeeklySummaries(businessDay(), owner);
    const internal = await prisma.mensagem.findMany({ where: { usuarioId: owner, plataforma: 'INTERNA', OR: [{ chave: { startsWith: 'aviso:' } }, { chave: { startsWith: 'semana:' } }] } });
    expect(internal.length).toBeGreaterThanOrEqual(2);
    for (const message of internal) expect(await prisma.mensagem.count({ where: { chave: `discord:${message.chave}` } })).toBe(1);
    await processNotifications(businessDay(), other);
    expect(await prisma.mensagem.count({ where: { usuarioId: other, plataforma: 'DISCORD', direcao: 'saida', estado: 'enfileirada' } })).toBe(0);
    // Remove pending delivery for this scenario via authorized revocation.
    await revoke(owner); await connect();
  });
  it('envio retorna ID e clique confirma somente mensagem do proprietário', async () => {
    const message = await queued(); await processDiscordOutbox();
    const sent = await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } });
    expect(sent.estado).toBe('enviada'); expect(sent.idExterno).toBeTruthy(); expect(sent.enviadoEm).toBeTruthy();
    const foreignCode = await invite(other); await command('vincular', [{ name: 'codigo', type: 3, value: foreignCode.codigo }], foreignId);
    await submit({ custom_id: `confirmar:${message.id}` }, foreignId, 3, sent.idExterno!); await processDiscordInteraction();
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).estado).toBe('enviada');
    await submit({ custom_id: `confirmar:${message.id}` }, discordId, 3, sent.idExterno!); await processDiscordInteraction();
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).estado).toBe('respondida');
  });
  it.each([429, 500])('HTTP %i reprograma com backoff e recupera do banco em nova execução', async status => {
    const message = await queued();
    vi.mocked(discordClient.sendDM).mockRejectedValueOnce(new DiscordError(status, 2));
    await processDiscordOutbox();
    const failed = await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } });
    expect(failed.estado).toBe('enfileirada'); expect(failed.codigoErro).toBe(String(status)); expect(failed.tentativas).toBe(1);
    await processDiscordOutbox(new Date(failed.proximaTentativa.getTime() + 1));
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).estado).toBe('enviada');
  });
  it('403 registra falha e inativa vínculo, sem envio a canal público', async () => {
    const message = await queued(); vi.mocked(discordClient.sendDM).mockRejectedValueOnce(new DiscordError(403)); await processDiscordOutbox();
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).estado).toBe('falha');
    expect((await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } })).ativo).toBe(false);
    const r = await request(app).get('/api/integrations/discord').set(auth); expect(r.body.erro).toContain('DM');
    await connect(); await queued(); await processDiscordOutbox();
    expect((await request(app).get('/api/integrations/discord').set(auth)).body.erro).toBeNull();
  });
  it('401 não repete indefinidamente e limita envios seguintes', async () => {
    await connect(); const message = await queued(); vi.mocked(discordClient.sendDM).mockRejectedValueOnce(new DiscordError(401)); await processDiscordOutbox();
    expect((await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).estado).toBe('falha');
    expect((await prisma.controleDiscord.findUniqueOrThrow({ where: { chave: 'envios' } })).pausadoAte.getTime()).toBeGreaterThan(Date.now() + 800_000);
  });
  it('limita tentativas e mantém evidência de falha', async () => {
    const message = await queued(); await prisma.mensagem.update({ where: { id: message.id }, data: { tentativas: 4 } });
    vi.mocked(discordClient.sendDM).mockRejectedValueOnce(new DiscordError(500)); await processDiscordOutbox();
    expect(await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ estado: 'falha', tentativas: 5 });
  });
  it('reinício durante envio reserva resultado incerto e impede duplicação automática', async () => {
    const message = await queued(); await prisma.mensagem.update({ where: { id: message.id }, data: { codigoErro: 'EM_ENVIO', proximaTentativa: new Date(0), tentativas: 1 } });
    await processDiscordOutbox();
    expect(await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ estado: 'falha', codigoErro: 'RESULTADO_INCERTO' }); expect(discordClient.sendDM).not.toHaveBeenCalled();
  });
  it('desvincular pede confirmação e revoga somente a própria identidade', async () => {
    const response = await command('desvincular'); expect(JSON.stringify(response.resposta)).toContain('Sim, desvincular');
    const channel = await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } });
    await submit({ custom_id: `desvincular:${channel.id}` }, foreignId, 3); await processDiscordInteraction();
    expect((await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } })).ativo).toBe(true);
    await submit({ custom_id: `desvincular:${channel.id}` }, discordId, 3); await processDiscordInteraction();
    expect((await prisma.canalUsuario.findUniqueOrThrow({ where: { usuarioId: owner } })).ativo).toBe(false);
    expect((await request(app).delete('/api/integrations/discord').set(foreign)).status).toBe(200);
  });
  it('mensagens internas continuam legíveis e contagem não inclui transporte', async () => {
    const r = await request(app).get('/api/messages').set(auth);
    expect(r.status).toBe(200); expect(r.body.messages.length).toBeGreaterThan(0); expect(r.body.messages.every((m: { plataforma: string }) => m.plataforma === 'INTERNA')).toBe(true);
    const baseline = await prisma.mensagem.findUnique({ where: { id: 'mensagem-preservada' } });
    if (baseline) expect(baseline).toMatchObject({ plataforma: 'INTERNA', conteudo: 'Preservar conteúdo' });
  });
  it('mensagens e resposta de pessoa sem vínculo também ficam registradas', async () => {
    const event = await command('status', undefined, '777777777777777777');
    const incoming = await prisma.mensagem.findUniqueOrThrow({ where: { interacaoId: event.id } });
    expect(incoming).toMatchObject({ usuarioId: null, plataforma: 'DISCORD', direcao: 'entrada', estado: 'respondida' });
    expect(await prisma.mensagem.findUniqueOrThrow({ where: { chave: `resposta:${event.id}` } })).toMatchObject({ usuarioId: null, direcao: 'saida', estado: 'enviada' });
  });
  it('falha da resposta privada é retomada sem reexecutar o comando', async () => {
    vi.mocked(discordClient.editResponse).mockRejectedValueOnce(new DiscordError(500));
    const event = await command('status', undefined, '777777777777777777');
    expect(event).toMatchObject({ processado: true, concluido: false, tentativas: 1 });
    await processDiscordInteraction(new Date(event.proximaTentativa.getTime() + 1));
    expect(await prisma.interacaoDiscord.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({ concluido: true, segredo: null });
    expect(await prisma.mensagem.count({ where: { interacaoId: event.id } })).toBe(1);
  });
  it('prazo expirado registra falha e remove token de continuação', async () => {
    const id = await submit({ name: 'status' }, '777777777777777777');
    await prisma.interacaoDiscord.update({ where: { id }, data: { criadoEm: new Date(Date.now() - 20 * 60_000) } });
    await processDiscordInteraction();
    expect(await prisma.interacaoDiscord.findUniqueOrThrow({ where: { id } })).toMatchObject({ concluido: true, segredo: null });
    expect(await prisma.mensagem.findUniqueOrThrow({ where: { interacaoId: id } })).toMatchObject({ estado: 'falha', codigoErro: 'EXPIRADA' });
  });
  it('outbox concorrente envia uma única DM para a mesma tarefa', async () => {
    await connect(); const message = await queued();
    await Promise.all([processDiscordOutbox(), processDiscordOutbox()]);
    expect(discordClient.sendDM).toHaveBeenCalledOnce();
    expect(await prisma.mensagem.findUniqueOrThrow({ where: { id: message.id } })).toMatchObject({ estado: 'enviada' });
  });
  it('Prometheus autorizado coleta gauges sem dados pessoais', async () => {
    vi.stubEnv('METRICS_ENABLED', 'true'); vi.stubEnv('METRICS_TOKEN', 'segredo-apenas-teste-metricas');
    const r = await request(app).get('/internal/metrics').set('Authorization', 'Bearer segredo-apenas-teste-metricas');
    expect(r.status).toBe(200); expect(r.text).toContain('saldo_discord_messages'); expect(r.text).not.toContain(owner); expect(r.text).not.toContain('Internet pessoal');
  });
  it('envia aviso atual criado antes do vínculo com valor atualizado, sem repetir nem enviar histórico', async () => {
    const lateOwner = randomUUID();
    await prisma.usuario.create({ data: { id: lateOwner, nome: 'Vínculo posterior', email: `${lateOwner}@invalid.example`, senhaHash: 'sem-login' } });
    try {
      const day = businessDay();
      const account = await prisma.conta.create({ data: { usuarioId: lateOwner, descricao: 'Aviso atual', valor: 100, vencimento: addDays(day, 3) } });
      await processNotifications(day, lateOwner);
      expect(await prisma.mensagem.count({ where: { usuarioId: lateOwner, plataforma: 'DISCORD' } })).toBe(0);
      await prisma.pagamento.create({ data: { contaId: account.id, valor: 40, pagoEm: new Date() } });
      const code = await invite(lateOwner);
      await command('vincular', [{ name: 'codigo', type: 3, value: code.codigo }], '888888888888888888');
      await processNotifications(day, lateOwner); await processNotifications(day, lateOwner);
      const outgoing = await prisma.mensagem.findMany({ where: { usuarioId: lateOwner, tipo: 'DISCORD' } });
      expect(outgoing).toHaveLength(1); expect(outgoing[0]!.conteudo).toContain('60,00');
      const past = addDays(day, -10);
      await prisma.conta.create({ data: { usuarioId: lateOwner, descricao: 'Histórico antigo', valor: 50, vencimento: addDays(past, 1) } });
      await processNotifications(past, lateOwner);
      expect(await prisma.mensagem.count({ where: { usuarioId: lateOwner, tipo: 'DISCORD' } })).toBe(1);
      await processWeeklySummaries(day, lateOwner); await processWeeklySummaries(day, lateOwner);
      expect(await prisma.mensagem.count({ where: { usuarioId: lateOwner, tipo: 'DISCORD', titulo: 'Resumo semanal' } })).toBe(1);
    } finally { await prisma.usuario.delete({ where: { id: lateOwner } }); }
  });
});
