# Saldo +

Sistema de finanças pessoais para cadastro de contas recorrentes e avulsas, controle de vencimentos, pagamentos, avisos automáticos e estimativa de juros de atraso com integração à BrasilAPI.

O **Saldo +** inclui painel com indicadores financeiros, gráficos dos últimos
seis meses, distribuição de pagamentos e saldos, contas a acompanhar e central
de avisos. Gráficos usam dados reais da API e oferecem tabela de valores;
animações respeitam a preferência de movimento reduzido. A identidade visual
foi atualizada sem alterar a stack ou invalidar as sessões existentes.

Consulte o [relatório atual de juros, pagamentos e modais](docs/relatorio-pagamentos-modais.md)
para resultados, screenshots desktop/mobile e reprodução do fluxo no Chrome.

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
3. Instale as dependências com `npm ci` em `backend/` e `frontend/` (Node 24 recomendado).
4. No backend, execute `npx prisma generate`, `npx prisma migrate deploy` e depois `npm run dev`.
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
como marcadores UTC, sem alterar o dia informado. A data atual é determinada em
`America/Sao_Paulo`: atraso começa à meia-noite de Brasília do dia seguinte.
`status` é calculado no backend a cada leitura: total pago
igual ao valor resulta em PAGA, independentemente da data. Pagamentos parciais
mantêm PENDENTE/ATRASADA pelo vencimento. Filtros aceitam PENDENTE/PAGA/ATRASADA.

Pagamento: `{ "valor": 250.25, "pagoEm": "2026-10-23", "chave": "UUID" }`.
A chave de idempotência é obrigatória: repetir a mesma chave e conteúdo retorna
o pagamento existente; conteúdo diferente retorna 409. Não reutilize uma chave
para outra operação. O frontend mantém a chave durante tentativas do mesmo envio.
Datas futuras, valores não positivos e pagamentos acima do saldo são rejeitados.

A previsão recorrente é criada **sem depender do pagamento**, no cadastro e na
materialização diária/recuperação, até o fim do próximo mês. A quitação também
assegura o próximo lançamento se a série estiver ativa. O índice único de origem
evita duplicidade entre esses caminhos. O dia original é preservado:
31/jan → 28 ou 29/fev → 31/mar. Cada lançamento tem seus próprios pagamentos.
É possível pausar/retomar toda a série; pausar preserva os lançamentos e pagamentos
já existentes. Edições de valor/descrição afetam somente o lançamento editado.
Vencimento/tipo de séries iniciadas ficam protegidos; contas quitadas recorrentes
não podem ser editadas. Contas com pagamentos não são excluídas, preservando o
histórico. Exclusão de avulsas sem pagamentos utiliza as relações já existentes
para remover avisos associados. Transações serializáveis e bloqueio de linha
serializam pagamentos/edições/exclusões; conflito concorrente retorna 409 e pode
ser repetido com a **mesma chave**.

### Instalação, banco e validação

