# ContasEmDia

Sistema de finanças pessoais para cadastro de contas recorrentes e avulsas, controle de vencimentos, pagamentos, avisos automáticos e estimativa de juros de atraso com integração à BrasilAPI.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Banco de dados: PostgreSQL
- ORM: Prisma
- Validação: Zod
- Agendamentos: node-cron
- Testes: Vitest + Supertest
- Ambiente local: Docker Compose

## Equipe

- Marlon — Desenvolvedor 1
- Marcelo — Desenvolvedor 2
- Rennan — Desenvolvedor 3

A divisão de responsabilidades e a estrutura obrigatória do projeto estão em [AGENTS.md](./AGENTS.md).

## Execução local

1. Copie `backend/.env.example` para `backend/.env` e `frontend/.env.example` para `frontend/.env`.
2. Execute `docker compose up -d db`.
3. Instale as dependências com `npm install` em `backend/` e `frontend/`.
4. No backend, execute `npx prisma migrate dev` e depois `npm run dev`.
5. No frontend, execute `npm run dev`.

## Contas e pagamentos (Marcelo — #10–#21)

Todas as rotas abaixo exigem `Authorization: Bearer <token>` obtido no login.
O proprietário é extraído do JWT; campos adicionais, inclusive `usuarioId` e
`status`, são rejeitados. IDs devem ser UUIDs. Recursos alheios retornam 404.

| Método | Rota | Resultado |
| --- | --- | --- |
| POST | `/api/accounts` | Cria conta (201), `{ account }` |
| GET | `/api/accounts?status=PENDENTE` | `{ accounts }`, vencimento crescente, desempate por ID |
| GET | `/api/accounts/:id` | `{ account }`, pagamentos e saldo |
| PUT | `/api/accounts/:id` | Substitui campos editáveis, `{ account }` |
| DELETE | `/api/accounts/:id` | 200, confirmação JSON; 409 se houver pagamentos ou série iniciada |
| POST | `/api/accounts/:id/payments` | 201, `{ payment }` |
| GET | `/api/payments?contaId=UUID` | `{ payments }`, data decrescente, criação decrescente e ID crescente |

Cadastro/edição: `{ "descricao": "Aluguel", "valor": 1000.50,
"vencimento": "2026-10-31", "tipo": "RECORRENTE", "recorrencia": "MENSAL" }`.
Para `AVULSA`, envie recorrência nula. Valores positivos com até duas casas;
limite de 200 caracteres na descrição. Datas civis são `AAAA-MM-DD`, interpretadas
em UTC. O dia do vencimento inteiro permanece pendente; atraso começa no dia
seguinte em UTC. `status` é calculado no backend a cada leitura: total pago
igual ao valor resulta em PAGA, independentemente da data. Pagamentos parciais
mantêm PENDENTE/ATRASADA pelo vencimento. Filtros aceitam PENDENTE/PAGA/ATRASADA.

Pagamento: `{ "valor": 250.25, "pagoEm": "2026-10-23", "chave": "UUID" }`.
A chave de idempotência é obrigatória: repetir a mesma chave e conteúdo retorna
o pagamento existente; conteúdo diferente retorna 409. Não reutilize uma chave
para outra operação. O frontend mantém a chave durante tentativas do mesmo envio.
Datas futuras, valores não positivos e pagamentos acima do saldo são rejeitados.

A próxima competência mensal é criada **na quitação integral**, na mesma
transação do pagamento, nunca por leitura nem por job. Uma origem possui no
máximo um próximo lançamento (índice único). O dia original é preservado:
31/jan → 28 ou 29/fev → 31/mar. Cada lançamento tem seus próprios pagamentos;
quitar o próximo gera mais um mês. Edições não propagam retroativamente.
Vencimento/tipo de séries iniciadas ficam protegidos; contas quitadas recorrentes
não podem ser editadas. Contas com pagamentos não são excluídas, preservando o
histórico. Exclusão de avulsas sem pagamentos utiliza as relações já existentes
para remover avisos associados. Transações serializáveis e bloqueio de linha
serializam pagamentos/edições/exclusões; conflito concorrente retorna 409 e pode
ser repetido com a **mesma chave**.

### Instalação, banco e validação

Use Node 24 (ou versão compatível com Vite 7) e PostgreSQL 15. Instale com
`npm install` em cada pacote (o repositório ainda não versiona lockfiles).
Copie os `.env.example` apenas se o `.env` não existir; use uma chave JWT própria.
Execute `docker compose up -d db`. Em `backend/`, execute:

```sh
npx prisma generate
npx prisma migrate deploy
npm test
npm run build
npm run dev
```

