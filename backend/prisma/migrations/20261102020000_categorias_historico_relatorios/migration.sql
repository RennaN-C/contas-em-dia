CREATE TYPE "CategoriaConta" AS ENUM ('MORADIA', 'ESTUDOS', 'TRANSPORTE', 'SAUDE', 'ASSINATURAS', 'ALIMENTACAO', 'LAZER', 'OUTRAS');
ALTER TABLE "contas" ADD COLUMN "categoria" "CategoriaConta" NOT NULL DEFAULT 'OUTRAS';
ALTER TABLE "preferencias_usuarios"
  ADD COLUMN "categoria_padrao" "CategoriaConta" NOT NULL DEFAULT 'OUTRAS',
  ADD COLUMN "inicio_semana" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "detalhes_relatorio" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "preferencias_usuarios" ADD CONSTRAINT "preferencias_inicio_semana_check" CHECK ("inicio_semana" IN (0, 1));
CREATE TABLE "historico_contas" (
  "id" TEXT PRIMARY KEY,
  "chave" TEXT UNIQUE,
  "usuario_id" TEXT NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "conta_id" TEXT REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "descricao" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "detalhes" JSONB NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "historico_contas_usuario_id_criado_em_idx" ON "historico_contas"("usuario_id", "criado_em");
CREATE INDEX "historico_contas_conta_id_criado_em_idx" ON "historico_contas"("conta_id", "criado_em");
-- Only known facts are imported: earlier edits and pauses cannot be reconstructed.
INSERT INTO "historico_contas" (id, chave, usuario_id, conta_id, descricao, acao, detalhes, criado_em)
SELECT md5('cadastro:' || id)::uuid::text, 'criacao:' || id, usuario_id, id, descricao, 'CADASTRO_ANTERIOR',
  jsonb_build_object('observacao', 'Conta cadastrada antes da ativação do histórico; alterações anteriores não estão disponíveis.'), criado_em
FROM contas;
INSERT INTO "historico_contas" (id, usuario_id, conta_id, descricao, acao, detalhes, criado_em)
SELECT md5('pagamento:' || p.id)::uuid::text, c.usuario_id, c.id, c.descricao, 'PAGAMENTO_REGISTRADO',
  jsonb_build_object('valor', p.valor::text, 'encargos', p.encargos::text, 'pagoEm', to_char(p.pago_em, 'YYYY-MM-DD')), p.criado_em
FROM pagamentos p JOIN contas c ON c.id = p.conta_id;
