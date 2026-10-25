ALTER TABLE "avisos" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'VENCIMENTO';
UPDATE "avisos" SET "tipo" = CASE "dias_antes" WHEN 3 THEN 'TRES_DIAS' WHEN 1 THEN 'VESPERA' ELSE 'VENCIMENTO' END;
-- Preserve every legacy row, including duplicates, before enforcing uniqueness.
WITH ranked AS (
 SELECT id, ROW_NUMBER() OVER (PARTITION BY conta_id, tipo, agendado_para ORDER BY criado_em, id) AS n FROM avisos
)
UPDATE avisos SET tipo = 'LEGADO_' || avisos.id FROM ranked WHERE avisos.id = ranked.id AND ranked.n > 1;
CREATE UNIQUE INDEX "avisos_conta_id_tipo_agendado_para_key" ON "avisos"("conta_id", "tipo", "agendado_para");
ALTER TABLE "mensagens" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'AVISO', ADD COLUMN "chave" TEXT, ADD COLUMN "conta_id" TEXT;
CREATE UNIQUE INDEX "mensagens_chave_key" ON "mensagens"("chave");
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
