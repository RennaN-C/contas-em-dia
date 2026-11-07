# Modelagem Discord

As migrations `20261107010000_discord` e `20261107020000_nomes_academicos_discord` ampliam o schema sem remover tabelas ou registros. A segunda adequa nomes ao Anexo A.5: `chat_id`, `canal_usuario_id`, `status`, `erro_codigo`, `erro_descricao`. UUIDs e a coluna preexistente `criado_em` foram preservados em vez de converter para BIGINT ou renomear o histórico.

`canais_usuario`: um vínculo por usuário Saldo+ e identidade Discord única. Convite de 128 bits aleatórios com hash SHA-256, validade de dez minutos, consumo sob lock e revogação explícita. O destino é o usuário Discord (`chat_id`), nunca um canal público.

`mensagens`: transporte separado por `plataforma`, direção, estado, canal, payload sanitizado, ID externo, interação única, erros, tentativas e próximas execuções. As mensagens internas mantêm os valores padrão INTERNA/saida/enviada. `enviada` não significa entregue ou lida. `respondida` comprova uma interação explícita; não é pagamento.

`interacoes_discord`: inbox durável, incluindo pessoas sem vínculo. ID Discord é chave primária. Payload mantém a estrutura recebida com tokens removidos e códigos substituídos por hash. O token temporário necessário para responder fica cifrado com AES-256-GCM, separado do payload e removido após conclusão/expiração. Nunca imprimir o registro completo em logs.

`controle_discord`: pausas persistentes para serialização dos envios e rate limit entre instâncias.

Validação local inicial: sete migrations anteriores aplicadas em PostgreSQL 15 vazio. Inseridos usuário e mensagem de controle antes das migrations Discord; após a atualização, `mensagem-preservada` continuou contendo `Preservar conteúdo`, plataforma INTERNA e estado enviada. As integrações automatizadas usam usuários com UUIDs próprios e apagam somente suas fixtures ao terminar.

Rollback seguro: desabilitar Discord e voltar a imagem anterior mantendo as colunas/tabelas extras (compatibilidade aditiva). Não apagar mensagens externas para simular downgrade. Fazer backup e testar restauração em banco separado antes de qualquer reversão de produção. Não usar `migrate reset`, `db push --accept-data-loss` ou `docker compose down -v`.
