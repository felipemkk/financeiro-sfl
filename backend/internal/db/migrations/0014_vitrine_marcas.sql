CREATE TABLE IF NOT EXISTS vitrine_marcas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO vitrine_marcas (nome)
SELECT DISTINCT marca FROM vitrine_produtos WHERE marca <> ''
ON CONFLICT (nome) DO NOTHING;
