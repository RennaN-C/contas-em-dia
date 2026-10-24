CREATE TYPE "StatusConta" AS ENUM ('PENDENTE', 'PAGA', 'ATRASADA');
CREATE TYPE "TipoConta" AS ENUM ('AVULSA', 'RECORRENTE');
CREATE TABLE "usuarios" (
 "id" TEXT PRIMARY KEY, "nome" TEXT NOT NULL, "email" TEXT NOT NULL, "senha_hash" TEXT NOT NULL,
 "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizado_em" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE TABLE "contas" (
 "id" TEXT PRIMARY KEY, "usuario_id" TEXT NOT NULL, "descricao" TEXT NOT NULL, "valor" DECIMAL(12,2) NOT NULL,
 "vencimento" TIMESTAMP(3) NOT NULL, "tipo" "TipoConta" NOT NULL DEFAULT 'AVULSA', "recorrencia" TEXT,
 "status" "StatusConta" NOT NULL DEFAULT 'PENDENTE', "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "atualizado_em" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "contas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "contas_usuario_id_vencimento_idx" ON "contas"("usuario_id", "vencimento");
CREATE TABLE "pagamentos" (
 "id" TEXT PRIMARY KEY, "conta_id" TEXT NOT NULL, "valor" DECIMAL(12,2) NOT NULL, "pago_em" TIMESTAMP(3) NOT NULL,
 "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "pagamentos_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "pagamentos_conta_id_idx" ON "pagamentos"("conta_id");
CREATE TABLE "avisos" (
 "id" TEXT PRIMARY KEY, "conta_id" TEXT NOT NULL, "dias_antes" INTEGER NOT NULL, "agendado_para" TIMESTAMP(3) NOT NULL,
 "enviado_em" TIMESTAMP(3), "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "avisos_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "avisos_conta_id_agendado_para_idx" ON "avisos"("conta_id", "agendado_para");
CREATE TABLE "mensagens" (
 "id" TEXT PRIMARY KEY, "usuario_id" TEXT NOT NULL, "titulo" TEXT NOT NULL, "conteudo" TEXT NOT NULL,
 "lida" BOOLEAN NOT NULL DEFAULT false, "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "mensagens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "mensagens_usuario_id_criado_em_idx" ON "mensagens"("usuario_id", "criado_em");
