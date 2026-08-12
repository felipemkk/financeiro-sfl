export interface Cliente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  whatsapp: string;
  endereco: string;
  observacoes: string;
  ativo: boolean;
}

export interface Parcela {
  id: number;
  numero: number;
  valor: number;
  valor_pago: number;
  vencimento: string;
  status: 'pendente' | 'paga' | 'atrasada';
}

export type TipoVenda = 'produto' | 'emprestimo';

export interface Venda {
  id: number;
  cliente_id: number;
  tipo: TipoVenda;
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
  cliente_whatsapp: string;
  tipo: TipoVenda;
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

export type TipoLancamentoCasa = 'despesa' | 'receita';
export type TipoRecorrencia = 'fixa' | 'variavel' | 'parcelada' | 'pontual';

export interface LancamentoCasa {
  id: number;
  tipo: TipoLancamentoCasa;
  recorrente_id: number | null;
  tipo_recorrencia: TipoRecorrencia;
  categoria: string;
  descricao: string;
  valor_previsto: number;
  valor_realizado: number;
  data_vencimento: string | null;
  status: 'pendente' | 'paga' | 'atrasada';
  observacoes: string;
  competencia_ano: number;
  competencia_mes: number;
  numero_parcela: number | null;
  num_parcelas_total: number | null;
}

export interface CategoriaResumoCasa {
  categoria: string;
  previsto: number;
  realizado: number;
  percentual: number;
}

export interface ResumoCasa {
  receitas_previsto: number;
  receitas_realizado: number;
  despesas_previsto: number;
  despesas_realizado: number;
  saldo_previsto: number;
  saldo_realizado: number;
  por_categoria: CategoriaResumoCasa[];
}

export interface ImagemCarrossel {
  id: number;
  escopo: string;
  imagem_url: string;
}

export interface ProdutoVitrine {
  id: number;
  categoria: string;
  marca: string;
  nome: string;
  preco: number;
  imagem_url: string;
  foto_extra_1: string;
  foto_extra_2: string;
  foto_extra_3: string;
  foto_extra_4: string;
  destaque: boolean;
  ativo: boolean;
}
