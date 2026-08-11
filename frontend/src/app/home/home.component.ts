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
      <h1>Resumo</h1>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (resumo()) {
        @let r = resumo()!;
        <div class="grid">
          <a class="card atraso" routerLink="/cobranca">
            <mat-icon class="icone">error</mat-icon>
            <span class="numero">{{ r.atrasados_qtd }}</span>
            <span class="rotulo">Pagamentos em atraso</span>
            <span class="valor">{{ r.atrasados_total | currency:'BRL' }}</span>
          </a>

          <a class="card hoje" routerLink="/cobranca">
            <mat-icon class="icone">today</mat-icon>
            <span class="numero">{{ r.hoje_qtd }}</span>
            <span class="rotulo">A receber hoje</span>
            <span class="valor">{{ r.hoje_total | currency:'BRL' }}</span>
          </a>

          <a class="card clientes" routerLink="/clientes">
            <mat-icon class="icone">people</mat-icon>
            <span class="numero">{{ r.clientes_total }}</span>
            <span class="rotulo">Clientes cadastrados</span>
          </a>

          <div class="card vendas">
            <mat-icon class="icone">trending_up</mat-icon>
            <span class="numero">{{ r.vendas_mes_total | currency:'BRL' }}</span>
            <span class="rotulo">Total de vendas no mês</span>
            <span class="valor">{{ r.vendas_mes_qtd }} venda(s)</span>
          </div>
        </div>
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
    h1 {
      font-size: 1.25rem;
      margin: 0 0 16px;
    }
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 16px;
      border-radius: 10px;
      text-decoration: none;
      color: inherit;
      border-left: 4px solid transparent;
    }
    .icone {
      margin-bottom: 6px;
      opacity: 0.8;
    }
    .numero {
      font-size: 1.4rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .rotulo {
      font-size: 0.8rem;
      color: rgba(0, 0, 0, 0.6);
    }
    .valor {
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 4px;
    }
    .atraso {
      background: #fdf1f0;
      border-left-color: #e57373;
    }
    .atraso .icone {
      color: #d32f2f;
    }
    .hoje {
      background: #e8f0fe;
      border-left-color: #4285f4;
    }
    .hoje .icone {
      color: #1a56db;
    }
    .clientes {
      background: #f5f5f5;
      border-left-color: #9e9e9e;
    }
    .clientes .icone {
      color: #616161;
    }
    .vendas {
      background: #eef8ef;
      border-left-color: #4caf50;
    }
    .vendas .icone {
      color: #2e7d32;
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
