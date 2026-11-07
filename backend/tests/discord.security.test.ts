import { generateKeyPairSync, sign } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { hashCode, seal, unseal, verifyDiscord } from '../src/integrations/discord/crypto.js';
import { discordConfig, discordEnvSchema } from '../src/integrations/discord/config.js';
import { sanitizedPayload } from '../src/integrations/discord/interactions.js';
import { DiscordClient, DiscordError } from '../src/integrations/discord/client.js';
import { retryDelay } from '../src/jobs/discord.js';
import { discordClient } from '../src/integrations/discord/client.js';
import { registerCommands } from '../src/integrations/discord/commands.js';
import { prisma } from '../src/lib/prisma.js';

const keys = generateKeyPairSync('ed25519');
const publicKey = keys.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
const appId = '123456789012345678';
beforeEach(() => {
  vi.stubEnv('DISCORD_ENABLED', 'true'); vi.stubEnv('DISCORD_BOT_TOKEN', 'token-falso-exclusivo-testes');
  vi.stubEnv('DISCORD_PUBLIC_KEY', publicKey); vi.stubEnv('DISCORD_APPLICATION_ID', appId); vi.stubEnv('DISCORD_ENCRYPTION_KEY', 'ab'.repeat(32));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function signed(raw: string, timestamp = String(Math.floor(Date.now() / 1000))) {
  return { 'X-Signature-Timestamp': timestamp, 'X-Signature-Ed25519': sign(null, Buffer.from(timestamp + raw), keys.privateKey).toString('hex') };
}
it('valida bytes originais e rejeita reserialização e adulteração', () => {
  const raw = '{ "type": 1 }', headers = signed(raw);
  expect(verifyDiscord(Buffer.from(raw), headers['X-Signature-Ed25519'], headers['X-Signature-Timestamp'], publicKey)).toBe(true);
  expect(verifyDiscord(Buffer.from('{"type":1}'), headers['X-Signature-Ed25519'], headers['X-Signature-Timestamp'], publicKey)).toBe(false);
});
it('PING assinado responde PONG sem consultar banco', async () => {
  const raw = '{ "type":1 }';
  const res = await request(app).post('/api/webhook/discord').set('Content-Type', 'application/json').set(signed(raw)).send(raw);
  expect(res.status).toBe(200); expect(res.body).toEqual({ type: 1 });
});
it.each([{}, { 'X-Signature-Ed25519': '00'.repeat(64) }, { 'X-Signature-Ed25519': 'invalido', 'X-Signature-Timestamp': '0' }])('recusa assinatura ausente ou inválida %j', async headers => {
  expect((await request(app).post('/api/webhook/discord').set(headers).send({ type: 1 })).status).toBe(401);
});
it('rejeita replay antigo mesmo com assinatura válida', async () => {
  const raw = '{"type":1}';
  expect((await request(app).post('/api/webhook/discord').set('Content-Type', 'application/json').set(signed(raw, String(Math.floor(Date.now() / 1000) - 301))).send(raw)).status).toBe(401);
});
it('rejeita aplicação diferente', async () => {
  const raw = JSON.stringify({ type: 1, application_id: '999999999999999999' });
  expect((await request(app).post('/api/webhook/discord').set('Content-Type', 'application/json').set(signed(raw)).send(raw)).status).toBe(401);
});
it('integração desabilitada preserva health e retorna condição controlada', async () => {
  vi.stubEnv('DISCORD_ENABLED', 'false');
  expect((await request(app).post('/api/webhook/discord').send({ type: 1 })).status).toBe(503);
  expect((await request(app).get('/api/health')).status).toBe(200);
});
it('exige segredos ao habilitar e não inclui valores no erro', () => {
  expect(discordEnvSchema.safeParse({ DISCORD_ENABLED: 'true' }).success).toBe(false);
  expect(discordEnvSchema.safeParse({ DISCORD_ENABLED: 'false' }).success).toBe(true);
  vi.stubEnv('DISCORD_ENCRYPTION_KEY', 'segredo-errado'); expect(() => discordConfig()).toThrow('DISCORD_ENCRYPTION_KEY');
  try { discordConfig(); } catch (e) { expect(String(e)).not.toContain('segredo-errado'); }
});
it('cifra tokens e remove credenciais e código do payload de auditoria', () => {
  const token = 'continuacao-secreta', code = 'codigo-secreto';
  const encrypted = seal(token); expect(encrypted).not.toContain(token); expect(unseal(encrypted)).toBe(token);
  const raw = sanitizedPayload({ token, data: { options: [{ name: 'codigo', value: code }] } });
  expect(JSON.stringify(raw)).not.toContain(token); expect(JSON.stringify(raw)).not.toContain(code); expect(JSON.stringify(raw)).toContain(hashCode(code));
});
it.each([401, 403, 429, 500])('cliente trata HTTP %i sem propagar dados sensíveis', async status => {
  const client = new DiscordClient(vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'segredo', retry_after: 2.5 }), { status })));
  await expect(client.request('/users/@me')).rejects.toMatchObject({ status, retryAfter: 2.5 });
  try { await client.request('/users/@me'); } catch (e) { expect(String(e)).not.toContain('segredo'); }
});
it('cliente valida aplicação e chave e identifica transporte', async () => {
  const client = new DiscordClient(vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: appId, verify_key: publicKey, interactions_endpoint_url: null }))));
  expect(await client.identity()).toMatchObject({ configured: true, transport: 'GATEWAY' });
  const wrong = new DiscordClient(vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '999999999999999999', verify_key: publicKey }))));
  await expect(wrong.identity()).rejects.toThrow('divergente');
});
it('DM inclui botão, nonce estável e bloqueia menções; registra ID', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{"id":"222222222222222222"}')).mockResolvedValueOnce(new Response('{"id":"333333333333333333"}', { headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset-after': '1.5' } }));
  const client = new DiscordClient(fetcher);
  expect(await client.sendDM('111111111111111111', '00000000-0000-4000-8000-000000000000', '@everyone')).toEqual({ id: '333333333333333333', wait: 1.5 });
  const body = JSON.parse(fetcher.mock.calls[1]![1].body);
  expect(body).toMatchObject({ allowed_mentions: { parse: [] }, enforce_nonce: true }); expect(body.nonce.length).toBeLessThanOrEqual(25); expect(body.components[0].components[0].custom_id).toContain('confirmar:');
});
it('backoff respeita retry_after e falha de rede é controlada', async () => {
  expect(retryDelay(1, 60)).toBe(60_000); expect(retryDelay(2)).toBeGreaterThan(retryDelay(1));
  await expect(new DiscordClient(vi.fn().mockRejectedValue(new Error('token-secreto'))).request('/users/@me')).rejects.toBeInstanceOf(DiscordError);
});
it('registro faz upsert dos quatro comandos no servidor da nova aplicação', async () => {
  vi.stubEnv('DISCORD_GUILD_ID', '999999999999999999');
  vi.spyOn(discordClient, 'identity').mockResolvedValue({ configured: true, transport: 'HTTP', endpoint: 'https://teste.invalid/api/webhook/discord' });
  const call = vi.spyOn(discordClient, 'request').mockResolvedValue({ json: {}, wait: 0 });
  await registerCommands(); expect(call).toHaveBeenCalledTimes(4);
  expect(call.mock.calls.map(c => (c[2] as { name: string }).name)).toEqual(['vincular', 'status', 'proximas-contas', 'desvincular']);
  expect(call.mock.calls.every(c => c[0].includes('/guilds/999999999999999999/commands') && c[1] === 'POST')).toBe(true);
});
it('falha de persistência não confirma tarefa perdida e responde rapidamente', async () => {
  vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('banco indisponível'));
  const raw = JSON.stringify({ id: '999999999999999999', application_id: appId, type: 2, token: 'fake-token', user: { id: '111111111111111111' }, data: { name: 'status' } });
  const started = performance.now();
  const r = await request(app).post('/api/webhook/discord').set('Content-Type', 'application/json').set(signed(raw)).send(raw);
  expect(r.status).toBe(503); expect(performance.now() - started).toBeLessThan(3000);
});
it('não aceita ator bot nem identidade contraditória em interação assinada', async () => {
  const raw = JSON.stringify({ id: '999999999999999999', application_id: appId, type: 2, token: 'fake-token', user: { id: '111111111111111111', bot: true }, data: { name: 'status' } });
  expect((await request(app).post('/api/webhook/discord').set('Content-Type', 'application/json').set(signed(raw)).send(raw)).status).toBe(400);
});
