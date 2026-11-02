/* Browser QA for a disposable Compose project. Reuses external Playwright tooling. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
if (!process.env.COMPOSE_PROJECT_NAME?.startsWith('saldo-smoke-') || !process.env.SALDO_QA_TOOLS || !process.env.SALDO_UI_URL) {
  throw new Error('Configure COMPOSE_PROJECT_NAME=saldo-smoke-..., SALDO_QA_TOOLS e SALDO_UI_URL');
}
const { chromium } = require(path.join(process.env.SALDO_QA_TOOLS, 'node_modules/playwright'));
const { default: AxeBuilder } = require(path.join(process.env.SALDO_QA_TOOLS, 'node_modules/@axe-core/playwright'));
const origin = process.env.SALDO_UI_URL;
const email = `browser.${crypto.randomUUID()}@example.org`, senha = crypto.randomBytes(20).toString('hex');
async function request(route, method = 'GET', body, token) {
  const response = await fetch(`${origin}/api${route}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.ok(response.ok, `${method} ${route}: ${response.status}`);
  return response.json();
}
async function csv(download) {
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}
async function accessibility(page, label) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], label);
}
(async () => {
  await request('/auth/register', 'POST', { nome: 'Validação Financeira', email, senha });
  const { token } = await request('/auth/login', 'POST', { email, senha });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const next = new Date(`${today}T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const nextMonth = next.toISOString().slice(0, 7);
  for (let i = 1; i <= 13; i++) {
    const { account } = await request('/accounts', 'POST', { descricao: `Relatório ${String(i).padStart(2, '0')}`, valor: 100, vencimento: i === 13 ? `${nextMonth}-01` : today, tipo: 'AVULSA', recorrencia: null }, token);
    await request(`/accounts/${account.id}/payments`, 'POST', { valor: 40, encargos: .9, pagoEm: today, chave: crypto.randomUUID() }, token);
  }
  const browser = await chromium.launch({ executablePath: process.env.SALDO_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/login`);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'Contas', exact: true }).click();
    await page.getByText('13 conta(s) encontrada(s)', { exact: true }).waitFor();
    assert.equal(await page.locator('.account-card').count(), 12);
    assert.match(await page.getByRole('definition').allTextContents().then(values => values.join(' ')), /780,00/);
    await accessibility(page, 'contas desktop');
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar contas CSV' }).click();
    const exported = await csv(await downloaded);
    assert.match(exported, /Relatório 01/); assert.match(exported, /Relatório 13/);
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    assert.equal(await page.locator('.account-card').count(), 1);
    await page.getByLabel('Mês do vencimento').fill(nextMonth);
    await page.getByRole('heading', { name: 'Relatório 13', exact: true }).waitFor();
    assert.equal(await page.locator('.account-card').count(), 1);
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    assert.equal(await page.locator('.account-card').count(), 12);
    await page.screenshot({ path: path.join(process.env.SALDO_QA_TOOLS, 'contas-relatorios-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await accessibility(page, 'contas mobile');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sem overflow horizontal no mobile');
    await page.screenshot({ path: path.join(process.env.SALDO_QA_TOOLS, 'contas-relatorios-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('navigation').getByRole('link', { name: 'Pagamentos', exact: true }).click();
    await page.locator('tbody tr').first().waitFor();
    assert.equal(await page.locator('tbody tr').count(), 12);
    assert.match(await page.locator('[aria-label="Resumo dos pagamentos filtrados"]').textContent(), /531,70/);
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    assert.equal(await page.locator('tbody tr').count(), 1);
    await page.getByLabel('Mês do pagamento').fill(nextMonth);
    await page.getByText('Nenhum pagamento neste filtro.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    assert.equal(await page.locator('tbody tr').count(), 12);
    await accessibility(page, 'pagamentos desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await accessibility(page, 'pagamentos mobile');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS Chrome desktop/mobile: login, filtros, totais, CSV completo, paginação e acessibilidade');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
