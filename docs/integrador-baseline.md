# Baseline do Integrador — 06/11/2026

- Branch original: `marlon`, commit `0a5bb22`, árvore limpa.
- Fetch realizado. `origin/main` em `787c6eb` (1.0.1) é ancestral do HEAD; três commits adicionais preservados. Diferença funcional: somente exemplo de JWT. Branch de trabalho: `feat/integrador-discord`.
- `origin/develop` em `b9d5e2f` possui funcionalidades anteriores à main. Base proposta da PR: main.
- Já existem autenticação, perfil, preferências, contas avulsas/recorrentes, pagamentos parciais/integrais idempotentes, histórico, relatórios, calendário, avisos D−3/D−1/D, resumo semanal, mensagens internas, BrasilAPI com fallback BCB, Compose e CI com PostgreSQL e smoke.
- Antes das alterações: backend 209 aprovados / 54 ignorados (integrações condicionais); frontend 124 aprovados. Integrações serão executadas em banco Docker isolado, sem tocar nos volumes existentes.
- Issues #39–#46 consultadas no GitHub. #39 schema, #40 opt-in, #41 webhook, #42 outbox, #43 nuvem, #44 lint/CI, #45 documentação, #46 monitoramento. Referências a Telegram serão interpretadas como Discord conforme decisão explícita da equipe.
- Releases `1.0.0` e `1.0.1` preservadas. Nenhuma tag `aula-*` encontrada. Divergência com `v1.0.0` registrada; sem recriar tags ou inventar histórico.
- Documento `Temas-Projeto-Integrador-APIs.docx` não está no checkout. Os critérios do pedido e das issues serão a referência disponível; aceite integral do documento depende de acesso a ele.
- Nenhum código do bot existente foi encontrado no checkout. Seu modo atual (Gateway/HTTP), application ID e comandos instalados dependem da equipe; nenhum bot será criado nem configuração externa alterada automaticamente.
- Frontend tinha node_modules Vitest 3.2.7 apesar do lock declarar 4.1.12; executar npm ci antes da validação final.

## Adendo após nova instrução da equipe

A decisão inicial de reaproveitar o bot foi substituída explicitamente pelo usuário: **novo SaldoPlusBot exclusivo**, preservando o bot da aula. O documento acadêmico foi posteriormente entregue como `Temas-Projeto-Integrador-APIs (2).docx` (SHA-256 `4CDBF83D2DB9D988860FF6AA8CF5944B18937101F02672DEFA34242500717DD0`) e lido diretamente, inclusive Anexos A e B. A implementação e a matriz de conformidade seguem essa decisão final e o documento recebido. O arquivo de referência do usuário não foi modificado nem incluído automaticamente no Git.
