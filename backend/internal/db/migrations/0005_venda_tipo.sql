ALTER TABLE vendas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'produto';

ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_tipo_check;
ALTER TABLE vendas ADD CONSTRAINT vendas_tipo_check CHECK (tipo IN ('produto', 'emprestimo'));
