CREATE TABLE IF NOT EXISTS casa_recorrentes (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('despesa','receita')),
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    tipo_recorrencia TEXT NOT NULL CHECK (tipo_recorrencia IN ('fixa','variavel')),
    valor_base NUMERIC(12,2) NOT NULL,
    dia_vencimento INTEGER,
    ativa BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS casa_lancamentos (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('despesa','receita')),
    recorrente_id INTEGER REFERENCES casa_recorrentes(id) ON DELETE SET NULL,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor_previsto NUMERIC(12,2) NOT NULL,
    valor_realizado NUMERIC(12,2) NOT NULL DEFAULT 0,
    data_vencimento DATE,
    data_pagamento TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','paga')),
    observacoes TEXT,
    competencia_ano INTEGER NOT NULL,
    competencia_mes INTEGER NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_casa_lancamentos_competencia ON casa_lancamentos(competencia_ano, competencia_mes);
CREATE INDEX IF NOT EXISTS idx_casa_lancamentos_recorrente ON casa_lancamentos(recorrente_id);
