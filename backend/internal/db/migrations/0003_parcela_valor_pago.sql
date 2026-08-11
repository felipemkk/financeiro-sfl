ALTER TABLE parcelas ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE parcelas SET valor_pago = valor WHERE status = 'paga' AND valor_pago = 0;
