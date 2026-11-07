# SaldoPlusBot — novo bot exclusivo

Decisão atual da equipe: **criar uma nova aplicação `SaldoPlusBot`**. O bot usado em aula não será reutilizado nem alterado. Todo o código compartilha o Express, Prisma, PostgreSQL e node-cron do Saldo+. Não há outro repositório, backend, frontend ou banco de produção.

## Criar e instalar a aplicação (proprietário da conta Discord)

1. Entrar em https://discord.com/developers/applications e selecionar **New Application**. Nome: `SaldoPlusBot`. Confirmar os termos e criar.
2. Em **General Information**, copiar **Application ID** e **Public Key** da nova aplicação.
3. Em **Bot**, configurar o usuário bot, seu nome e descrição. Se o portal ainda oferecer criação separada, usar **Add Bot**. Usar **Reset Token** para gerar o token e guardá-lo diretamente em `backend/.env`. Não colar token no chat, prints, issues ou terminal gravado.
4. Manter intents privilegiadas desligadas: esta implementação usa interações HTTP e não lê texto livre. Não conceder Administrator.
5. Criar um servidor privado de testes no Discord. Ativar **Configurações do usuário → Avançado → Modo desenvolvedor**; botão direito no servidor → **Copiar ID**.
6. Em **Installation** / **OAuth2 → URL Generator**, selecionar instalação em servidor, escopos `bot` e `applications.commands`. Para o fluxo apenas por DM, começar com permissões de servidor `0` (sem acesso a despesas em canais); se o portal/grupo exigir Send Messages, conceder somente `2048`, conforme o Anexo A.4.1. Nunca solicitar administrador.
7. Abrir a URL gerada, escolher somente o servidor privado e autorizar. Exemplo sem credenciais: `https://discord.com/oauth2/authorize?client_id=SEU_APPLICATION_ID&scope=bot%20applications.commands&permissions=0`.
8. Permitir mensagens diretas dos membros do servidor no perfil do usuário que participará da demonstração. O bot não usa canais públicos como fallback.
9. Configurar a URL de interações somente depois de iniciar API e túnel HTTPS, conforme abaixo.

Nenhuma aplicação foi registrada automaticamente por esta implementação. Sem sessão autorizada no Developer Portal, os passos acima pertencem ao proprietário. Não usar o token da aplicação antiga.

## Ambiente e validação

Copiar os campos de `backend/.env.example` para o `.env` local, mantendo os valores financeiros já existentes:

```dotenv
DISCORD_ENABLED=false
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_PUBLIC_KEY=
DISCORD_GUILD_ID=
DISCORD_ENCRYPTION_KEY=
```

Preencher com os dados da **nova aplicação**, gerar uma chave AES de 32 bytes hex (`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`) e então usar `DISCORD_ENABLED=true`. A chave é um segredo de ambiente; mantenha-a estável entre reinicializações para recuperar a inbox cifrada. O token não vai ao frontend. Ao habilitar, campos obrigatórios são validados; mensagens de configuração citam apenas nomes dos campos. Sem habilitação, o financeiro funciona normalmente e o webhook responde 503 controlado.

No diretório backend:

```powershell
npm run discord:check
npm run discord:commands
```

O primeiro verifica autenticação em `/users/@me`, identidade da aplicação e Public Key em `/oauth2/applications/@me`. O segundo registra os quatro comandos no servidor indicado. Ambos dependem de credenciais reais. Para registro global futuro: `npm run discord:commands -- --global`. O script faz upsert individual por nome, preservando outros comandos, e não cria aplicação. Não executá-lo com as credenciais do bot antigo.

## Webhook local por HTTPS

1. Iniciar `docker compose up -d --build --wait` ou o backend local, garantindo migrations atualizadas.
2. Executar `cloudflared tunnel --url http://localhost:3000` ou `ngrok http 3000` em terminal próprio. Esses programas são pré-requisitos externos, não instalados pelo projeto. Não publicar métricas/Grafana pelo túnel.
3. Na **nova aplicação**, General Information → **Interactions Endpoint URL**: `https://SEU-TUNEL/api/webhook/discord`.
4. Salvar. O Discord envia PING assinado; a API retorna `{"type":1}`. Falha na validação impede o portal de aceitar a URL. Atualizar a URL se o túnel mudar.
5. Comandos assinados e botões são persistidos antes do ACK `type:5`, com `flags:64` (ephemeral); o worker cron de cinco segundos edita a resposta original. Não chamar BrasilAPI ou Discord no caminho inicial.

O Express registra `express.raw()` **antes** do parser JSON global. A assinatura Ed25519 usa `timestamp + bytes originais`; verificação pelo `node:crypto` dispensa outra biblioteca criptográfica. Assinatura ausente, adulterada ou timestamp fora de cinco minutos recebe 401. Application ID e identidade do ator também são validados. O banco tem timeout curto na ingestão; se não conseguir persistir, devolve 503 em vez de confirmar uma tarefa perdida. PING é verificação de protocolo, não mensagem de usuário, e não depende de banco.

