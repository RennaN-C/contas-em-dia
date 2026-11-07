-- Adequação aditiva dos nomes do Anexo A.5, mantendo UUIDs e criado_em existentes.
ALTER TABLE mensagens RENAME COLUMN estado TO status;
ALTER TABLE mensagens RENAME COLUMN canal_id TO canal_usuario_id;
ALTER TABLE mensagens RENAME COLUMN codigo_erro TO erro_codigo;
ALTER TABLE mensagens RENAME COLUMN descricao_erro TO erro_descricao;
ALTER TABLE canais_usuario RENAME COLUMN discord_id TO chat_id;
ALTER INDEX canais_usuario_discord_id_key RENAME TO canais_usuario_chat_id_key;
ALTER INDEX mensagens_plataforma_estado_proxima_tentativa_idx RENAME TO mensagens_plataforma_status_proxima_tentativa_idx;
ALTER TABLE mensagens RENAME CONSTRAINT mensagens_canal_id_fkey TO mensagens_canal_usuario_id_fkey;