Há uma migração inicial do schema anterior e uma migração aditiva para origem,
dia âncora e idempotência. **Banco já criado com `db push`:** faça backup e confirme
que corresponde exatamente ao schema anterior antes de marcar a migração inicial
como aplicada com `npx prisma migrate resolve --applied 20261024010000_inicial`;
só então use `migrate deploy`. Não execute a migração inicial sobre tabelas
existentes nem use reset/accept-data-loss. A migração aditiva preserva registros
antigos com novos campos nulos. Bancos vazios aplicam ambas normalmente.

Em `frontend/`: `npm test`, `npm run build`, `npm run dev`.
O TypeScript do Vite usa `noEmit` para compatibilidade com
`allowImportingTsExtensions`. Contas e pagamentos estão disponíveis na navegação
existente, com filtros, confirmação de exclusão, validações e estados de rede.
Os testes de serviços usam Prisma simulado. A suíte integrada usa PostgreSQL real,
limpa somente os usuários/contas que ela própria criou e requer banco de testes
separado, já migrado:

```sh
RUN_DATABASE_TESTS=1 DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/BANCO_TESTE?schema=public" npm test
```

Sem `RUN_DATABASE_TESTS=1`, os testes integrados são explicitamente ignorados.
As migrações foram aplicadas com `prisma migrate deploy` num banco isolado; a
suíte integrada verifica autorização, CRUD, pagamentos parciais, recorrência,
idempotência, relacionamentos e concorrência. Geração do cliente, builds e
validações completas foram executadas nesta sessão. Downloads exigem acesso a
`binaries.prisma.sh`; operações da PR usam `api.github.com`. Nenhum merge ou
deploy foi realizado.

## Avisos, mensagens e BrasilAPI (Rennan — #22–#32)

A central `/avisos` usa o layout autenticado e o cliente HTTP existentes. Exibe
mensagens lidas/não lidas, avisos com referência à conta, resumos semanais
persistidos, a previsão atual dos próximos sete dias e juros demonstrativos.
Consultas independentes têm loading, vazio, erro e nova tentativa; falha na
consulta da Selic mantém as mensagens e o resumo disponíveis.

### Endpoints autenticados

Todas as rotas exigem o JWT existente. O usuário vem exclusivamente do token.
Não existem endpoints HTTP para disparar jobs ou criar mensagens arbitrárias.

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/api/notifications` | `{ notifications }`, avisos das contas do usuário, data decrescente |
| GET | `/api/messages` | `{ messages }`, criação decrescente; inclui `conta` quando aplicável |
| PATCH | `/api/messages/:id/read` | `{ message }`, persiste `lida: true`; repetir é seguro |
| GET | `/api/notifications/weekly-summary` | `{ summary: { inicio, fimExclusivo, accounts, total } }` |
| GET | `/api/notifications/interest-estimates` | `{ aviso, estimates }`, apenas contas atrasadas com saldo |

Leitura de mensagem alheia ou inexistente retorna 404; UUID inválido retorna 400.
Mensagens contêm `tipo` (`AVISO` ou `RESUMO_SEMANAL`), `titulo`, `conteudo`,
`criadoEm`, `lida`, `contaId` e a referência `conta`. Registros anteriores à
migração continuam disponíveis. Excluir conta preserva mensagens com a
referência nula, enquanto os avisos seguem a exclusão em cascata existente.

### Datas, agendamentos e recuperação

O cron inicia somente em `src/server.ts`, após a API começar a escutar, e fica
desativado em testes (`NODE_ENV=test` ou `VITEST`). Importar `app.ts` não agenda
tarefas. Execute `npm run dev` ou `npm run build` seguido de `npm start` no backend.

| Job | Expressão node-cron | Timezone | Horário em America/Sao_Paulo (UTC−3) |
| --- | --- | --- | --- |
| Avisos diários | `0 9 * * *` | `UTC` | Todos os dias, 06:00 |
| Resumo semanal | `5 9 * * 1` | `UTC` | Segunda-feira, 06:05 |

Regras usam datas civis **UTC**, como contas/pagamentos: avisos nos dias D−3,
D−1 e D, sem depender do timezone do host. Dia inteiro do vencimento não conta
como atraso. Resumo consulta `[hoje UTC, hoje UTC + 7 dias)`, incluindo hoje e
mais seis datas; exclui contas integralmente pagas. Exibe saldo pendente,
descrição e vencimento de cada conta. A semana da chave de idempotência começa
na segunda-feira UTC; uma reexecução na mesma semana preserva o primeiro resumo.
Uma mensagem vazia informa quando não há contas elegíveis.

Saldo é calculado dos pagamentos, reutilizando as funções de contas, sem confiar
em `status` persistido. Cada aviso e sua mensagem são gravados na mesma transação.
O índice único `(conta_id, tipo, agendado_para)` e `mensagens.chave` única,
com inserções `skipDuplicates`, impedem duplicidade entre processos. Locks de
conta coordenam com pagamentos/edições existentes, e o job relê os pagamentos
depois do lock. Resumos também bloqueiam o usuário e suas contas em ordem estável.
Transações repetem até três tentativas em conflito transitório/deadlock.
`noOverlap` impede sobreposição no processo; restrições do PostgreSQL cobrem
múltiplas instâncias. Falhas individuais não impedem o processamento dos demais
itens; são agregadas e registradas sem encerrar a API.

O node-cron precisa do processo ativo e não recupera automaticamente horários
perdidos. Para recuperar ou repetir uma execução, use no backend (com `.env`
configurado) os comandos abaixo; omitir a data usa o dia UTC atual:

```sh
npm run job:daily -- 2026-10-25
npm run job:weekly -- 2026-10-26
```

Repetir a mesma data não duplica mensagens. O comando encerra com código 1 se
houver falha, permitindo uma nova tentativa operacional. Não altera recorrência
nem cria competências futuras: isso continua sendo responsabilidade da quitação.

### Selic e fórmula demonstrativa

Somente o backend consulta
[`GET https://brasilapi.com.br/api/taxas/v1/Selic`](https://brasilapi.com.br/docs#tag/Taxas),
em cliente isolado. O contrato validado por Zod é `{ nome: "Selic", valor: number }`,
com taxa finita e não negativa. Timeout de 5 segundos cobre conexão e leitura
do JSON; HTTP não OK, JSON/contrato inválido, timeout e erro de rede retornam
`status: "indisponivel"`. Nesse estado, cada estimativa mantém saldo e dias,
mas **omite taxa, juros e total**, sem inventar uma taxa alternativa.
Consulta uma vez por requisição de estimativas e somente se houver atraso.

