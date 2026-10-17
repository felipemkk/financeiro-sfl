CREATE TABLE IF NOT EXISTS clientes_pendentes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT,
    telefone TEXT,
    whatsapp TEXT,
    endereco TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
