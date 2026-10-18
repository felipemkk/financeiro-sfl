ALTER TABLE vendas ADD COLUMN IF NOT EXISTS contrato_status TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS contrato_documento_id TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS contrato_assinatura_id TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS contrato_link_assinatura TEXT;
