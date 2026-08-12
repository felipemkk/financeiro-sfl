import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { ParcelaDoMes } from '../core/models';

@Component({
  selector: 'app-cobranca',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="mes-seletor">
        <button class="btn btn-icon" (click)="mesAnterior()" aria-label="Mês anterior">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="mes-label">{{ nomeMes() }} de {{ ano() }}</span>
        <button class="btn btn-icon" (click)="proximoMes()" aria-label="Próximo mês">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <div class="totals-strip">
        <div class="receber">
          <p class="t-label">A receber</p>
          <p class="t-value amt">{{ totalPendente() | currency:'BRL' }}</p>
        </div>
        <div class="recebido">
          <p class="t-label">Recebido</p>
          <p class="t-value amt">{{ totalRecebido() | currency:'BRL' }}</p>
        </div>
      </div>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (parcelas().length === 0) {
        <p class="vazio">Nenhuma cobrança prevista para este mês.</p>
      } @else {
        @for (p of parcelas(); track p.id) {
          <div class="card parcela-card" [class.paga]="p.status === 'paga'">
            <div class="card-top">
              <span class="nome">{{ p.cliente_nome }}</span>
              <span class="pill" [class.pill-paga]="p.status === 'paga'" [class.pill-pendente]="p.status === 'pendente'" [class.pill-atrasada]="p.status === 'atrasada'">
                {{ statusLabel(p.status) }}
              </span>
            </div>
            <p class="desc">{{ p.tipo === 'emprestimo' ? 'Empréstimo' : 'Venda' }} #{{ p.venda_id }} — {{ p.descricao_produto }} — parcela {{ p.numero }}/{{ p.num_parcelas }}</p>
            <div class="card-bottom">
              <span class="amt valor">{{ p.valor | currency:'BRL' }}</span>
              <span class="due">vence {{ p.vencimento | date:'dd/MM' }}</span>
            </div>

            <div class="card-actions">
              @if (p.status !== 'paga') {
                <a class="btn" [href]="linkWhatsapp(p)" target="_blank" rel="noopener">
                  <mat-icon>chat</mat-icon>
                  Cobrar
                </a>
                <button class="btn btn-primary" (click)="marcarPaga(p)">
                  Marcar paga
                </button>
              }
              <a class="btn" [routerLink]="['/vendas', p.venda_id]">Ver venda</a>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page {
      padding: 20px;
      padding-bottom: 24px;
      max-width: 640px;
      margin: 0 auto;
    }
    .mes-seletor {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .mes-label {
      font-family: var(--font-display);
      font-size: 1rem;
      min-width: 160px;
      text-align: center;
      text-transform: capitalize;
      color: var(--ink);
    }
    .totals-strip {
      display: flex;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .totals-strip > div {
      flex: 1;
      padding: 14px 16px;
      text-align: center;
    }
    .totals-strip > div + div { border-left: 1px solid var(--border); }
    .t-label {
      font-size: 0.6875rem;
      color: var(--ink-faint);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 6px;
    }
    .t-value {
      font-size: 1.125rem;
      margin: 0;
      color: var(--ink);
    }
    .receber .t-value { color: var(--critical-ink); }
    .recebido .t-value { color: var(--accent-ink); }
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .vazio {
      color: var(--ink-muted);
      text-align: center;
      padding: 32px 0;
    }
    .parcela-card {
      margin-bottom: 12px;
    }
    .parcela-card.paga {
      background: var(--accent-weak);
      border-color: transparent;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .nome {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ink);
    }
    .desc {
      color: var(--ink-muted);
      margin: 2px 0 10px;
      font-size: 0.8125rem;
    }
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
    }
    .card-bottom .valor {
      font-size: 1.25rem;
      color: var(--ink);
    }
    .due {
      font-size: 0.75rem;
      color: var(--ink-faint);
    }
    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .card-actions .btn {
      flex: 1;
    }
    .card-actions .btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
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
    const telefone = (p.cliente_whatsapp || p.cliente_telefone || '').replace(/\D/g, '');
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
