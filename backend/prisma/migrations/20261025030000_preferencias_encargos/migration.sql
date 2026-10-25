ALTER TABLE pagamentos ADD COLUMN encargos DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE pagamentos ADD CONSTRAINT pagamentos_encargos_nao_negativos CHECK (encargos >= 0);
CREATE TABLE preferencias_usuarios (
 usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
 ordenacao_contas TEXT NOT NULL DEFAULT 'vencimento',
 confirmar_pagamento BOOLEAN NOT NULL DEFAULT true,
 reduzir_movimento BOOLEAN NOT NULL DEFAULT false
);
