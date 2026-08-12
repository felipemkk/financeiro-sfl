import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Cliente,
  DashboardResumo,
  ImagemCarrossel,
  LancamentoCasa,
  ParcelaDoMes,
  ProdutoVitrine,
  ResumoCasa,
  TipoLancamentoCasa,
  TipoRecorrencia,
  TipoVenda,
  Venda,
} from './models';

interface ProdutoVitrinePayload {
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
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listarClientes(busca?: string): Promise<Cliente[]> {
    const params = busca ? `?busca=${encodeURIComponent(busca)}` : '';
    return firstValueFrom(this.http.get<Cliente[]>(`${this.base}/clientes${params}`));
  }

  obterCliente(id: number): Promise<Cliente> {
    return firstValueFrom(this.http.get<Cliente>(`${this.base}/clientes/${id}`));
  }

  criarCliente(
    cliente: Pick<Cliente, 'nome' | 'cpf' | 'telefone' | 'whatsapp' | 'endereco' | 'observacoes'>
  ): Promise<Cliente> {
    return firstValueFrom(this.http.post<Cliente>(`${this.base}/clientes`, cliente));
  }

  atualizarCliente(
    id: number,
    cliente: Pick<Cliente, 'nome' | 'cpf' | 'telefone' | 'whatsapp' | 'endereco' | 'observacoes'>
  ): Promise<Cliente> {
    return firstValueFrom(this.http.put<Cliente>(`${this.base}/clientes/${id}`, cliente));
  }

