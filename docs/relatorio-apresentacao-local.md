# Saldo + — preparação e validação para apresentação local

Data: 25/10/2026. Responsável: Rennan. Branch: `feat/saldo-plus-apresentacao`.
Escopo de hospedagem confirmado pelo usuário: **apresentação local**.

## Resultado técnico

- **290 testes Vitest aprovados: 216 backend + 74 frontend**, incluindo
  **29 testes de integração PostgreSQL real**, em banco isolado.
- TypeScript e builds backend/frontend aprovados.
- **32 verificações no Chrome real** (instalado, headless via Playwright),
  incluindo **8 auditorias axe sem violações** nas regras WCAG A/AA aplicáveis.
- `npm audit`: **zero vulnerabilidades** nos dois pacotes na revisão executada.
- Conta demonstrativa preparada em banco local separado do QA; login e telas
  também verificados no Chrome em `http://localhost:5174`.
- CI executada e aprovada também no GitHub Actions, com instalação limpa,
  PostgreSQL descartável, testes, builds e auditoria: [execução do código 5b1308e](https://github.com/RennaN-C/contas-em-dia/actions/runs/40234196654).
  Resultados dos commits posteriores de evidências constam da PR #36.

Os números não incluem testes compilados em `dist/`: o runner passou a selecionar
explicitamente `tests/**/*.test.ts`, evitando dupla execução/contagem.

## O que passou a funcionar

| Área | Entrega e evidência |
| --- | --- |
| Taxa de referência | BrasilAPI com contrato `Selic`/`SELIC`, fallback para meta Selic anual SGS 432 do Banco Central, timeout e validação de datas/valores |
| Cache | PostgreSQL compartilhado, uma hora de validade, fonte/data na UI; em falha total usa taxa válida de até sete dias com aviso de desatualização |
| Recorrência | Criação de competências até o fim do próximo mês independentemente de pagamento, mantendo a cadeia/índice de origem existentes |
| Pausa e retomada | Série inteira pode ser pausada/retomada, inclusive por um lançamento descendente, sem apagar histórico ou contas já previstas |
| Calendário | “Hoje” em Brasília; datas civis persistidas como marcadores UTC, sem deslocar vencimentos; testes às 23h59/00h00 brasileiras |
| Jobs | Recuperação na inicialização e a cada 15 minutos, sete dias anteriores pendentes, conclusão persistida e retry idempotente |
| Avisos | Botão para atualizar somente os próprios dados, contador não lido, leitura em lote e ações com feedback |
| Cadastro e login | Confirmação de senha, mostrar/ocultar senha, validação estrita, bcrypt, limite de tentativas, JWT HS256 e expiração |
| Perfil | Edição real de nome/e-mail; sessão atualizada; conflito concorrente de e-mail tratado como 409 |
| Pagamentos | Tabela, busca, filtro mensal e CSV com centavos e proteção contra fórmulas de planilha |
| Demonstração | Comando idempotente prepara usuário dedicado e dados fictícios úteis sem tocar em contas pessoais |
| CI | Workflow de PR/push com Node 24, instalações reproduzíveis por lockfile e PostgreSQL descartável |

## Teste como usuário no navegador

O roteiro [user-flow.cjs](../frontend/tests/browser/user-flow.cjs) exerceu:

1. Cadastro com confirmação divergente bloqueada, depois cadastro válido e login JWT.
2. Painel vazio, criação de conta de R$ 100 vencida há 30 dias e outra de R$ 120 a vencer.
3. Busca de conta com estado vazio e recuperação da lista.
4. Job real repetido sem duplicar aviso; resumo semanal persistido.
5. Leitura de mensagem preservada após reload.
6. Pagamento parcial de R$ 40, saldo de R$ 60 e histórico real.
7. Consulta real de Selic e juros calculados somente sobre o saldo pendente.
8. Renderização adicional de resposta simulada em cenário separado: 15% a.a.,
   R$ 0,74 de juros e R$ 60,74 estimados — sem usar esses valores como fallback real.
9. Download CSV real, leitura do arquivo e conferência do valor R$ 40,00.
10. Edição de perfil e consulta de confirmação ao backend.
11. Dashboard com R$ 180 pendentes e R$ 40 pagos, gráfico e tabela acessível.
12. Navegação em 1440px, 390px e 320px sem overflow horizontal.
13. Cadastro recorrente com mensalidade seguinte criada antes de qualquer pagamento.
14. Pausa, retomada e sincronização sem duplicar competências.
15. Atualização de avisos e leitura em lote zerando o contador no banco.
16. Segundo usuário sem acesso às contas ou mensagens do primeiro.
17. Logout e bloqueio da rota protegida. Nenhum erro JavaScript no fluxo final.

As 32 verificações incluem os controles intermediários e oito auditorias
automáticas. Não equivalem a uma certificação completa de acessibilidade.

## Fontes externas: observação real

A disponibilidade da BrasilAPI variou durante a sessão: houve HTTP 500 e depois
HTTP 200 com `{"nome":"SELIC","valor":13.75}`. A variação de caixa do nome foi
corrigida e coberta por regressão. O cliente direto da BrasilAPI retornou
`disponivel`, com taxa anual de 13,75% na verificação executada.

O fluxo no navegador também usou taxa real obtida do Banco Central e depois
reutilizada do cache, com fonte explícita. A verificação da aplicação local
demonstrativa exibiu a fonte BrasilAPI. Os resultados estruturados preservam
fonte, cache e corpo da consulta observada, sem tokens nem senhas.

O fallback usa **meta Selic**, não a taxa efetiva diária; a [série oficial SGS 432](https://dadosabertos.bcb.gov.br/dataset/432-taxa-de-juros---meta-selic-definida-pelo-copom)
é expressa em percentual ao ano. Nenhuma taxa fictícia é usada na aplicação.
Se as duas fontes falharem e não houver cache válido, a estimativa continua
honestamente indisponível. Juros permanecem demonstrativos e não alteram débitos.

## Segurança verificada

- CORS bloqueia origem desconhecida e permite a origem local configurada.
- Helmet/headers, ausência de `X-Powered-By`, `Cache-Control: no-store`.
- JSON inválido → 400; corpo acima de 16 KiB → 413; rota inexistente → 404 JSON.
- Tentativas repetidas de autenticação → 429; limite geral de API também configurado.
- Tokens com algoritmo diferente de HS256 são rejeitados.
- Senhas excedendo 72 bytes UTF-8 e campos extras de cadastro são rejeitados.
- Autorização por usuário coberta em endpoints e no fluxo real de segundo usuário.
- CSV neutraliza entradas iniciadas por operadores/fórmulas e escapa aspas.
- Credenciais demonstrativas ficam somente no `.env` local; o seed recusa produção.

Segurança não é uma garantia absoluta: não foram realizados pentest externo ou
validação de TLS/hospedagem. O escopo acordado é local. Rate limiting é por
processo/IP; múltiplas réplicas públicas exigem uma estratégia compartilhada.
Recuperação de senha por e-mail e cobrança contratual personalizável são futuras.

## Dados, migrações e limites

`20261025020000_apresentacao_resiliencia` adiciona `recorrencia_ativa`,
`taxas_referencia` e `execucoes_jobs`. Aplicada no banco local, no banco de testes
e no de navegador sem reset nem remoção de dados.

A previsão vai até o fim do próximo mês; alterações em um lançamento não mudam
retroativamente toda a série. Pausar mantém as competências já criadas.
A recuperação cobre sete dias e depende de um processo ser iniciado — nenhum
sistema local executa agendamentos com o computador desligado. Hospedagem remota
não foi contratada/configurada, conforme orientação do usuário.

## Evidências e uso

- [Resultado estruturado — 32 verificações](qa/results.json)
- [Validação da conta demonstrativa local](qa/demo.json)
- [Painel da demonstração](qa/saldo-plus-demo-dashboard.png)
- [Avisos da demonstração](qa/saldo-plus-demo-avisos.png)
- [Demonstração mobile](qa/saldo-plus-demo-mobile.png)
- [Painel QA](qa/saldo-plus-dashboard.png)
- [Avisos QA](qa/saldo-plus-avisos.png)
- [Cadastro](qa/saldo-plus-cadastro.png)

Abrir `http://localhost:5174`. A conta demonstrativa utiliza `DEMO_EMAIL` e
`DEMO_PASSWORD` do `backend/.env`. Para prepará-la novamente, execute
`npm run demo` no backend; não há exclusão/reset automático.

Para reexecutar as suítes: `npm ci`, `npm run build` e `npm test` em cada pacote,
com `RUN_DATABASE_TESTS=1` e `DATABASE_URL` apontando para PostgreSQL exclusivo
nos testes backend. O roteiro de Chrome e suas variáveis estão documentados
no [relatório anterior](relatorio-validacao-saldo-plus.md#reproduzir-o-teste-no-navegador).
