export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  observacoes: string;
}

export interface Parcela {
  id: number;
  numero: number;
  valor: number;
  valor_pago: number;
  vencimento: string;
  status: 'pendente' | 'paga' | 'atrasada';
}

export interface Venda {
  id: number;
  cliente_id: number;
  descricao_produto: string;
  valor_total: number;
  valor_investido: number;
  lucro: number;
  num_parcelas: number;
  data_primeira_parcela: string;
  parcelas: Parcela[];
}

export interface ParcelaDoMes {
  id: number;
  venda_id: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_telefone: string;
  descricao_produto: string;
  numero: number;
  num_parcelas: number;
  valor: number;
  vencimento: string;
  status: 'pendente' | 'paga' | 'atrasada';
}

export interface DashboardResumo {
  atrasados_qtd: number;
  atrasados_total: number;
  hoje_qtd: number;
  hoje_total: number;
  clientes_total: number;
  vendas_mes_qtd: number;
  vendas_mes_total: number;
}