Use Node 24 (ou versão compatível com Vite 7) e PostgreSQL 15. Instale com
`npm ci` em cada pacote; lockfiles são versionados para reproduzir as instalações.
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
Não existem endpoints públicos para disparar jobs globais ou criar mensagens arbitrárias.
O botão de atualização processa somente os dados do usuário autenticado.

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/api/notifications` | `{ notifications }`, avisos das contas do usuário, data decrescente |
| GET | `/api/messages` | `{ messages }`, criação decrescente; inclui `conta` quando aplicável |
| PATCH | `/api/messages/:id/read` | `{ message }`, persiste `lida: true`; repetir é seguro |
| GET | `/api/notifications/weekly-summary` | `{ summary: { inicio, fimExclusivo, accounts, total } }` |
| GET | `/api/notifications/interest-estimates` | `{ aviso, estimates }`, apenas contas atrasadas com saldo |
| POST | `/api/notifications/refresh` | Atualiza previsões, avisos e resumo somente do usuário autenticado |
| GET | `/api/messages/summary` | `{ unread }`, contador de mensagens não lidas |
| PATCH | `/api/messages/read-all` | `{ updated }`, marca somente mensagens do usuário como lidas |
| POST | `/api/accounts/recurrences/sync` | `{ created }`, prevê competências do usuário até o próximo mês |
| PATCH | `/api/accounts/:id/recurrence` | Corpo `{ ativa: boolean }`, pausa/retoma a série inteira |
| GET | `/api/users/me/preferences` | Preferências de ordenação, revisão de pagamento e movimento reduzido |
| PUT | `/api/users/me/preferences` | Atualiza preferências somente do usuário autenticado |

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
| Avisos diários | `0 6 * * *` | `America/Sao_Paulo` | Todos os dias, 06:00 |
| Resumo semanal | `5 6 * * 1` | `America/Sao_Paulo` | Segunda-feira, 06:05 |
| Recuperação | `*/15 * * * *` | `America/Sao_Paulo` | Na inicialização e a cada 15 minutos |

Regras usam o calendário de **Brasília**, mantendo vencimentos/pagamentos como
marcadores UTC: avisos nos dias D−3, D−1 e D, sem depender do timezone do host.
Dia inteiro do vencimento não conta como atraso. Resumo consulta `[hoje, hoje + 7 dias)`, incluindo hoje e
mais seis datas; exclui contas integralmente pagas. Exibe saldo pendente,
descrição e vencimento de cada conta. A semana da chave de idempotência começa
na segunda-feira do calendário brasileiro; uma reexecução na mesma semana preserva o primeiro resumo.
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

O node-cron precisa do processo ativo. A recuperação persistida reprocessa hoje
e os sete dias anteriores pendentes ao iniciar e a cada 15 minutos; marcadores
são gravados somente após sucesso. Hoje e a semana atual são revisados para
incluir contas/usuários novos. Para recuperar ou repetir uma execução, use no
backend (com `.env`) os comandos abaixo; omitir a data usa o dia atual em Brasília:

```sh
npm run job:daily -- 2026-10-25
npm run job:weekly -- 2026-10-26
npm run job:recover
```

Repetir a mesma data não duplica mensagens. O comando encerra com código 1 se
houver falha, permitindo uma nova tentativa operacional. A recuperação e o job
diário também materializam recorrências ativas sem depender da quitação.

### Selic e fórmula demonstrativa

Somente o backend consulta
[`GET https://brasilapi.com.br/api/taxas/v1/Selic`](https://brasilapi.com.br/docs#tag/Taxas),
em cliente isolado. Zod aceita `nome` Selic/SELIC e valor numérico finito não
negativo. Se falhar, consulta a [meta Selic anual do Banco Central, série SGS 432](https://dadosabertos.bcb.gov.br/dataset/432-taxa-de-juros---meta-selic-definida-pelo-copom).
Cada fonte tem timeout de 5 segundos cobrindo resposta e corpo. O fallback
busca os últimos 14 dias e rejeita datas inválidas/futuras. A fonte é informada
na interface; meta Selic não é a taxa efetiva diária.

Taxas válidas ficam em cache PostgreSQL por uma hora, com fonte, referência e
data de consulta. Buscas simultâneas no processo compartilham a consulta. Se ambas
as fontes falharem, usa a última taxa válida de até sete dias **com aviso explícito
de desatualização**; depois desse prazo retorna `indisponivel`, mantendo saldo/dias
e omitindo taxa/juros/total. Não há taxa fictícia de fallback. Não consulta fontes
externas se não houver conta atrasada com saldo.

```text
saldo = max(0, valor da conta − soma dos pagamentos)
dias = max(0, data civil atual em Brasília − data civil de vencimento)
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

## Preparar uma apresentação local

Com o banco migrado, configure `DEMO_EMAIL` e `DEMO_PASSWORD` apenas no
`backend/.env` e execute `npm run demo` no backend. O comando prepara um usuário
dedicado com contas avulsas/recorrentes, pagamentos parciais, quitação, avisos e
resumo. Pode ser repetido sem apagar dados; recusa execução em produção e não
altera contas pessoais. Credenciais não são versionadas.

Para portas ocupadas, inicie o frontend com `npm run dev -- --port 5174` e
configure a porta do banco na `DATABASE_URL`. API e frontend devem estar
apontando para o mesmo ambiente. Nesta preparação local, o frontend está em
`http://localhost:5174`, API na porta 3000 e PostgreSQL na porta 55433.

## Segurança e qualidade

- Helmet, remoção de `X-Powered-By`, respostas sem cache de dados pessoais,
  corpo JSON limitado a 16 KiB e erros JSON sem stack para o cliente.
- CORS restrito a `CORS_ORIGINS`; não usar `*`. `TRUST_PROXY_HOPS` é 0 por
  padrão; somente configure o número exato de proxies controlados na hospedagem.
- Limite por IP: 30 falhas de autenticação a cada 15 minutos e 600 requisições
  de API por 15 minutos. Os limites são locais ao processo; não equivalem a
  proteção distribuída contra ataques em uma hospedagem com múltiplas réplicas.
- Senhas bcrypt, até 72 bytes UTF-8; confirmação no frontend, controle de
  visibilidade e validação estrita no backend. Tentativas com usuário inexistente
  também passam por bcrypt; erros de credenciais têm mensagem única.
- JWT HS256 explícito, novos tokens válidos por 8 horas e dados sempre filtrados
  pelo usuário do token. Em produção, segredo aleatório de pelo menos 32 caracteres
  é obrigatório; TLS deve ser fornecido pela hospedagem/proxy.
- Perfil pode ser editado; conflito concorrente de e-mail retorna 409. CSV de
  pagamentos exporta apenas dados autenticados e neutraliza fórmulas de planilha.
- Lockfiles versionados, `npm ci`, Vitest atualizado e auditoria npm nos dois
  pacotes. Nenhuma vulnerabilidade apontada na auditoria executada nesta revisão.
- GitHub Actions executa builds, testes, auditoria e migrações PostgreSQL em
  banco descartável a cada PR para `develop`/`main` e pushes nessas branches.

`20261025020000_apresentacao_resiliencia` adiciona somente estado de pausa da
recorrência, cache de taxa e marcadores de recuperação; não remove dados.

### Hospedagem futura

O escopo confirmado é a apresentação local. Para um provedor que suspende o
backend, configure um agendador independente para executar
`node dist/src/jobs/run.js recover` a cada 15 minutos, com a mesma `DATABASE_URL`.
A recuperação não consegue executar enquanto nenhum processo é iniciado e cobre
até sete dias de interrupção. Não existe endpoint administrativo público de cron.
Sem provedor configurado, não há validação de execução remota nem deploy nesta entrega.

Configuração de percentuais contratuais por conta e recuperação de senha por e-mail continuam
fora desta entrega. A simulação com Selic é demonstrativa e não cria cobranças.

## Pagamentos com juros visíveis e modais

Na página **Contas**, cada cartão atrasado apresenta dias de atraso, juros e
total estimados, taxa/fonte e estado de consulta. **Pagar**, **Editar** e
**Pagamentos** ficam alinhados; ações de série/exclusão são secundárias.
Cadastro, edição, pagamento, histórico e confirmação de exclusão abrem em modal
central com foco contido, Escape, bloqueio do fundo e retorno ao botão de origem.

Ao pagar, o modal mostra o principal e a estimativa de atraso. A preferência
padrão solicita revisão antes da gravação. O valor da simulação **não é somado
automaticamente ao débito nem ao pagamento**. Se foram cobrados juros/multa reais,
marque **Também paguei encargos** e informe o valor efetivamente pago.

`POST /api/accounts/:id/payments` aceita adicionalmente `encargos` opcional
(não negativo, até duas casas; padrão zero). `valor` continua sendo o principal
amortizado e não pode superar o saldo. O histórico, registro detalhado, CSV e
indicadores discriminam principal, encargos e total pago. A chave de idempotência
inclui o valor dos encargos na comparação do payload.

Após gravar, é possível **Consultar histórico** ou concluir. Em **Pagamentos**,
**Ver registro** abre os detalhes de cada pagamento. Trata-se do registro interno
do sistema; não há emissão de comprovante bancário.

Em **Configurações**, ordenação de contas, revisão antes de pagar e redução de
animações são persistidas por usuário. Moeda, calendário e critérios financeiros
são exibidos como referências. **Perfil** tem resumo pessoal e edição em modal;
o cadastro apresenta orientações de senha e confirmação.

Migração aditiva `20261025030000_preferencias_encargos`: acrescenta encargos
(zero nos pagamentos anteriores) e preferências por usuário, sem recalcular ou
remover histórico existente.
