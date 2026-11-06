# Saldo+ — execução completa com Docker Compose

O Compose inicia **PostgreSQL 15, API Node.js 24 e aplicação web React
compilada e servida pelo Nginx**. Não é necessário executar Node ou Prisma
manualmente no Windows.

## Primeira execução (PowerShell)

Na raiz do repositório:

```powershell
git checkout develop
git pull origin develop

if (!(Test-Path .\backend\.env)) {
    Copy-Item .\backend\.env.example .\backend\.env
}
notepad .\backend\.env
```

No arquivo `backend/.env`, defina uma `JWT_SECRET` aleatória com pelo
menos 32 caracteres. Gere-a com:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Mantenha a chave somente no arquivo local: ela não deve ser publicada.
Como uma chave anterior já foi compartilhada numa conversa, gere uma nova.
O `DATABASE_URL` nesse arquivo pode continuar com `localhost:5432`
para execução manual: **o Compose a substitui por `db:5432` dentro do
backend container**. A porta 5432 **não é publicada no Windows** no modo Docker completo:
PostgreSQL fica acessível apenas na rede interna do Compose. Isso evita
conflitos com uma instalação local do PostgreSQL.

```powershell
docker compose up -d --build --wait
docker compose ps
```

Acesse:

- Site: http://localhost:5174
- Health check pelo site: http://localhost:5174/api/health
- API direta, para diagnóstico local: http://localhost:3000/api/health

Os containers aguardam o banco ficar saudável. O backend executa
`prisma migrate deploy` antes de iniciar a API e, por sua vez, o
frontend só é iniciado quando a API estiver saudável. O frontend usa
`/api` com proxy interno do Nginx: o navegador **não deve** tentar
acessar `http://backend:3000`.

## Diagnóstico

```powershell
docker compose ps
docker compose logs -f --tail=100 backend
docker compose logs -f --tail=100 frontend
docker compose logs -f --tail=100 db
```

Se `backend` não iniciar, confirme a existência de `backend/.env`
e que `JWT_SECRET` não seja a chave de exemplo. Quando um container
usar `NODE_ENV=production`, o backend exige chave forte de pelo menos
32 caracteres. Se a porta `3000` ou `5174` já estiver em uso por um serviço no Windows,
pare o serviço concorrente antes de iniciar a stack. A porta `5432` não
é publicada no modo Docker completo.

Não instale Prisma 8 por fora. O projeto usa a versão 6 do lockfile
e executa a CLI dentro do container. Se modificar o código, reconstrua
as imagens com `docker compose up -d --build --wait`.

## Dados persistentes e desligamento

```powershell
docker compose down
```

A remoção dos containers **não remove os dados** do volume
`postgres_data`. Evite `docker compose down -v` pois isso apagaria
o volume do PostgreSQL. Para diagnosticar migrações, inspecione os logs
do backend antes de reiniciar ou remover qualquer volume.

## Demonstração acadêmica

O seed demonstrativo `npm run demo` exige `NODE_ENV` diferente de
`production`, para evitar criação acidental de dados de teste em
ambientes publicados. **Somente na máquina local da apresentação**,
preencha `DEMO_EMAIL` e `DEMO_PASSWORD` no `backend/.env` e execute:

```powershell
docker compose run --rm -e NODE_ENV=development backend npm run demo
```

Esse comando é opcional: pode fazer login com uma conta previamente
cadastrada. Não use essa substituição de ambiente num deploy público.

## Alternativa: rodar Node.js no Windows

O [README principal](../README.md) contém o modo de execução manual.
Para expor **apenas o banco** à máquina anfitriã sem ocupar a porta 5432,
use na raiz:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev-db.yml up -d db
```

Nesse modo, no `backend/.env` configure a `DATABASE_URL` para
`localhost:55433`, e inicie `npm run dev` no backend (porta 3000)
e no frontend (porta 5174). O arquivo opcional
`docker-compose.dev-db.yml` não é usado quando se inicia tudo pelo Docker.
Não execute frontend/backend manuais junto com os containers completos.

## Validação automática

O workflow `.github/workflows/ci.yml` inclui o job `docker-smoke`
que constrói as imagens, aguarda os três health checks e verifica
HTTP no frontend, API direta e API pelo proxy. Ele usa um `.env`
descartável gerado no runner e não acessa o banco local.

## Dois computadores e Git

Cada computador tem seu próprio `backend/.env` (não versionado), suas
próprias imagens e volume do banco. Um `git pull origin develop` atualiza
o **código**, mas não copia contas, pagamentos, usuários nem senhas.
Mantenha a mesma chave JWT apenas enquanto precisar preservar sessões
naquela máquina. Se uma chave foi enviada ao GitHub, substitua-a por
uma nova e reinicie os containers; não versione a chave no `.env.example`.

Antes da apresentação, faça o ensaio com o banco e a conta de demonstração
do computador que será usado na faculdade.
