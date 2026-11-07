# Relatório do Projeto Integrador — Saldo+

Tema 17 — ContasEmDia/Saldo+, finanças pessoais. Referência lida: `Temas-Projeto-Integrador-APIs (2).docx`, entregue no workspace, incluindo requisitos comuns e Anexos A/B. Decisão final: **novo bot exclusivo SaldoPlusBot**, sem alterar o bot da aula. Discord HTTP foi escolhido; Azure será usado em etapa futura. Não houve criação de aplicação, deploy, provisionamento, merge ou release.

## Base preservada

Branch `feat/integrador-discord`, criada de `0a5bb22` na antiga branch local `marlon`. `origin/main` (`787c6eb`, estável 1.0.1) é ancestral desse commit; os três commits adicionais, inclusive integração com develop, foram preservados. `origin/develop` estava em `b9d5e2f`, anterior às funcionalidades da main. Base da PR: **main**, para revisar sobre a versão estável completa. Auditoria original em [integrador-baseline.md](../integrador-baseline.md).

Já existiam autenticação JWT, perfil/preferências, contas avulsas/recorrentes, pagamentos parciais/integrais idempotentes, categorias, histórico, relatórios/calendário, avisos D−3/D−1/D, resumo semanal, mensagens internas, juros BrasilAPI com fallback BCB, Compose e CI. Nenhuma dessas funcionalidades foi removida.

Baseline inicial: backend 209 aprovados / 54 integrações ignoradas, frontend 124 aprovados. O Prisma Client local estava desatualizado; após generate, a execução PostgreSQL revelou timeout concorrente retornando 500. A espera para obter transação foi ampliada; expiração/conflito agora retorna 409 para repetição com a mesma chave, sem alterar cálculo financeiro.

## Implementação e arquivos

| Área | Implementação / arquivos principais |
|---|---|
| Schema | `backend/prisma/schema.prisma`, três migrations Discord descritas no guia de modelagem |
| REST/ambiente | `backend/src/app.ts`, `config/env.ts`, `routes/index.ts`, `.env.example` |
| Cliente e segurança | `backend/src/integrations/discord/{client,config,crypto,interactions,commands,manage}.ts` |
| Serviços | `backend/src/modules/messages/discord-*.ts`, `messages.service.ts`; aproveita os jobs/regras existentes |
| Worker | `backend/src/jobs/discord.ts`, `schedules.ts`; inbox/outbox PostgreSQL, DM, respostas privadas e confirmação |
| Frontend | `frontend/src/features/messages/DiscordConnection.tsx`, `pages/ProfilePage.tsx` |
| Métricas | `backend/src/lib/metrics.ts`, perfil `monitoring` no Compose, `docs/monitoring/` |
| Qualidade | ESLint de ambos projetos, package/lockfiles, `backend/tests/discord.*`, `metrics.test.ts`, `migrations.mjs`, `frontend/tests/discord.test.tsx`, CI |
| Ajustes de compatibilidade | Filtro de mensagens internas, contagem do perfil, mocks Prisma coerentes, timeout concorrente; escape redundante do CSV removido sem mudar a proteção |
| Preparação | `docs/azure/`, README, documentação Discord e override Compose para smoke isolado |

`git diff --name-only 0a5bb22...HEAD` fornece a lista exata versionada. O DOCX entregue pelo usuário permanece como arquivo de referência local; não é gerado nem alterado pela implementação.

## Testes e evidências disponíveis

| Validação | Resultado local |
|---|---|
| Backend completo com PostgreSQL real | **306 aprovados**, 32 arquivos, nenhuma integração ignorada na execução com RUN_DATABASE_TESTS=1 |
| Frontend completo | **129 aprovados**, 19 arquivos |
| Lint e builds TypeScript/Vite | Aprovados em ambos projetos |
| npm audit | Zero vulnerabilidades nos dois lockfiles |
| Banco vazio/populado | `test:migrations`: sete migrations anteriores → fixtures antigas → três migrations Discord; conteúdo preservado, proprietário interno obrigatório e estados inválidos rejeitados |
| Compose smoke isolado | Cadastro, login, conta e pagamento idempotente via Nginx → API → PostgreSQL aprovados; sessão/chave/valores/histórico preservados após restart e recriação |
| Monitoramento local | Configuração opcional implementada; evidência de coleta será registrada após concluir a execução dos serviços |
| CI GitHub | Resultado/link serão registrados após abertura da PR; execução local não substitui CI |
| Discord real | **Pendente**: proprietário precisa criar a nova aplicação e configurar credenciais/servidor/endpoint |

