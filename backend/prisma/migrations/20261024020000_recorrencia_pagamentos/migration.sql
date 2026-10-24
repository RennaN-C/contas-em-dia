-- Additive and nullable: existing accounts/payments remain valid.
ALTER TABLE "contas" ADD COLUMN "origem_id" TEXT, ADD COLUMN "dia_recorrencia" INTEGER;
ALTER TABLE "pagamentos" ADD COLUMN "chave" TEXT;
CREATE UNIQUE INDEX "contas_origem_id_key" ON "contas"("origem_id");
CREATE UNIQUE INDEX "pagamentos_chave_key" ON "pagamentos"("chave");

ALTER TABLE "contas" ADD CONSTRAINT "contas_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas" ADD CONSTRAINT "contas_dia_recorrencia_check" CHECK ("dia_recorrencia" BETWEEN 1 AND 31);
