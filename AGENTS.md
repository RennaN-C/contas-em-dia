# AGENTS.md

Este arquivo é a referência curta para pessoas e IAs que desenvolverem o ContasEmDia.

## Objetivo
Controlar contas recorrentes e avulsas, pagamentos e vencimentos. O sistema deverá gerar avisos 3 dias antes, na véspera e no dia do vencimento, além de resumo semanal e estimativa de juros de atraso com dados da BrasilAPI.

## Stack fixa
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Banco: PostgreSQL
- ORM: Prisma
- Validação: Zod
- Agendamentos: node-cron

Não substituir a stack nem criar uma arquitetura paralela sem decisão do grupo.

## Estrutura obrigatória
```text
contas-em-dia/
├── frontend/
│   └── src/
│       ├── components/
│       ├── features/
│       │   ├── auth/
│       │   ├── accounts/
│       │   ├── payments/
│       │   ├── notifications/
│       │   └── messages/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       ├── styles/
│       └── types/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── integrations/
│   │   │   └── brasil-api/
│   │   ├── jobs/
│   │   ├── lib/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── accounts/
│   │   │   ├── payments/
│   │   │   ├── notifications/
│   │   │   └── messages/
│   │   └── routes/
│   └── tests/
├── docker-compose.yml
├── README.md
└── AGENTS.md
```

Cada módulo do backend concentra sua própria rota, controller, service e schema/validação quando esses arquivos forem necessários. Não criar pastas globais duplicadas como `controllers/` ou `services/`.

## Responsabilidades iniciais

### Marlon — Desenvolvedor 1
- Usuários e autenticação.
- `backend/src/modules/auth/`
- `backend/src/modules/users/`
- `frontend/src/features/auth/`
- Base compartilhada do frontend quando necessária.

### Marcelo — Desenvolvedor 2
- Contas, recorrência e pagamentos.
- `backend/src/modules/accounts/`
- `backend/src/modules/payments/`
- `frontend/src/features/accounts/`
- `frontend/src/features/payments/`

### Rennan — Desenvolvedor 3
- Avisos, mensagens, agendamentos e BrasilAPI.
- `backend/src/modules/notifications/`
- `backend/src/modules/messages/`
- `backend/src/jobs/`
- `backend/src/integrations/brasil-api/`
- `frontend/src/features/notifications/`
- `frontend/src/features/messages/`
- Integração geral e infraestrutura quando necessário.

Responsabilidade indica o dono inicial do domínio, não exclusividade. Alterações compartilhadas devem evitar quebrar trabalho dos outros desenvolvedores.

## Regras para desenvolvimento e IA
1. Antes de criar arquivos, respeitar a estrutura acima e reutilizar módulos existentes.
2. O frontend nunca acessa PostgreSQL ou BrasilAPI diretamente; passa pela API do backend.
3. Acesso ao banco fica centralizado pelo Prisma em `backend/src/lib/prisma.ts`.
4. Segredos ficam apenas em `.env`; versionar somente `.env.example`.
5. Implementar regra de negócio em services do próprio módulo, não em componentes React nem em arquivos de rota.
6. Novas funcionalidades devem vir com testes relevantes.
7. Commits em português usando Conventional Commits, por exemplo: `feat: adiciona cadastro de contas`.
8. Não adicionar bibliotecas ou novas camadas arquiteturais sem necessidade real.
