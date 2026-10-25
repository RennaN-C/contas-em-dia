/* Real Chrome QA. Install playwright and @axe-core/playwright outside the repo;
 * point SALDO_QA_TOOLS at that directory. Requires an isolated, migrated API. */
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const tools = process.env.SALDO_QA_TOOLS;
if (!tools || !process.env.DATABASE_URL || !process.env.SALDO_API_URL || !process.env.SALDO_UI_URL) {
  throw new Error('Configure SALDO_QA_TOOLS, DATABASE_URL, SALDO_API_URL e SALDO_UI_URL para o ambiente isolado');
}
const { chromium } = require(path.join(tools, 'node_modules/playwright'));
const { default: AxeBuilder } = require(path.join(tools, 'node_modules/@axe-core/playwright'));
const repo = path.resolve(__dirname, '../../..');
const output = path.join(repo, 'docs/qa');
fs.mkdirSync(output, { recursive: true });
const ui = process.env.SALDO_UI_URL, api = process.env.SALDO_API_URL;
const report = { startedAt: new Date().toISOString(), browser: 'Google Chrome', isolated: true, steps: [], accessibility: [], errors: [], screenshots: [] };
const stamp = Date.now();
const email = `qa.saldo.${stamp}@example.org`, password = 'SaldoTeste2026!';
const today = new Date().toISOString().slice(0, 10);
const date = days => new Date(Date.parse(today) + days * 86400000).toISOString().slice(0, 10);
function step(name, details = {}) { report.steps.push({ name, status: 'passed', ...details }); console.log(`PASS ${name}`); }
async function visible(locator) { await locator.waitFor({ state: 'visible', timeout: 15000 }); }

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.SALDO_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  async function screenshot(name) { await page.screenshot({ path: path.join(output, name), fullPage: true }); report.screenshots.push(name); }
  async function accessibility(name) {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    report.accessibility.push({ page: name, violations: results.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
    assert.equal(results.violations.length, 0, `Acessibilidade ${name}: ${JSON.stringify(report.accessibility.at(-1).violations)}`);
    step(`Acessibilidade automática: ${name}`, { rulesPassed: results.passes.length });
  }
  async function navigate(label) { await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click(); }
  async function createAccount(description, amount, due, type='AVULSA') {
    await page.getByRole('button', { name: 'Nova conta', exact: true }).click();
    const form = page.locator('form');
    await form.getByLabel('Descrição', { exact: true }).fill(description);
    await form.getByLabel('Valor', { exact: true }).fill(String(amount));
    await form.getByLabel('Vencimento', { exact: true }).fill(due);
    await form.getByRole('combobox').first().selectOption(type);
    await form.getByRole('button', { name: 'Salvar', exact: true }).click();
    await visible(page.getByRole('heading', { name: description, exact: true }).first());
  }
  try {
    await page.goto(`${ui}/cadastro`); await visible(page.getByRole('heading', { name: 'Crie sua conta' }));
    await accessibility('cadastro desktop'); await screenshot('saldo-plus-cadastro.png');
    await page.getByLabel('Nome', { exact: true }).fill('Rennan QA');
    await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByLabel('Confirmar senha', { exact: true }).fill('senha-diferente');
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await visible(page.getByText('As senhas devem ser iguais', {exact:true}));
    step('Cadastro impede confirmação de senha divergente');
    await page.getByLabel('Confirmar senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click(); await visible(page.getByText('Cadastro realizado!', { exact: true }));
    step('Cadastro real pelo formulário');
    await page.getByRole('link', { name: 'Ir para o login' }).click();
    await page.getByLabel('E-mail', { exact: true }).fill(email); await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click(); await visible(page.getByRole('heading', { name: 'Olá, Rennan!' }));
    await visible(page.getByText('Seu próximo passo começa aqui', { exact: true })); step('Login JWT e dashboard vazio');
    await navigate('Contas'); await createAccount('Conta QA ciclo completo', 100, date(-30)); await createAccount('Internet QA próxima', 120, date(3));
    step('Cadastro de conta atrasada e conta a vencer pela interface');
    await page.getByLabel('Buscar conta').fill('inexistente'); await visible(page.getByText('Nenhuma conta encontrada.', { exact: true }));
    await page.getByLabel('Buscar conta').fill(''); step('Busca de contas e estado vazio');
    await accessibility('contas desktop'); await screenshot('saldo-plus-contas.png');
    execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/jobs/run.ts', 'daily', date(-30)], { cwd: path.join(repo, 'backend'), env: process.env });
    execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/jobs/run.ts', 'daily', date(-30)], { cwd: path.join(repo, 'backend'), env: process.env });
    execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/jobs/run.ts', 'weekly', today], { cwd: path.join(repo, 'backend'), env: process.env });
    step('Jobs reais de aviso e resumo, com reexecução idempotente');
    await navigate('Avisos'); await visible(page.getByRole('heading', { name: 'Vencimento hoje', exact: true }));
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('contasemdia:session')));
    const headers = { Authorization: `Bearer ${session.token}` };
    const get = async endpoint => { const r = await page.request.get(api + endpoint, { headers }); assert.equal(r.status(), 200); return r.json(); };
    let messages = (await get('/messages')).messages;
    assert.equal(messages.filter(m => m.tipo === 'AVISO').length, 1); assert.equal(messages.filter(m => m.tipo === 'RESUMO_SEMANAL').length, 1);
    const notice = messages.find(m => m.tipo === 'AVISO');
    await page.getByRole('button', { name: 'Marcar como lida: Vencimento hoje', exact: true }).click();
    await visible(page.getByText('Mensagem marcada como lida.', { exact: true })); await page.reload();
    await visible(page.getByRole('heading', { name: 'Vencimento hoje', exact: true }));
    assert.equal((await get('/messages')).messages.find(m => m.id === notice.id).lida, true); step('Aviso único, mensagem marcada como lida e persistência após reload');
    await navigate('Contas'); await page.getByRole('button', { name: 'Pagar Conta QA ciclo completo', exact: true }).click();
    await page.getByLabel('Valor do pagamento', { exact: true }).fill('40');
    await page.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
    await page.locator('form').waitFor({ state: 'detached' });
    const account = (await get('/accounts')).accounts.find(c => c.descricao === 'Conta QA ciclo completo');
    assert.equal(account.saldo, 60); assert.equal(account.status, 'ATRASADA'); assert.equal(account.pagamentos.length, 1); step('Pagamento parcial real: R$ 100 − R$ 40 = R$ 60 pendentes');
    await page.getByRole('button', { name: 'Histórico de Conta QA ciclo completo', exact: true }).click();
    await visible(page.getByRole('region', { name: 'Histórico de pagamentos' }).getByText(/40,00/)); step('Histórico de pagamento visível');
    await navigate('Avisos'); await visible(page.getByText(/30 dia\(s\) de atraso/));
    try {
      const response = await page.request.get('https://brasilapi.com.br/api/taxas/v1/Selic', { timeout: 10000 });
      report.brasilApi = { httpStatus: response.status(), body: (await response.text()).slice(0, 400) };
    } catch (error) { report.brasilApi = { error: error.message }; }
    step('Consulta direta ao endpoint real da BrasilAPI registrada', report.brasilApi);
    const estimates = (await get('/notifications/interest-estimates')).estimates;
    assert.equal(estimates.length, 1); assert.equal(estimates[0].saldo, '60.00'); assert.equal(estimates[0].dias, 30);
    report.realSelic = estimates[0].status;
    report.rateSource = estimates[0].fonte;
    report.rateCached = estimates[0].emCache;
    if (estimates[0].status === 'disponivel') {
      assert.equal(Number(estimates[0].juros), Math.round(60 * estimates[0].taxaAnual / 100 * 30 / 365 * 100) / 100);
      step('BrasilAPI real: juros calculados somente sobre saldo parcial', { rate: estimates[0].taxaAnual, interest: estimates[0].juros });
    } else {
      assert.ok(!('taxaAnual' in estimates[0])); await visible(page.getByText('Selic indisponível.', { exact: false }));
      step('BrasilAPI real indisponível: interface mantém saldo/dias sem inventar taxa');
    }
    const summary = (await get('/notifications/weekly-summary')).summary;
    assert.equal(summary.total, 120); assert.equal(summary.accounts.length, 1); step('Resumo semanal real inclui somente conta elegível');
    await accessibility('avisos desktop'); await screenshot('saldo-plus-avisos.png');
    await page.route('**/api/notifications/interest-estimates', route => route.fulfill({ json: { aviso: 'Cenário simulado apenas para QA', estimates: [{ conta: { id: account.id, descricao: account.descricao, vencimento: account.vencimento }, dias: 30, saldo: '60.00', status: 'disponivel', taxaAnual: 15, juros: '0.74', valorEstimado: '60.74' }] } }));
    await page.reload(); await visible(page.getByText(/Juros estimados:.*0,74/));
    assert.match(await page.locator('main').innerText(), /60,74/); step('Cenário controlado no Chrome: resposta simulada com 15% a.a., juros R$ 0,74 e total R$ 60,74');
    await page.unroute('**/api/notifications/interest-estimates');
    await navigate('Pagamentos'); await visible(page.getByRole('region', { name: 'Histórico de pagamentos' }).getByText(/40,00/)); await accessibility('pagamentos desktop');
    const downloaded = page.waitForEvent('download'); await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();
    const download=await downloaded; const csv=fs.readFileSync(await download.path(),'utf8');assert.match(csv,/Conta QA ciclo completo/);assert.match(csv,/40.00/);step('Exportação CSV real do histórico do usuário');
    await navigate('Perfil'); await visible(page.getByRole('heading', { name: 'Perfil', exact: true })); assert.match(await page.locator('.profile-panel').innerText(), /Rennan QA/); await accessibility('perfil desktop');
    await page.getByLabel('Nome',{exact:true}).fill('Rennan QA Atualizado');await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();await visible(page.getByText('Perfil atualizado com sucesso.',{exact:true}));
    assert.equal((await get('/users/me')).user.nome,'Rennan QA Atualizado');step('Edição de perfil persiste e atualiza sessão sem trocar o JWT');
    step('Navegação por pagamentos e perfil com dados reais');
    await navigate('Início'); await visible(page.getByText('Compromissos e pagamentos', { exact: true }));
    await visible(page.getByText('Preparando seu panorama financeiro…', { exact: true }).or(page.locator('.stats-grid')));
    await visible(page.locator('.stats-grid')); assert.match(await page.locator('.stat-featured').innerText(), /180,00/);
    await page.getByText('Consultar valores do gráfico', { exact: true }).click(); await visible(page.getByRole('table'));
    step('Dashboard e gráficos reais: R$ 180 pendentes e R$ 40 pagos, tabela acessível');
    await accessibility('dashboard desktop'); await page.getByText('Consultar valores do gráfico', { exact: true }).click(); await screenshot('saldo-plus-dashboard.png');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow desktop');
    await page.setViewportSize({ width: 390, height: 844 }); await visible(page.getByRole('button', { name: 'Menu', exact: true }));
    await page.getByRole('button', { name: 'Menu', exact: true }).click(); await navigate('Avisos');
    await visible(page.getByRole('heading', { name: 'Avisos', exact: true })); assert.equal(await page.getByRole('button', { name: 'Menu', exact: true }).getAttribute('aria-expanded'), 'false');
    await visible(page.getByText(/30 dia\(s\) de atraso/)); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow mobile avisos');
    await accessibility('avisos mobile 390px'); await screenshot('saldo-plus-mobile-avisos.png');
    await page.getByRole('button', { name: 'Menu', exact: true }).click(); await navigate('Início'); await visible(page.locator('.stats-grid'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow mobile dashboard'); await accessibility('dashboard mobile 390px'); await screenshot('saldo-plus-mobile-dashboard.png');
    await page.setViewportSize({ width: 320, height: 740 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow mobile 320px');
    step('Responsividade: menu funcional, sem overflow em 1440px, 390px e 320px');
    await page.setViewportSize({width:1440,height:1000});await navigate('Contas');await createAccount('Mensal QA previsão',80,today,'RECORRENTE');
    let monthly=(await get('/accounts')).accounts.filter(c=>c.descricao==='Mensal QA previsão');assert.ok(monthly.length>=2);assert.ok(monthly.every(c=>c.pagamentos.length===0));step('Recorrência prevê próximo mês mesmo sem pagamento');
    await page.getByRole('button',{name:'Pausar recorrência de Mensal QA previsão',exact:true}).first().click();await visible(page.getByText('Recorrência pausada.',{exact:false}));monthly=(await get('/accounts')).accounts.filter(c=>c.descricao==='Mensal QA previsão');assert.ok(monthly.every(c=>c.recorrenciaAtiva===false));
    await page.getByRole('button',{name:'Retomar recorrência de Mensal QA previsão',exact:true}).first().click();await visible(page.getByText('Recorrência retomada.',{exact:false}));await page.getByRole('button',{name:'Atualizar previsões',exact:true}).click();await visible(page.getByText(/nova\(s\) mensalidade\(s\) prevista\(s\)/));
    assert.equal((await get('/accounts')).accounts.filter(c=>c.descricao==='Mensal QA previsão').length,monthly.length);step('Pausa, retomada e sincronização sem duplicar mensalidades');
    await navigate('Avisos');await page.getByRole('button',{name:'Atualizar avisos',exact:true}).click();await visible(page.getByText('Avisos e previsões atualizados.',{exact:true}));
    await page.getByRole('button',{name:'Marcar todas como lidas',exact:true}).click();await visible(page.getByText('Todas as mensagens foram marcadas como lidas.',{exact:true}));assert.equal((await get('/messages/summary')).unread,0);step('Atualização de avisos e leitura em lote zeram contador real');
    const otherEmail=`other.${stamp}@example.org`;
    assert.equal((await page.request.post(`${api}/auth/register`,{data:{nome:'Outro QA',email:otherEmail,senha:password}})).status(),201);
    const foreignLogin=await page.request.post(`${api}/auth/login`,{data:{email:otherEmail,senha:password}});const foreignToken=(await foreignLogin.json()).token;const foreignHeaders={Authorization:`Bearer ${foreignToken}`};
    assert.deepEqual((await (await page.request.get(`${api}/accounts`,{headers:foreignHeaders})).json()).accounts,[]);
    assert.equal((await page.request.patch(`${api}/messages/${notice.id}/read`,{headers:foreignHeaders})).status(),404);step('Outro usuário não lista contas nem altera mensagens alheias');
    await page.getByRole('button', { name: 'Sair', exact: true }).click(); await visible(page.getByRole('heading', { name: 'Entrar', exact: true }));
    await page.goto(`${ui}/avisos`); await visible(page.getByRole('heading', { name: 'Entrar', exact: true })); step('Logout remove sessão e protege rota de avisos');
    assert.deepEqual(report.errors, []); step('Nenhum erro JavaScript no navegador');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.failure = String(error.stack || error); await screenshot('saldo-plus-failure.png').catch(() => {}); console.error(report.failure); process.exitCode = 1;
  } finally {
    report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2)); await browser.close();
    console.log(JSON.stringify({ status: report.status, steps: report.steps.length, realSelic: report.realSelic, errors: report.errors.length }));
  }
})();
