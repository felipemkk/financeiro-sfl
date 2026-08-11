CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    descricao_produto TEXT NOT NULL,
    valor_total NUMERIC(12,2) NOT NULL,
    num_parcelas INTEGER NOT NULL,
    data_primeira_parcela DATE NOT NULL,
    criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parcelas (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    vencimento DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga')),
    pago_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(vencimento);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
