CREATE TABLE IF NOT EXISTS vitrine_categoria_capa (
    categoria TEXT PRIMARY KEY,
    imagem_url TEXT NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