Discord automatizado usa chaves Ed25519 geradas durante testes e respostas externas simuladas. Cobre assinatura/bytes/replay, PING, identidade, opt-in/código expirado/reutilizado, privacidade A/B, comandos/botões, interação duplicada, mensagens antes do vínculo, falhas 401/403/429/500, backoff, concorrência e recuperação/resultado incerto. Nenhum desses testes é apresentado como prova de envio real ao Discord.

Os testes PostgreSQL compartilham banco com jobs que varrem todos os usuários; por isso arquivos de integração executam em sequência para impedir interferência entre fixtures. Mocks unitários foram ajustados ao retorno real `{count}` e à filtragem de plataforma. `tests/setup-env.ts` desliga Discord real do desenvolvedor antes das importações; cada teste habilita somente a configuração simulada necessária.

## Matriz de conformidade acadêmica

| Exigência | Situação e evidência |
|---|---|
| Tema 17: contas, pagamentos, avisos e resumo | Existente e preservado; suíte financeira completa |
| API REST própria/stack fixa | Mantida: React/TS/Vite, Node/Express/TS, PostgreSQL/Prisma, Zod, node-cron |
| Segunda API BrasilAPI | Existente, com fallback BCB e testes mantidos |
| A.2.1 ciclo das mensagens | Schema/status, worker e testes; enviada não significa lida; botão marca respondida |
| A.2.2 opt-in / canais_usuario | Perfil + código seguro/expiração/hash/uso único/revogação; isolamento testado |
| A.4.1 aplicação e autenticação | Código/guia prontos; criação e validação real da **nova aplicação** pendentes do proprietário |
| A.4.2 DM / botão | Cliente/outbox e testes prontos; envio real ainda pendente |
| A.4.3 Ed25519/HTTP/ACK | Implementado/testado: raw body, 401, PONG, deferred ephemeral e fila; aceite do Portal depende de túnel/credenciais |
| A.4.4 comandos | Quatro comandos e script reproduzível prontos; registro real depende do servidor da nova aplicação |
| A.4.5 Gateway | Dispensado no escopo do Tema 17; sem alegação de recebimento de texto livre |
| A.4.6 limites/falhas | Timeout, retry_after, pausas persistentes, backoff, falhas auditadas e proteção de DM |
| A.5 migrations / persistência | Três migrations aditivas; nomes acadêmicos mapeados, UUIDs e histórico preservados; teste vazio/populado |
| A.6 túnel | Roteiro de desenvolvimento pronto; URL real não aberta sem nova aplicação |
| A.7 segurança | Assinaturas, JWT/isolamento, códigos hash, tokens cifrados/fora do Git, auditoria sanitizada; testes automáticos |
| CI lint/testes a partir do encontro 11 | Workflow ampliado; resultado remoto separado das evidências locais |
| Compose e segundo bimestre | Compose padrão preservado; Prometheus/Grafana opcionais e dashboard provisionado |
| Tags aula-01…aula-18 | Ausentes no histórico consultado; nenhuma tag inventada. Grupo precisa mapear aulas a commits comprovados |
| Release final v1.0.0 | Releases existentes `1.0.0` e `1.0.1` preservadas; divergência do prefixo `v` registrada, sem sobrescrever |
| B.1–B.9 nuvem / banco gerenciado / DNS / TLS / custo | Preparação Azure documentada, **publicação e evidências pendentes** por proibição explícita de deploy nesta tarefa |
| A.1 aceite da plataforma | Discord é decisão da equipe; confirmar com professor o aceite se o encontro 06 já passou |

## Reprodução e pendências reais

Passos exatos para criar/convidar o novo bot, configurar `.env`, verificar identidade, registrar comandos, validar PING local por HTTPS, vincular e demonstrar DM/botão: [guia Discord](README.md). Modelagem/rollback: [modelagem](modelagem.md). Métricas: [monitoramento](../monitoring/README.md). Publicação/cotação futura: [Azure](../azure/README.md).

Pendências externas não disfarçadas como concluídas: criação da aplicação no Developer Portal; token/Public Key/Application ID/Guild ID; registro real dos comandos e bot no servidor; URL de túnel e PING aceito pelo Portal; DM e confirmação com conta de teste autorizada; aprovação acadêmica da escolha de plataforma; mapeamento de tags por aula; conta/região/custos/domínio/DNS/TLS/banco gerenciado e deploy Azure. Nenhuma credencial real foi usada nos testes.

PR e resultado da CI: a preencher com links reais após publicação da branch para revisão. Sem merge automático.
