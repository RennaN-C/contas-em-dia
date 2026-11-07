-- Eventos Discord de pessoas ainda não vinculadas também são registrados.
ALTER TABLE mensagens ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_internas_proprietario_check
  CHECK (plataforma <> 'INTERNA' OR usuario_id IS NOT NULL);
