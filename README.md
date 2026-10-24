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
ser repetido com a **mesma chave**. Nenhum módulo de jobs/avisos foi alterado.

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
Os testes de serviços usam Prisma simulado; a validação transacional completa
contra PostgreSQL deve ser executada com o cliente Prisma gerado.

### Resultado nesta sessão

Download verificado do Prisma bloqueado pela política de rede em
`binaries.prisma.sh`; isso impede geração do cliente, validação completa do
backend e testes integrados com Prisma. API do GitHub em `api.github.com` também
bloqueada. Os dois domínios foram solicitados no rascunho de configuração do
ambiente; salvar o rascunho não aplica a política à máquina atual. Não há merge
nem deploy autorizado. Consulte o relatório da PR para os checks executados.
