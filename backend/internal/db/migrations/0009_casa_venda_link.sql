ALTER TABLE casa_lancamentos ADD COLUMN IF NOT EXISTS venda_parcela_id INTEGER REFERENCES parcelas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_casa_lancamentos_venda_parcela ON casa_lancamentos(venda_parcela_id);
