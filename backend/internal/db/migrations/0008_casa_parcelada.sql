ALTER TABLE casa_recorrentes ADD COLUMN IF NOT EXISTS num_parcelas INTEGER;

ALTER TABLE casa_recorrentes DROP CONSTRAINT IF EXISTS casa_recorrentes_tipo_recorrencia_check;
ALTER TABLE casa_recorrentes ADD CONSTRAINT casa_recorrentes_tipo_recorrencia_check
    CHECK (tipo_recorrencia IN ('fixa','variavel','parcelada'));

ALTER TABLE casa_lancamentos ADD COLUMN IF NOT EXISTS numero_parcela INTEGER;
