import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { ParcelaDoMes } from '../core/models';

@Component({
  selector: 'app-cobranca',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <div class="mes-seletor">
        <button mat-icon-button (click)="mesAnterior()" aria-label="Mês anterior">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <h1>{{ nomeMes() }} de {{ ano() }}</h1>
        <button mat-icon-button (click)="proximoMes()" aria-label="Próximo mês">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <div class="resumo">
        <div class="resumo-item">
          <span class="valor">{{ totalPendente() | currency:'BRL' }}</span>
          <span class="label">a receber</span>
        </div>
        <div class="resumo-item">
          <span class="valor recebido">{{ totalRecebido() | currency:'BRL' }}</span>
          <span class="label">já recebido</span>
        </div>
      </div>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (parcelas().length === 0) {
        <p class="vazio">Nenhuma cobrança prevista para este mês.</p>
      } @else {
        @for (p of parcelas(); track p.id) {
          <mat-card class="parcela-card" [class.paga]="p.status === 'paga'" [class.atrasada]="p.status === 'atrasada'">
            <mat-card-content>
              <div class="linha-topo">
                <span class="nome-cliente">
                  @if (p.status === 'paga') { <mat-icon class="icone-paga">check_circle</mat-icon> }
                  <strong>{{ p.cliente_nome }}</strong>
                </span>
                <mat-chip [class.chip-paga]="p.status === 'paga'" [class.chip-atrasada]="p.status === 'atrasada'">
                  {{ statusLabel(p.status) }}
                </mat-chip>
              </div>
              <p class="detalhe">
                Venda #{{ p.venda_id }} — {{ p.descricao_produto }} — parcela {{ p.numero }}/{{ p.num_parcelas }}
              </p>
              <div class="linha-baixo">
                <span class="valor">{{ p.valor | currency:'BRL' }}</span>
                <span class="vencimento">vence {{ p.vencimento | date:'dd/MM' }}</span>
              </div>

              @if (p.status !== 'paga') {
                <div class="acoes">
                  <a mat-stroked-button [href]="linkWhatsapp(p)" target="_blank" rel="noopener">
                    <mat-icon>chat</mat-icon>
                    Cobrar no WhatsApp
                  </a>
                  <button mat-flat-button color="primary" (click)="marcarPaga(p)">
                    Marcar como paga
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .page {
      padding: 16px;
      padding-bottom: 24px;
      max-width: 640px;
      margin: 0 auto;
    }
    .mes-seletor {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .mes-seletor h1 {
      font-size: 1.1rem;
      margin: 0;
      min-width: 160px;
      text-align: center;
      text-transform: capitalize;
    }
    .resumo {
      display: flex;
      gap: 12px;
      margin: 12px 0 16px;
    }
    .resumo-item {
      flex: 1;
      background: #f5f5f5;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .resumo-item .valor {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .resumo-item .valor.recebido {
      color: #2e7d32;
    }
    .resumo-item .label {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
    }
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .vazio {
      color: rgba(0, 0, 0, 0.6);
      text-align: center;
      padding: 32px 0;
    }
    .parcela-card {
      margin-bottom: 12px;
      border-left: 4px solid transparent;
    }
    .parcela-card.paga {
      background: #eef8ef;
      border-left-color: #4caf50;
    }
    .parcela-card.atrasada {
      background: #fdf1f0;
      border-left-color: #e57373;
    }
    .linha-topo {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .nome-cliente {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .icone-paga {
      color: #4caf50;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .detalhe {
      color: rgba(0, 0, 0, 0.6);
      margin: 0 0 8px;
      font-size: 0.875rem;
    }
    .linha-baixo {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
    }
    .linha-baixo .valor {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .vencimento {
      font-size: 0.8rem;
      color: rgba(0, 0, 0, 0.6);
    }
    .acoes {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chip-paga {
      background: #d5f2dd !important;
    }
    .chip-atrasada {
      background: #fbdada !important;
    }
  `],
})
export class CobrancaComponent implements OnInit {
  ano = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1);
  parcelas = signal<ParcelaDoMes[]>([]);
  carregando = signal(true);

  private nomesMeses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  nomeMes(): string {
    return this.nomesMeses[this.mes() - 1];
  }

  totalPendente(): number {
    return this.parcelas()
      .filter((p) => p.status !== 'paga')
      .reduce((soma, p) => soma + p.valor, 0);
  }

  totalRecebido(): number {
    return this.parcelas()
      .filter((p) => p.status === 'paga')
      .reduce((soma, p) => soma + p.valor, 0);
  }

  statusLabel(status: string): string {
    if (status === 'paga') return 'Paga';
    if (status === 'atrasada') return 'Atrasada';
    return 'Pendente';
  }

  async mesAnterior(): Promise<void> {
    if (this.mes() === 1) {
      this.mes.set(12);
      this.ano.update((a) => a - 1);
    } else {
      this.mes.update((m) => m - 1);
    }
    await this.carregar();
  }

  async proximoMes(): Promise<void> {
    if (this.mes() === 12) {
      this.mes.set(1);
      this.ano.update((a) => a + 1);
    } else {
      this.mes.update((m) => m + 1);
    }
    await this.carregar();
  }

  linkWhatsapp(p: ParcelaDoMes): string {
    const telefone = (p.cliente_telefone || '').replace(/\D/g, '');
    const dataFormatada = new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR');
    const mensagem =
      `Oi, ${p.cliente_nome}! Passando para lembrar da parcela ${p.numero}/${p.num_parcelas} ` +
      `de ${p.descricao_produto}, no valor de ${p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, ` +
      `com vencimento em ${dataFormatada}. Pode confirmar pra mim? 😊`;
    return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
  }

  async marcarPaga(p: ParcelaDoMes): Promise<void> {
    await this.api.marcarParcelaPaga(p.id);
    p.status = 'paga';
    this.parcelas.set([...this.parcelas()]);
  }

  private carregamentoAtual = 0;

  private async carregar(): Promise<void> {
    const id = ++this.carregamentoAtual;
    this.carregando.set(true);
    try {
      const resultado = await this.api.listarParcelasDoMes(this.ano(), this.mes());
      if (id !== this.carregamentoAtual) return; // resposta de uma navegação já superada
      this.parcelas.set(resultado);
    } finally {
      if (id === this.carregamentoAtual) this.carregando.set(false);
    }
  }
}
