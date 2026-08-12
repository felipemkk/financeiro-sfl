import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { ResumoCasa } from '../core/models';
import { CasaNavComponent } from './casa-nav.component';

@Component({
  selector: 'app-casa-resumo',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, CasaNavComponent],
  template: `
    <div class="page">
      <app-casa-nav></app-casa-nav>

      <div class="mes-seletor">
        <button class="btn btn-icon" (click)="mesAnterior()" aria-label="Mês anterior">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="mes-label">{{ nomeMes() }} de {{ ano() }}</span>
        <button class="btn btn-icon" (click)="proximoMes()" aria-label="Próximo mês">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (resumo()) {
        @let r = resumo()!;
        <div class="card visao-geral">
          <div class="linha">
            <span>Receitas previstas</span>
            <span class="amt">{{ r.receitas_previsto | currency:'BRL' }}</span>
          </div>
          <div class="linha">
            <span>Receitas recebidas</span>
            <span class="amt">{{ r.receitas_realizado | currency:'BRL' }}</span>
          </div>
          <div class="linha">
            <span>Despesas previstas</span>
            <span class="amt">{{ r.despesas_previsto | currency:'BRL' }}</span>
          </div>
          <div class="linha">
            <span>Despesas pagas</span>
            <span class="amt">{{ r.despesas_realizado | currency:'BRL' }}</span>
          </div>
          <div class="linha destaque" [class.negativo]="r.saldo_realizado < 0">
            <span>Saldo do mês</span>
            <span class="amt">{{ r.saldo_realizado | currency:'BRL' }}</span>
          </div>
        </div>

        <p class="section-label">Despesas por categoria</p>
        @if (r.por_categoria.length === 0) {
          <p class="vazio">Nenhuma despesa cadastrada para este mês.</p>
        } @else {
          @for (c of r.por_categoria; track c.categoria) {
            <div class="categoria-linha">
              <div class="categoria-topo">
                <span class="categoria-nome">{{ c.categoria }}</span>
                <span class="amt">{{ c.previsto | currency:'BRL' }} ({{ c.percentual | number:'1.0-1' }}%)</span>
              </div>
              <div class="barra">
                <div class="barra-fill" [style.width.%]="c.percentual"></div>
              </div>
            </div>
          }
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
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .vazio {
      color: var(--ink-muted);
      padding: 8px 0 24px;
      font-size: 0.875rem;
    }
    .visao-geral {
      padding: 4px 16px;
      margin-bottom: 24px;
    }
    .visao-geral .linha {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 11px 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.8125rem;
      color: var(--ink-muted);
    }
    .visao-geral .linha:last-child { border-bottom: none; }
    .visao-geral .linha .amt {
      font-family: var(--font-body);
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      font-weight: 600;
      font-size: 0.9375rem;
    }
    .visao-geral .linha.destaque {
      margin: 0 -16px;
      padding: 12px 16px;
      background: var(--brass-weak);
      color: var(--ink);
      font-weight: 600;
      border-radius: 0 0 11px 11px;
    }
    .visao-geral .linha.destaque .amt { color: var(--brass); font-size: 1.125rem; }
    .visao-geral .linha.destaque.negativo { background: var(--critical-weak); }
    .visao-geral .linha.destaque.negativo .amt { color: var(--critical-ink); }
    .categoria-linha { margin-bottom: 14px; }
    .categoria-topo {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--ink);
      margin-bottom: 6px;
    }
    .categoria-topo .amt {
      color: var(--ink-muted);
      font-variant-numeric: tabular-nums;
    }
    .barra {
      height: 6px;
      border-radius: 100px;
      background: var(--border);
      overflow: hidden;
    }
    .barra-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 100px;
    }
  `],
})
export class CasaResumoComponent implements OnInit {
  ano = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1);
  resumo = signal<ResumoCasa | null>(null);
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

  private carregamentoAtual = 0;

  private async carregar(): Promise<void> {
    const id = ++this.carregamentoAtual;
    this.carregando.set(true);
    try {
      const resultado = await this.api.obterResumoCasa(this.ano(), this.mes());
      if (id !== this.carregamentoAtual) return;
      this.resumo.set(resultado);
    } finally {
      if (id === this.carregamentoAtual) this.carregando.set(false);
    }
  }
}
