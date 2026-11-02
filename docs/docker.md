# Saldo + — execução com Docker Compose

Requisitos: Docker Desktop aberto e Docker Compose 2.24 ou superior.
Na raiz do repositório:

```sh
docker compose up -d --build --wait
```

Acesse **http://localhost:5174** e cadastre seu usuário. Não é preciso instalar
Node, copiar `.env`, gerar chaves ou executar Prisma no computador.
`docker compose up` também constrói as imagens quando ainda não existem;
use `--build` para incorporar alterações no código.

## Inicialização automática

1. PostgreSQL inicia e passa pelo healthcheck.
2. O backend gera uma chave JWT aleatória de 256 bits na primeira execução,
   em `/app/runtime/.env`, no volume `runtime_config`.
3. Prisma aplica as migrações pendentes, sem apagar dados.
4. A API inicia os agendamentos e confirma conexão com o banco em `/api/ready`.
5. Nginx serve o frontend compilado e encaminha `/api` ao backend.

A chave é reutilizada ao reiniciar, reconstruir ou recriar containers,
preservando sessões ainda válidas. O backend executa como usuário `node`
e recebe sinais de encerramento para fechar o servidor e a conexão Prisma.
O Nginx resolve novamente o endereço do backend, permitindo sua recriação
sem precisar reiniciar o frontend.

## Endereços

| Serviço | Endereço |
| --- | --- |
| Aplicação | http://localhost:5174 |
| API via frontend | http://localhost:5174/api/health |
| Prontidão e banco | http://localhost:5174/api/ready |
| API direta para diagnóstico | http://localhost:3000/api/health |
| PostgreSQL interno | `db:5432`, sem porta exposta no computador |

As portas publicadas ficam restritas ao computador local. O Compose é destinado
à execução local e mantém as credenciais locais do banco para compatibilidade
com os volumes já existentes.

## Configuração opcional

O arquivo `backend/.env` é opcional no Docker. Se já existir, o Compose carrega
suas variáveis e mantém a chave JWT configurada pelo usuário. Uma chave fornecida
deve ser aleatória, com pelo menos 32 caracteres e diferente do exemplo;
o backend recusa configuração inválida em produção.

`DATABASE_URL`, `PORT`, `NODE_ENV`, `CORS_ORIGINS` e `TRUST_PROXY_HOPS` são definidos
pelo Compose para a rede local. O frontend usa `/api`; o navegador não acessa
`http://backend:3000` diretamente. O Nginx sobrescreve os cabeçalhos de IP e a
API confia no único proxy dessa configuração.

Para execução manual, os `.env.example` continuam disponíveis. O
[README](../README.md) explica Node local com o PostgreSQL no Docker.

## Dados e desligamento

```sh
docker compose down
docker compose up -d --wait
```

Os volumes `postgres_data` (dados) e `runtime_config` (chave de sessão gerada)
são preservados. **`docker compose down -v` apaga ambos.** Não o use para atualizar
ou corrigir o sistema. Para atualizar o código, execute novamente:

```sh
docker compose up -d --build --wait
```

## Diagnóstico

```sh
docker compose ps
docker compose logs -f --tail=100 backend
docker compose logs -f --tail=100 frontend
docker compose logs -f --tail=100 db
```

- **Docker indisponível:** abra o Docker Desktop e aguarde o engine iniciar.
- **Portas ocupadas:** pare processos que estejam usando 3000 ou 5174.
- **JWT inválida:** se houver `backend/.env`, substitua a chave de exemplo por
  uma aleatória. A geração automática é usada quando `JWT_SECRET` não foi fornecida.
- **Migração falhou:** consulte os logs. Não apague o volume para resolver falhas.
  Bancos anteriores criados com `db push` exigem o procedimento de baseline
  descrito no README.
- **Arquivo de chave corrompido:** o backend informa o erro e não troca a chave
  silenciosamente. Verifique o volume `runtime_config` ou forneça sua chave em `.env`.

## Demonstração opcional

Para preparar dados de apresentação, configure `DEMO_EMAIL` e `DEMO_PASSWORD`
no `backend/.env` e execute, somente no ambiente local:

```sh
docker compose run --rm -e NODE_ENV=development backend npm run demo
```

O comando preserva contas existentes e recusa usuários com senha diferente.
O sistema não cria uma conta de demonstração ou senha de acesso padrão ao iniciar.

## Verificação automatizada

O job `docker-smoke` do GitHub Actions inicia a stack com banco vazio **sem `.env`**.
Além dos healthchecks, executa `backend/tests/docker-smoke.mjs`, que valida
cadastro, login, conta, pagamento parcial com encargos, idempotência, reinicialização
e recriação do backend. Confirma que a sessão, o saldo e a chave persistem.

O script exige `COMPOSE_PROJECT_NAME` com prefixo `saldo-smoke-` para evitar
execução acidental em um projeto pessoal. Use sempre banco e volumes descartáveis.
O teste de navegador `frontend/tests/browser/financial-reports.cjs` valida filtros,
totais, CSV e paginação no Chrome, com verificações de acessibilidade em desktop/mobile;
exige ferramentas externas em `SALDO_QA_TOOLS` e URL isolada em `SALDO_UI_URL`.

## Mais de um computador

Cada computador tem seus próprios volumes e configuração. `git pull` atualiza
o código, sem transferir usuários, contas, pagamentos ou chaves de sessão.
Faça backup do PostgreSQL e preserve a configuração ao migrar dados entre máquinas.
