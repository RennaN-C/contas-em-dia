# Categorias, calendário, relatório e rastreabilidade

Entrega validada em 02/11/2026 sem trocar a stack e sem adicionar dependências.

## Funcionalidades

- Categorias fixas no cadastro, edição, cartões, CSV, filtros e gráficos.
  Contas existentes recebem Outras. Novas mensalidades herdam a categoria.
- Calendário mensal com estados textuais e visuais, filtro por categoria,
  seleção do dia e consulta dos detalhes, pagamentos e atividades.
- Relatório mensal com resumo, gastos pagos por categoria e tabelas opcionais.
  Impressão nativa e PDF com layout próprio, cabeçalhos de tabela repetidos e
  navegação oculta. Tabelas horizontais no celular aceitam foco e rolagem por teclado.
- Histórico somente de leitura, com antes/depois em edições e eventos de
  cadastro, pagamento, previsão de mensalidade e pausa/retomada de série.
  Eventos são gravados na transação da operação. Repetições de pagamentos,
  edições idênticas e pausas não criam eventos duplicados. A criação de cada
  competência tem chave única, inclusive para caminhos concorrentes.
- Exclusões permitidas preservam um evento com a descrição da conta; a
  referência é anulada pelo PostgreSQL. O perfil permite consultar esse rastro.
- Perfil com indicadores pessoais e download autenticado dos dados em JSON,
  sem hash de senha ou JWT. A exportação é para consulta, não restauração.
- Preferências por usuário para categoria padrão, domingo/segunda no calendário
  e detalhamento inicial do relatório.

## Critérios financeiros e preservação

Previsto e saldo selecionam contas pelo vencimento. Principal e encargos
selecionam pagamentos pela data em que foram pagos, mesmo quando pertencem
a contas de outros meses. O saldo e a classificação são os atuais; o relatório
explica que não é um fechamento histórico. Juros simulados não entram no total.

A migração `20261102020000_categorias_historico_relatorios` é aditiva. Importa
somente cadastros e pagamentos conhecidos. Não inventa edições ou pausas anteriores.
Na atualização local foram preservados os mesmos usuários, contas e pagamentos;
os registros legados receberam eventos identificados como anteriores ao histórico.

## Evidências de validação

- 263 testes distintos do backend passaram na sessão, incluindo 261 da suíte
  com PostgreSQL isolado e dois testes adicionais de snapshots do histórico.
- 121 testes do frontend passaram, incluindo filtros combinados, ano bissexto,
  navegação entre anos, seleção de dia, relatório, impressão, exportação e paginação.
- Builds TypeScript/Vite e imagens Docker passaram.
- Chrome em 1440 px e 390 px validou cadastro com categoria, edição, pagamento,
  histórico, pausa de série, preferências persistidas, calendário, relatório/PDF
  e exportação JSON. Não houve erros JavaScript ou overflow horizontal da página.
- Axe não apontou violações nas regras WCAG A/AA executadas para os estados
  exercitados. Isso não equivale a uma auditoria manual completa de acessibilidade.
- Foi gerado um PDF real com dados descartáveis e conferido o layout de impressão.
- Testes integrados validaram usuários distintos, mês inválido, pagamentos em
  mês diferente do vencimento, centavos, idempotência e preservação de eventos.

O teste de navegador é `frontend/tests/browser/planning-complete.cjs`. Usa
`COMPOSE_PROJECT_NAME=saldo-smoke-*`, `SALDO_UI_URL` de ambiente descartável e
ferramentas externas em `SALDO_QA_TOOLS`, conforme os demais testes de navegador.
As capturas e o PDF ficam nesse diretório externo, sem substituir imagens antigas.

## Roteiro de apresentação

1. Cadastre uma conta com categoria e vencimento daqui a três dias.
2. Mostre os filtros e a distribuição por categoria em Contas.
3. Registre um pagamento parcial e consulte Atividades para mostrar o rastro.
4. Abra o calendário, selecione o dia e consulte os detalhes da conta.
5. Abra Relatórios, escolha o mês e use Imprimir / Salvar PDF.
6. No Perfil, mostre o resumo, as atividades e a exportação dos próprios dados.
7. Em Configurações, altere a categoria padrão e o primeiro dia da semana;
   salve e demonstre o resultado no cadastro e no calendário.
8. Em Avisos, clique em Atualizar avisos para demonstrar o alerta imediato.
