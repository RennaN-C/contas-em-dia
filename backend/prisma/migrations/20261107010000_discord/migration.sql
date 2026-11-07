-- AlterTable
ALTER TABLE "mensagens" ADD COLUMN     "canal_id" TEXT,
ADD COLUMN     "codigo_erro" TEXT,
ADD COLUMN     "descricao_erro" TEXT,
ADD COLUMN     "direcao" TEXT NOT NULL DEFAULT 'saida',
ADD COLUMN     "enviado_em" TIMESTAMP(3),
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'enviada',
ADD COLUMN     "id_externo" TEXT,
ADD COLUMN     "interacao_id" TEXT,
ADD COLUMN     "payload_bruto" JSONB,
ADD COLUMN     "plataforma" TEXT NOT NULL DEFAULT 'INTERNA',
ADD COLUMN     "proxima_tentativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "respondido_em" TIMESTAMP(3),
ADD COLUMN     "tentativas" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "canais_usuario" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL DEFAULT 'DISCORD',
    "discord_id" TEXT,
    "codigo_convite" TEXT,
    "expira_em" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "vinculado_em" TIMESTAMP(3),
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canais_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacoes_discord" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "segredo" TEXT,
    "resposta" JSONB,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proxima_tentativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacoes_discord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controle_discord" (
    "chave" TEXT NOT NULL,
    "pausado_ate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controle_discord_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "canais_usuario_usuario_id_key" ON "canais_usuario"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "canais_usuario_discord_id_key" ON "canais_usuario"("discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "canais_usuario_codigo_convite_key" ON "canais_usuario"("codigo_convite");

-- CreateIndex
CREATE INDEX "interacoes_discord_concluido_proxima_tentativa_idx" ON "interacoes_discord"("concluido", "proxima_tentativa");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_id_externo_key" ON "mensagens"("id_externo");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_interacao_id_key" ON "mensagens"("interacao_id");

-- CreateIndex
CREATE INDEX "mensagens_plataforma_estado_proxima_tentativa_idx" ON "mensagens"("plataforma", "estado", "proxima_tentativa");

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_canal_id_fkey" FOREIGN KEY ("canal_id") REFERENCES "canais_usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canais_usuario" ADD CONSTRAINT "canais_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_estado_check" CHECK (estado IN ('enfileirada','enviada','falha','respondida'));
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_plataforma_check" CHECK (plataforma IN ('INTERNA','DISCORD'));
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_direcao_check" CHECK (direcao IN ('entrada','saida'));
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_tentativas_check" CHECK (tentativas >= 0);
ALTER TABLE "canais_usuario" ADD CONSTRAINT "canal_discord_check" CHECK (plataforma = 'DISCORD' AND (NOT ativo OR (discord_id IS NOT NULL AND vinculado_em IS NOT NULL)));