  desativarCliente(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/clientes/${id}/desativar`, {}));
  }

  ativarCliente(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/clientes/${id}/ativar`, {}));
  }

  criarVenda(venda: {
    cliente_id: number;
    tipo: TipoVenda;
    descricao_produto: string;
    valor_total: number;
    valor_investido: number;
    num_parcelas: number;
    data_primeira_parcela: string;
  }): Promise<Venda> {
    return firstValueFrom(this.http.post<Venda>(`${this.base}/vendas`, venda));
  }

  listarVendasDoCliente(clienteId: number): Promise<Venda[]> {
    return firstValueFrom(this.http.get<Venda[]>(`${this.base}/vendas/cliente/${clienteId}`));
  }

  obterVenda(id: number): Promise<Venda> {
    return firstValueFrom(this.http.get<Venda>(`${this.base}/vendas/${id}`));
  }

  quitarVenda(id: number): Promise<Venda> {
    return firstValueFrom(this.http.post<Venda>(`${this.base}/vendas/${id}/quitar`, {}));
  }

  atualizarValorInvestido(id: number, valorInvestido: number): Promise<Venda> {
    return firstValueFrom(
      this.http.put<Venda>(`${this.base}/vendas/${id}/investido`, { valor_investido: valorInvestido })
    );
  }

  listarParcelasDoMes(ano: number, mes: number): Promise<ParcelaDoMes[]> {
    return firstValueFrom(
      this.http.get<ParcelaDoMes[]>(`${this.base}/parcelas?ano=${ano}&mes=${mes}`)
    );
  }

  marcarParcelaPaga(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/parcelas/${id}/pagar`, {}));
  }

  desfazerPagamentoParcela(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/parcelas/${id}/despagar`, {}));
  }

  abaterParcela(id: number, valor: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/parcelas/${id}/abater`, { valor }));
  }

  obterDashboard(): Promise<DashboardResumo> {
    return firstValueFrom(this.http.get<DashboardResumo>(`${this.base}/dashboard`));
  }

  listarLancamentosCasa(ano: number, mes: number, tipo?: TipoLancamentoCasa): Promise<LancamentoCasa[]> {
    const tipoParam = tipo ? `&tipo=${tipo}` : '';
    return firstValueFrom(
      this.http.get<LancamentoCasa[]>(`${this.base}/casa/lancamentos?ano=${ano}&mes=${mes}${tipoParam}`)
    );
  }

  obterLancamentoCasa(id: number): Promise<LancamentoCasa> {
    return firstValueFrom(this.http.get<LancamentoCasa>(`${this.base}/casa/lancamentos/${id}`));
  }

  criarLancamentoCasa(lancamento: {
    tipo: TipoLancamentoCasa;
    tipo_recorrencia?: TipoRecorrencia;
    categoria: string;
    descricao: string;
    valor_previsto: number;
    data_vencimento?: string;
    observacoes?: string;
    competencia_ano: number;
    competencia_mes: number;
    num_parcelas?: number;
  }): Promise<LancamentoCasa> {
    return firstValueFrom(this.http.post<LancamentoCasa>(`${this.base}/casa/lancamentos`, lancamento));
  }

  atualizarLancamentoCasa(
    id: number,
    lancamento: {
      categoria: string;
      descricao: string;
      valor_previsto: number;
      data_vencimento?: string;
      observacoes?: string;
    }
  ): Promise<LancamentoCasa> {
    return firstValueFrom(this.http.put<LancamentoCasa>(`${this.base}/casa/lancamentos/${id}`, lancamento));
  }

  pagarLancamentoCasa(id: number, valorRealizado?: number): Promise<LancamentoCasa> {
    const body = valorRealizado !== undefined ? { valor_realizado: valorRealizado } : {};
    return firstValueFrom(this.http.post<LancamentoCasa>(`${this.base}/casa/lancamentos/${id}/pagar`, body));
  }

  despagarLancamentoCasa(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/casa/lancamentos/${id}/despagar`, {}));
  }

  suspenderLancamentoCasa(id: number): Promise<LancamentoCasa> {
    return firstValueFrom(this.http.post<LancamentoCasa>(`${this.base}/casa/lancamentos/${id}/suspender`, {}));
  }

  excluirLancamentoCasa(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/casa/lancamentos/${id}`));
  }

  listarCategoriasCasa(): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`${this.base}/casa/categorias`));
  }

  obterResumoCasa(ano: number, mes: number): Promise<ResumoCasa> {
    return firstValueFrom(this.http.get<ResumoCasa>(`${this.base}/casa/resumo?ano=${ano}&mes=${mes}`));
  }

  listarProdutosVitrine(opcoes?: { categoria?: string; destaque?: boolean }): Promise<ProdutoVitrine[]> {
    const params: string[] = [];
    if (opcoes?.categoria) params.push(`categoria=${encodeURIComponent(opcoes.categoria)}`);
    if (opcoes?.destaque) params.push('destaque=true');
    const query = params.length ? `?${params.join('&')}` : '';
    return firstValueFrom(this.http.get<ProdutoVitrine[]>(`${this.base}/vitrine/produtos${query}`));
  }

  listarProdutosVitrineAdmin(): Promise<ProdutoVitrine[]> {
    return firstValueFrom(this.http.get<ProdutoVitrine[]>(`${this.base}/vitrine/admin/produtos`));
  }

  criarProdutoVitrine(produto: ProdutoVitrinePayload): Promise<ProdutoVitrine> {
    return firstValueFrom(this.http.post<ProdutoVitrine>(`${this.base}/vitrine/admin/produtos`, produto));
  }

  atualizarProdutoVitrine(id: number, produto: ProdutoVitrinePayload): Promise<ProdutoVitrine> {
    return firstValueFrom(this.http.put<ProdutoVitrine>(`${this.base}/vitrine/admin/produtos/${id}`, produto));
  }

  ativarProdutoVitrine(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/vitrine/admin/produtos/${id}/ativar`, {}));
  }

  desativarProdutoVitrine(id: number): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/vitrine/admin/produtos/${id}/desativar`, {}));
  }

  excluirProdutoVitrine(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/vitrine/admin/produtos/${id}`));
  }

  listarCarrossel(escopo: string): Promise<ImagemCarrossel[]> {
    return firstValueFrom(
      this.http.get<ImagemCarrossel[]>(`${this.base}/vitrine/carrossel?escopo=${encodeURIComponent(escopo)}`)
    );
  }

  listarCarrosselAdmin(escopo: string): Promise<ImagemCarrossel[]> {
    return firstValueFrom(
      this.http.get<ImagemCarrossel[]>(`${this.base}/vitrine/admin/carrossel?escopo=${encodeURIComponent(escopo)}`)
    );
  }

  adicionarImagemCarrossel(escopo: string, imagemUrl: string): Promise<ImagemCarrossel> {
    return firstValueFrom(
      this.http.post<ImagemCarrossel>(`${this.base}/vitrine/admin/carrossel`, { escopo, imagem_url: imagemUrl })
    );
  }

  excluirImagemCarrossel(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/vitrine/admin/carrossel/${id}`));
  }
}
