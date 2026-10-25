ALTER TABLE contas ADD COLUMN recorrencia_ativa BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE taxas_referencia (
 chave TEXT PRIMARY KEY,
 taxa_anual DECIMAL(12,6) NOT NULL,
 fonte TEXT NOT NULL,
 referencia TIMESTAMP(3),
 consultada_em TIMESTAMP(3) NOT NULL
);
CREATE TABLE execucoes_jobs (
 chave TEXT PRIMARY KEY,
 concluido_em TIMESTAMP(3) NOT NULL
);
