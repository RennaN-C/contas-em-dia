# Relatórios financeiros e inicialização automática

Validação local em 02/11/2026, preservando React/Vite, Express, Prisma,
PostgreSQL, Zod e node-cron.

## Entrega

- Contas: filtros combinados por descrição sem acentos, status, mês civil e tipo.
- Resumo dos resultados: quantidade, saldo a pagar, principal em atraso e já pago.
- Pagamentos: quantidade, principal amortizado, encargos e desembolso total.
- Paginação de 12 registros; resumos e exportações abrangem todo o filtro.
- CSV de contas com datas e principal pago; CSVs neutralizam fórmulas de planilha.
- Docker sem preparação de `.env`: chave JWT gerada em volume persistente,
  migrações automáticas, prontidão com PostgreSQL e backend executando como `node`.
- Nginx com compressão, cache de assets e resolução do backend após recriação.
- CI passa a testar primeira execução sem `.env` e preservação da sessão.

## Resultados

| Verificação | Resultado |
| --- | --- |
| Backend com PostgreSQL real e banco isolado | 233 testes passaram, nenhum ignorado |
| Frontend | 96 testes passaram |
| Builds TypeScript e Vite | Passaram, inclusive nas imagens Docker |
| Stack principal | Banco, backend e frontend saudáveis |
| Stack isolada sem `.env`, com volumes vazios | Inicialização e migrações passaram |
| Fluxo HTTP via Nginx | Cadastro, login, conta e pagamento parcial com encargos passaram |
| Repetição da chave de pagamento | Um único pagamento persistido |
| Restart e recriação do backend | Chave, token válido, saldo e histórico preservados |
| Chrome desktop (1440 px) e mobile (390 px) | Filtros, totais, paginação e CSV passaram |
| Axe nas telas Contas e Pagamentos, desktop/mobile | Nenhuma violação nas regras WCAG 2 A/AA e 2.1 AA executadas |
| JavaScript e largura das páginas verificadas | Nenhum erro de página ou overflow horizontal |
| `docker compose config --quiet` e `git diff --check` | Passaram |

A verificação automática de acessibilidade cobre as telas e estados exercitados;
não substitui avaliação manual completa com tecnologias assistivas.
Nenhum teste integrado usou o banco pessoal: foi criado um projeto Compose
separado, com banco próprio e portas alternativas.

## Reprodução

Consulte [docker.md](docker.md) para iniciar a aplicação. Os testes locais usuais
continuam sendo `npm test` e `npm run build` em cada pacote. Os testes integrados
exigem `RUN_DATABASE_TESTS=1` e banco de testes previamente migrado.

O fluxo de primeira execução e reinicialização está em
`backend/tests/docker-smoke.mjs` e é executado pelo GitHub Actions.
O teste de navegador está em `frontend/tests/browser/financial-reports.cjs`:

```powershell
$env:COMPOSE_PROJECT_NAME='saldo-smoke-seu-projeto-descartavel'
$env:SALDO_QA_TOOLS='CAMINHO_DAS_FERRAMENTAS_EXTERNAS'
$env:SALDO_UI_URL='http://localhost:PORTA_DO_AMBIENTE_ISOLADO'
node frontend/tests/browser/financial-reports.cjs
```

As ferramentas externas são `playwright` e `@axe-core/playwright`, instaladas
fora do repositório, com Chrome disponível. Ao usar outra porta, configure
`CORS_ORIGINS` no override do ambiente isolado. As capturas são salvas em
`SALDO_QA_TOOLS`, sem substituir as imagens de validações anteriores.
