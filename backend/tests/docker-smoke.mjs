// Run against a disposable Compose project, never a personal database.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { setTimeout } from 'node:timers/promises';

if (!process.env.COMPOSE_PROJECT_NAME?.startsWith('saldo-smoke-')) {
  throw new Error('Use um projeto descartável COMPOSE_PROJECT_NAME=saldo-smoke-...');
}
const origin = process.env.SALDO_SMOKE_URL ?? 'http://127.0.0.1:5174';
const dockerExecutable = process.env.DOCKER_EXECUTABLE ?? '/usr/bin/docker';
if (!isAbsolute(dockerExecutable)) throw new Error('DOCKER_EXECUTABLE must be an absolute path');
const compose = (...args) => execFileSync(dockerExecutable, ['compose', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
async function api(path, method = 'GET', body, token) {
  if (!/^\/(?:ready|auth\/(?:register|login)|accounts(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/payments)?|payments\?contaId=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(path)) {
    throw new Error('Rota de teste não permitida');
  }
  return fetch(`${origin}/api${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}
async function ready() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await api('/ready')).ok) return; } catch { /* container or DNS restarting */ }
    await setTimeout(1000);
  }
  throw new Error('API não ficou pronta pelo proxy Nginx');
}
const fingerprint = () => compose('exec', '-T', 'backend', 'node', '-e',
  "const fs=require('fs'),crypto=require('crypto');const contents=fs.readFileSync('/app/runtime/.env','utf8');if(!/^JWT_SECRET=[a-f0-9]{64}\\n$/.test(contents))process.exit(1);console.log(crypto.createHash('sha256').update(contents).digest('hex'))").trim();

for (const route of ['/accounts/../auth/login', '//example.org', '/accounts/invalid/payments', '/payments?contaId=x&extra=1']) {
  await assert.rejects(() => api(route), /Rota de teste não permitida/);
}
await ready();
const firstKey = fingerprint();
const html = await fetch(origin);
assert.equal(html.status, 200);
assert.match(await html.text(), /<div id="root"/);
assert.equal((await api('/accounts')).status, 401);
const email = `smoke.${randomUUID()}@example.org`;
const senha = randomBytes(20).toString('hex');
assert.equal((await api('/auth/register', 'POST', { nome: 'Validação Docker', email, senha })).status, 201);
const login = await api('/auth/login', 'POST', { email, senha });
assert.equal(login.status, 200);
const { token } = await login.json();
assert.equal(typeof token, 'string');
const due = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const created = await api('/accounts', 'POST', { descricao: 'Conta de validação', valor: 100, vencimento: due, tipo: 'AVULSA', recorrencia: null }, token);
assert.equal(created.status, 201);
const { account } = await created.json();
const payload = { valor: 40, encargos: .9, pagoEm: due, chave: randomUUID() };
assert.equal((await api(`/accounts/${encodeURIComponent(account.id)}/payments`, 'POST', payload, token)).status, 201);
assert.ok((await api(`/accounts/${encodeURIComponent(account.id)}/payments`, 'POST', payload, token)).ok);
console.log('PASS cadastro, login, conta e pagamento idempotente via Nginx → API → PostgreSQL');

compose('restart', 'backend');
await ready();
assert.equal(fingerprint(), firstKey);
compose('up', '-d', '--no-deps', '--force-recreate', 'backend');
await ready();
assert.equal(fingerprint(), firstKey);
const accounts = await api('/accounts', 'GET', undefined, token);
assert.equal(accounts.status, 200, 'Sessão deve sobreviver à recriação do container');
const data = await accounts.json();
assert.equal(data.accounts.find(row => row.id === account.id)?.saldo, 60);
const payments = await (await api(`/payments?contaId=${encodeURIComponent(account.id)}`, 'GET', undefined, token)).json();
assert.equal(payments.payments.length, 1);
assert.equal(Number(payments.payments[0].encargos), .9);
console.log('PASS chave, sessão, saldo e histórico preservados após restart e recriação');
