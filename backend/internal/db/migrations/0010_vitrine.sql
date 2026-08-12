CREATE TABLE IF NOT EXISTS vitrine_produtos (
    id SERIAL PRIMARY KEY,
    categoria TEXT NOT NULL,
    marca TEXT,
    nome TEXT NOT NULL,
    preco NUMERIC(12,2) NOT NULL,
    imagem_url TEXT NOT NULL,
    destaque BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vitrine_produtos_categoria ON vitrine_produtos(categoria);