```text
saldo = max(0, valor da conta − soma dos pagamentos)
dias = max(0, data civil UTC atual − data civil UTC de vencimento)
juros = arredondar_centavos(saldo × (Selic anual / 100) × dias / 365)
valorEstimado = saldo + juros
```

São juros **simples**, com a Selic anual atual aplicada proporcionalmente a dias
corridos, base fixa de 365 dias inclusive em ano bissexto. O cálculo utiliza
`Prisma.Decimal` e arredondamento monetário `ROUND_HALF_UP`; saldos/pagamentos
mantêm a precisão em centavos do módulo existente. Exemplo com **taxa fictícia de
teste**: conta de R$ 100,00, R$ 40,00 pagos, 30 dias e 15% a.a. gera R$ 0,74
de juros e R$ 60,74 estimados. Não calcula juros sobre valores já pagos;
quitadas ou sem atraso não aparecem na lista e não recebem juros.

**É uma estimativa demonstrativa, não cobrança contratual.** Não considera
histórico diário da Selic, multas, taxas contratadas ou períodos anteriores aos
pagamentos. O cálculo não grava juros nem altera contas, valores ou pagamentos.

### Migração e testes

Aplicar `npx prisma generate` e `npx prisma migrate deploy` no backend.
`20261025010000_avisos_mensagens` adiciona tipo/índice único aos avisos e
tipo/chave/referência opcional às mensagens. Nenhuma tabela/coluna é removida.
Avisos legados recebem tipo conforme os dias; eventuais duplicatas históricas
são preservadas com tipo `LEGADO_<id>` para permitir o novo índice sem perda.
Novas mensagens de avisos usam `aviso:<id>`; resumos usam
`semana:<usuarioId>:<segunda-feira UTC>` como chave única.

Os testes de BrasilAPI usam mocks, nunca a rede real. As suítes cobrem 3/1/0
dias, limites UTC/ano bissexto, status desatualizado, pagamentos parciais,
autorização, idempotência, concorrência, rollback, recuperação, resumos,
juros e indisponibilidade/timeout/contrato inválido. A suíte frontend cobre
consultas, filtros, leitura, feedback, retries e falhas independentes.

Para PostgreSQL isolado no PowerShell, sem tocar no banco de desenvolvimento:

```powershell
docker run --name contas-rennan-tests -e POSTGRES_USER=teste -e POSTGRES_PASSWORD=teste_local -e POSTGRES_DB=contas_rennan_test -p 55432:5432 -d postgres:15-alpine
cd backend
$env:DATABASE_URL='postgresql://teste:teste_local@localhost:55432/contas_rennan_test'
$env:JWT_SECRET='chave-exclusiva-para-testes-locais'
$env:RUN_DATABASE_TESTS='1'
npx prisma generate
npx prisma migrate deploy
npm run build
npm test
cd ../frontend
npm run build
npm test
```

As variáveis desses comandos são somente para teste. As suítes integradas
removem apenas seus próprios usuários e registros, e não devem rodar no banco
de desenvolvimento/produção. Não dependem da disponibilidade da BrasilAPI.
