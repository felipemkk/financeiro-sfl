import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { LancamentoCasa, TipoLancamentoCasa } from '../core/models';
import { CasaNavComponent } from './casa-nav.component';

@Component({
  selector: 'app-casa-lancamentos',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule, CasaNavComponent],
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

      <div class="totals-strip">
        <div class="prev">
          <p class="t-label">Previsto</p>
          <p class="t-value amt">{{ totalPrevisto() | currency:'BRL' }}</p>
        </div>
        <div class="real">
          <p class="t-label">{{ tipo === 'receita' ? 'Recebido' : 'Pago' }}</p>
          <p class="t-value amt">{{ totalRealizado() | currency:'BRL' }}</p>
        </div>
      </div>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (lancamentos().length === 0) {
        <p class="vazio">Nenhum{{ tipo === 'receita' ? 'a receita' : 'a despesa' }} cadastrada para este mês.</p>
      } @else {
        @for (l of lancamentos(); track l.id) {
          <div class="card lancamento-card" [class.paga]="l.status === 'paga'">
            <div class="card-top">
              <span class="categoria">{{ l.categoria }}</span>
              <span class="pill" [class.pill-paga]="l.status === 'paga'" [class.pill-pendente]="l.status === 'pendente'" [class.pill-atrasada]="l.status === 'atrasada'">
                {{ statusLabel(l.status) }}
              </span>
            </div>
            <p class="desc">
              {{ l.descricao }}
              @if (l.tipo_recorrencia !== 'pontual') {
                <span class="tag-recorrente">{{ l.tipo_recorrencia === 'fixa' ? 'recorrente fixa' : 'recorrente variável' }}</span>
              }
            </p>
            <div class="card-bottom">
              <span class="amt valor">{{ l.valor_previsto | currency:'BRL' }}</span>
              @if (l.data_vencimento) {
                <span class="due">vence {{ l.data_vencimento | date:'dd/MM' }}</span>
              }
            </div>

            <div class="card-actions">
              @if (l.status !== 'paga') {
                <a class="btn" [routerLink]="['/casa/lancamentos', l.id]">Editar</a>
                <button class="btn btn-primary" (click)="marcarPaga(l)">Marcar {{ tipo === 'receita' ? 'recebida' : 'paga' }}</button>
              } @else {
                <a class="btn" [routerLink]="['/casa/lancamentos', l.id]">Editar</a>
                <button class="btn" (click)="despagar(l)">Reabrir</button>
              }
            </div>
          </div>
        }
      }

      <a class="btn btn-primary btn-block novo-btn" [routerLink]="['/casa/novo']" [queryParams]="{ tipo, ano: ano(), mes: mes() }">
        + {{ tipo === 'receita' ? 'Nova receita' : 'Nova despesa' }}
      </a>
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
    .real .t-value { color: var(--accent-ink); }
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
    .lancamento-card {
      margin-bottom: 12px;
    }
    .lancamento-card.paga {
      background: var(--accent-weak);
      border-color: transparent;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .categoria {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ink);
    }
    .desc {
      color: var(--ink-muted);
      margin: 2px 0 10px;
      font-size: 0.8125rem;
    }
    .tag-recorrente {
      display: inline-block;
      margin-left: 6px;
      font-size: 0.6875rem;
      color: var(--brass);
      background: var(--brass-weak);
      border-radius: 100px;
      padding: 1px 8px;
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
    .novo-btn {
      margin-top: 8px;
      text-decoration: none;
    }
  `],
})
export class CasaLancamentosComponent implements OnInit {
  tipo: TipoLancamentoCasa = 'despesa';
  ano = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1);
  lancamentos = signal<LancamentoCasa[]>([]);
  carregando = signal(true);

  private nomesMeses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.tipo = (this.route.snapshot.data['tipo'] as TipoLancamentoCasa) ?? 'despesa';
    await this.carregar();
  }

  nomeMes(): string {
    return this.nomesMeses[this.mes() - 1];
  }

  totalPrevisto(): number {
    return this.lancamentos().reduce((soma, l) => soma + l.valor_previsto, 0);
  }

  totalRealizado(): number {
    return this.lancamentos()
      .filter((l) => l.status === 'paga')
      .reduce((soma, l) => soma + l.valor_realizado, 0);
  }

  statusLabel(status: string): string {
    if (status === 'paga') return this.tipo === 'receita' ? 'Recebida' : 'Paga';
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

  async marcarPaga(l: LancamentoCasa): Promise<void> {
    const atualizado = await this.api.pagarLancamentoCasa(l.id);
    this.substituir(atualizado);
  }

  async despagar(l: LancamentoCasa): Promise<void> {
    await this.api.despagarLancamentoCasa(l.id);
    l.status = 'pendente';
    l.valor_realizado = 0;
    this.lancamentos.set([...this.lancamentos()]);
  }

  private substituir(atualizado: LancamentoCasa): void {
    this.lancamentos.set(this.lancamentos().map((l) => (l.id === atualizado.id ? atualizado : l)));
  }

  private carregamentoAtual = 0;

  private async carregar(): Promise<void> {
    const id = ++this.carregamentoAtual;
    this.carregando.set(true);
    try {
      const resultado = await this.api.listarLancamentosCasa(this.ano(), this.mes(), this.tipo);
      if (id !== this.carregamentoAtual) return;
      this.lancamentos.set(resultado);
    } finally {
      if (id === this.carregamentoAtual) this.carregando.set(false);
    }
  }
}