O Interactions Endpoint recebe comandos e cliques, **não mensagens de texto livre**. O Anexo A.4.5 permite esse modelo. Se o escopo acadêmico mudar para texto livre, será necessário Gateway com intent apropriada em processo separado no mesmo repositório; isso não está implementado nem é necessário ao Tema 17 descrito.

## Vínculo e comandos

No Perfil do Saldo+, **Conectar Discord** autoriza lembretes/resumos e gera código de uso único válido por dez minutos. Não compartilhar o código. No servidor privado usar `/vincular codigo:CODIGO` e, após a resposta privada, **Atualizar conexão** no perfil. O código só aparece quando gerado; não é guardado no navegador nem recuperado em texto pelo backend.

- `/vincular`: consome o código sob lock. Uma identidade Discord não pode ser transferida a outro cadastro sem revogação anterior.
- `/status`: informa o vínculo da identidade que fez a interação assinada.
- `/proximas-contas`: próximas sete datas civis, somente da conta vinculada, excluindo despesas quitadas e descontando pagamentos parciais; até dez itens, com orientação para consultar todos no site.
- `/desvincular`: pede confirmação em botão privado; a confirmação atua somente no vínculo da própria identidade. O botão **Desconectar Discord** no Perfil também revoga convites e envios pendentes.

## Demonstrar aviso e confirmação

Somente com conta própria de teste e autorização para receber dados de demonstração: vincular, cadastrar uma despesa pendente com vencimento hoje, amanhã ou em três dias. Executar o job existente `npm run job:daily` (ou aguardar 06h, America/Sao_Paulo). Para resumo, `npm run job:weekly` (cron segunda 06h05). A API em execução drena a inbox e outbox a cada cinco segundos.

Conferir: aviso interno continua na central; linha externa começa em `enfileirada`; DM enviada gera `id_externo`, `enviado_em`, `status=enviada`. Clicar **Confirmar recebimento** produz outra interação assinada, validada pela identidade, canal e ID da mensagem; o registro original passa a `respondida` com `respondido_em`. Isso não registra pagamento e não movimenta dinheiro.

Fechar DMs/bloquear o bot deve produzir falha 403, inativar o vínculo e apresentar orientação no Perfil. Nunca publicar a despesa em canal público. Reativar DMs e gerar novo vínculo. Registros com 401 ou resultado incerto também aparecem como falha; conferir a configuração, sem repetir indefinidamente.

## Confiabilidade e privacidade

Outbox é gravada na mesma transação do aviso interno, sem requisição Discord nessa transação financeira. A chave externa deriva da chave do aviso/resumo; reexecutar jobs não duplica envios nem registros financeiros. Só mensagens criadas durante um vínculo ativo são enfileiradas; conectar depois não envia todo o histórico.

O worker valida a aplicação, abre/reutiliza DM e envia conteúdo sem menções. Persistência de pausas respeita `retry_after`, cabeçalhos de limite e backoff; no máximo cinco tentativas por tarefa. 403 inativa vínculo; 401 gera pausa longa para revisão. Erros armazenados são descrições seguras, sem refletir respostas externas que possam conter dados sensíveis.

Envios possuem reserva persistente e nonce estável (`enforce_nonce`). O Discord não oferece transação atômica com PostgreSQL nem deduplicação eterna: se o processo cair entre envio e confirmação no banco ou ocorrer timeout de resultado incerto, o registro fica em `falha/RESULTADO_INCERTO` após a reserva expirar. Conferir no Discord antes de qualquer reenvio manual. Essa escolha evita repetir automaticamente uma mensagem possivelmente enviada; não promete entrega exatamente uma vez. Filas não iniciadas e falhas transitórias conhecidas são retomadas do banco após reinício. Interações usam PATCH idempotente da resposta original, com token cifrado removido ao concluir/expirar.

Toda interação de negócio válida é registrada na inbox e em `mensagens`, inclusive antes do vínculo (proprietário nulo somente para plataforma externa). Mensagens internas continuam exigindo proprietário por constraint. Payloads preservam estrutura e conteúdo, com tokens removidos e código de vínculo substituído por hash por segurança. PII e conteúdos ficam somente no banco, com acesso restrito; não nos logs ou métricas. Planejar retenção/backup e limpeza de auditoria segundo a política do grupo antes de produção.

## Referências

[Discord: interações e respostas](https://docs.discord.com/developers/interactions/receiving-and-responding), [mensagens e nonce](https://docs.discord.com/developers/resources/message), [rate limits](https://docs.discord.com/developers/topics/rate-limits). As instruções do Portal podem mudar; usar os campos correspondentes da nova aplicação.
