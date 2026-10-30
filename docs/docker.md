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
backend container**. A porta 5432 do Windows fica acessível apenas em
`127.0.0.1`.

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
32 caracteres. Se a porta `5432`, `3000` ou `5174` já estiver em
uso por um serviço instalado no Windows, pare o serviço concorrente
antes de iniciar a stack.

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

O [README principal](../README.md) também contém a execução manual
com `docker compose up -d db` e `npm run dev` no backend/frontend.
Esse modo usa as portas `3000`, `5174` e `5432` diretamente no host.
Não inicie os dois modos ao mesmo tempo: as portas entrarão em conflito.

## Validação automática

O workflow `.github/workflows/ci.yml` inclui o job `docker-smoke`
que constrói as imagens, aguarda os três health checks e verifica
HTTP no frontend, API direta e API pelo proxy. Ele usa um `.env`
descartável gerado no runner e não acessa o banco local.
