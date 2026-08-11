import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cliente, DashboardResumo, ParcelaDoMes, Venda } from './models';

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

  criarCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    return firstValueFrom(this.http.post<Cliente>(`${this.base}/clientes`, cliente));
  }

  atualizarCliente(id: number, cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    return firstValueFrom(this.http.put<Cliente>(`${this.base}/clientes/${id}`, cliente));
  }

  criarVenda(venda: {
    cliente_id: number;
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
}
