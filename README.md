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
