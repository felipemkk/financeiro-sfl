ALTER TABLE vitrine_produtos ADD COLUMN IF NOT EXISTS capa_categoria BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vitrine_produtos_capa_categoria
    ON vitrine_produtos (categoria) WHERE capa_categoria = true;
