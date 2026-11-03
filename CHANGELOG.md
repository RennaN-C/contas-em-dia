# Histórico de versões

## Não lançado

### Correções

- Codifica identificadores recebidos da API antes de compor URLs dos testes.
- Restringe as requisições dos testes às rotas e UUIDs previstos e rejeita redirecionamentos, com casos de regressão para caminhos inválidos.
- Usa caminho absoluto para executar Docker nos scripts de validação.
- Define explicitamente os botões de envio dos formulários e associa rótulos e descrições às preferências.
- Substitui foco automático global por foco controlado dentro dos modais.
- Oferece botões nativos para rolar tabelas por teclado, mantendo o layout de impressão.
- Remove funções `async` sem operação `await` e trata a rejeição do teste de navegador.
- Acrescenta testes de regressão para foco, rótulos e rolagem sem envio acidental de formulário.

## 1.0.0 — 2026-11-02

Primeira versão estável do Saldo +.

### Funcionalidades

- Cadastro, autenticação e edição de perfil com dados isolados por usuário.
- Contas avulsas e recorrentes, categorias, filtros combinados e exportação CSV.
- Calendário mensal com vencimentos, status, filtro por categoria e detalhes das contas.
- Pagamentos parciais e totais, encargos automáticos com revisão, histórico e idempotência.
- Avisos três dias antes, na véspera e no vencimento, resumo semanal e atualização imediata.
- Integração BrasilAPI/Selic com cache e fallback para estimativas de juros de atraso.
- Painel financeiro e relatório mensal com gráficos por categoria e impressão/PDF.
- Histórico de cadastros, edições, pagamentos, exclusões e alterações de recorrência.
- Perfil com resumo financeiro, atividades e exportação dos próprios dados em JSON.
- Preferências persistidas de ordenação, categoria/tipo padrão, revisão de pagamentos,
  movimento reduzido, início da semana e detalhamento do relatório.

### Execução e preservação dos dados

- Inicialização completa com `docker compose up -d --build --wait`.
- Banco, migrações, API e frontend iniciam automaticamente, sem preparar `.env`.
- Chave JWT gerada e preservada em volume; dados existentes mantidos pelas migrações.
- API com prontidão do PostgreSQL, usuário sem privilégios de root e encerramento controlado.

### Validação

- 384 testes distintos passaram na preparação desta versão: 263 do backend e 121 do frontend.
- Fluxos completos no Chrome em desktop/mobile, verificações automáticas de acessibilidade
  e geração real de PDF, conforme os relatórios em `docs/`.

### Observações

- Juros automáticos usam uma estimativa Selic; cobranças contratuais diferentes podem ser ajustadas.
- Relatórios usam saldo e categorias atuais; não constituem fechamento contábil histórico.
- Contas anteriores à migração recebem categoria Outras. Apenas fatos anteriores conhecidos
  são importados para o histórico, sem inventar edições ou pausas.
- A exportação JSON é para consulta; não há restauração automática por esse arquivo.
