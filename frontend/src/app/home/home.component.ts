import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { DashboardResumo } from '../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <p class="section-label">Resumo do mês</p>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (resumo()) {
        @let r = resumo()!;
        <div class="grid">
          <a class="stat critical" routerLink="/cobranca">
            <p class="stat-label">Em atraso</p>
            <p class="stat-value">{{ r.atrasados_qtd }}</p>
            <p class="stat-sub">{{ r.atrasados_total | currency:'BRL' }}</p>
          </a>

          <a class="stat" routerLink="/cobranca">
            <p class="stat-label">A receber hoje</p>
            <p class="stat-value">{{ r.hoje_qtd }}</p>
            <p class="stat-sub">{{ r.hoje_total | currency:'BRL' }}</p>
          </a>

          <a class="stat" routerLink="/clientes">
            <p class="stat-label">Clientes ativas</p>
            <p class="stat-value">{{ r.clientes_total }}</p>
            <p class="stat-sub">cadastradas</p>
          </a>

          <div class="stat accent">
            <p class="stat-label">Vendido no mês</p>
            <p class="stat-value">{{ r.vendas_mes_total | currency:'BRL' }}</p>
            <p class="stat-sub">{{ r.vendas_mes_qtd }} venda(s)</p>
          </div>
        </div>
      }

      <a class="card action-link" routerLink="/casa">
        <mat-icon>savings</mat-icon>
        <div class="action-texto">
          <p class="action-titulo">Gastos da Casa</p>
          <p class="action-sub">Contas, salários e orçamento doméstico</p>
        </div>
        <mat-icon class="action-seta">chevron_right</mat-icon>
      </a>

      <a class="card action-link" routerLink="/vitrine/gerenciar">
        <mat-icon>storefront</mat-icon>
        <div class="action-texto">
          <p class="action-titulo">Vitrine</p>
          <p class="action-sub">Catálogo público de bolsas e sapatos</p>
        </div>
        <mat-icon class="action-seta">chevron_right</mat-icon>
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
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .stat {
      display: block;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 14px;
      background: var(--paper-raised);
      text-decoration: none;
      color: inherit;
    }
    .stat-label {
      font-size: 0.6875rem;
      color: var(--ink-faint);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 8px;
    }
    .stat-value {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-variant-numeric: tabular-nums;
      margin: 0 0 2px;
      line-height: 1.1;
      color: var(--ink);
    }
    .stat-sub {
      font-size: 0.75rem;
      color: var(--ink-muted);
      font-variant-numeric: tabular-nums;
      margin: 0;
    }
    .stat.critical .stat-value { color: var(--critical-ink); }
    .stat.accent .stat-value { color: var(--accent-ink); }
    .action-link {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
      text-decoration: none;
      color: inherit;
    }
    .action-link mat-icon:first-child {
      color: var(--brass);
      flex: 0 0 auto;
    }
    .action-texto { flex: 1; min-width: 0; }
    .action-titulo {
      margin: 0 0 2px;
      font-family: var(--font-display);
      font-size: 0.9375rem;
      color: var(--ink);
    }
    .action-sub {
      margin: 0;
      font-size: 0.75rem;
      color: var(--ink-muted);
    }
    .action-seta {
      color: var(--ink-faint);
      flex: 0 0 auto;
    }
  `],
})
export class HomeComponent implements OnInit {
  resumo = signal<DashboardResumo | null>(null);
  carregando = signal(true);

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    this.carregando.set(true);
    try {
      this.resumo.set(await this.api.obterDashboard());
    } finally {
      this.carregando.set(false);
    }
  }
}
