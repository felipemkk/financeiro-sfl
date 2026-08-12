CREATE TABLE IF NOT EXISTS vitrine_carrossel (
    id SERIAL PRIMARY KEY,
    escopo TEXT NOT NULL,
    imagem_url TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vitrine_carrossel_escopo ON vitrine_carrossel(escopo);
