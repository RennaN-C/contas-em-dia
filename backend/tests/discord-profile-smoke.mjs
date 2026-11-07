// Browser evidence against the isolated Compose stack, Discord disabled.
// Start headless Chrome on localhost:9339 before running this script.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';
const origin = process.env.SALDO_SMOKE_URL ?? 'http://127.0.0.1:5574';
assert.equal(new URL(origin).hostname, '127.0.0.1');
async function post(path, body) {
  const r = await globalThis.fetch(`${origin}/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.ok(r.ok, `API ${path}: ${r.status}`); return r.json();
}
const email = `discord-qa-${randomUUID()}@invalid.example`, senha = randomBytes(20).toString('hex');
await post('/auth/register', { nome: 'Demonstração Discord', email, senha });
const session = await post('/auth/login', { email, senha });
const target = await globalThis.fetch('http://127.0.0.1:9339/json/new?about:blank', { method: 'PUT' }).then(r => r.json());
const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let counter = 0; const pending = new Map();
ws.addEventListener('message', event => {
  const data = JSON.parse(String(event.data)), p = pending.get(data.id);
  if (p) { pending.delete(data.id); if (data.error) p.reject(new Error(data.error.message)); else p.resolve(data.result); }
});
async function cdp(method, params = {}) {
  const id = ++counter;
  const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  ws.send(JSON.stringify({ id, method, params })); return promise;
}
const evaluate = async expression => (await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
async function wait(expression) {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error('Condição do navegador não satisfeita');
}
try {
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: `${origin}/login` });
  await wait('document.readyState === "complete" && location.pathname === "/login"');
  await evaluate(`localStorage.setItem('contasemdia:session', ${JSON.stringify(JSON.stringify(session))});location.assign('/perfil')`);
  await wait('document.body.innerText.includes("Integração ainda não configurada")');
  assert.equal(await evaluate('document.querySelector("#discord-title").textContent'), 'Discord');
  const output = new URL('../../docs/qa/', import.meta.url); mkdirSync(output, { recursive: true });
  const desktop = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(new URL('discord-profile-desktop.png', output), Buffer.from(desktop.data, 'base64'));
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(300);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, 'Layout mobile com overflow');
  const mobile = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(new URL('discord-profile-mobile.png', output), Buffer.from(mobile.data, 'base64'));
  console.log('PASS perfil Discord real no Chrome desktop/mobile; sessão autenticada, estado desabilitado e sem overflow.');
} finally { ws.close(); }
