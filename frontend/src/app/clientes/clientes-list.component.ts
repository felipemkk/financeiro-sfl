import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { Cliente } from '../core/models';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <p class="section-label">Clientes</p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Buscar por nome</mat-label>
        <input matInput [(ngModel)]="busca" (ngModelChange)="onBuscaChange()" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (clientes().length === 0) {
        <p class="vazio">Nenhuma cliente encontrada.</p>
      } @else {
        <div class="lista">
          @for (c of clientes(); track c.id) {
            <a class="linha" [routerLink]="['/clientes', c.id]">
              <span class="avatar">{{ iniciais(c.nome) }}</span>
              <span class="info">
                <span class="nome">{{ c.nome }}</span>
                <span class="telefone">{{ c.telefone || 'sem telefone' }}</span>
              </span>
              <mat-icon class="seta">chevron_right</mat-icon>
            </a>
          }
        </div>
      }
    </div>

    <a class="fab-add" routerLink="/clientes/novo" aria-label="Nova cliente">
      <mat-icon>add</mat-icon>
    </a>
  `,
  styles: [`
    .page {
      padding: 20px;
      padding-bottom: 24px;
      max-width: 640px;
      margin: 0 auto;
    }
    .full-width {
      width: 100%;
    }
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
    .lista {
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      background: var(--paper-raised);
    }
    .linha {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
      text-decoration: none;
      color: inherit;
      border-bottom: 1px solid var(--border);
    }
    .linha:last-child { border-bottom: none; }
    .linha:hover { background: var(--accent-weak); }
    .avatar {
      flex: 0 0 auto;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--accent-weak);
      color: var(--accent-ink);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 0.875rem;
    }
    .info {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .nome {
      font-size: 0.9375rem;
      color: var(--ink);
    }
    .telefone {
      font-size: 0.8125rem;
      color: var(--ink-faint);
    }
    .seta {
      color: var(--ink-faint);
      flex: 0 0 auto;
    }
    .fab-add {
      position: fixed;
      right: 20px;
      bottom: calc(84px + env(safe-area-inset-bottom));
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--paper-raised);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow);
      text-decoration: none;
    }
    .fab-add:hover { background: var(--accent-ink); }
  `],
})
export class ClientesListComponent implements OnInit {
  clientes = signal<Cliente[]>([]);
  carregando = signal(true);
  busca = '';
  private buscaTimeout: any;

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  onBuscaChange(): void {
    clearTimeout(this.buscaTimeout);
    this.buscaTimeout = setTimeout(() => this.carregar(), 300);
  }

  iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    const primeiras = partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
    return primeiras.join('') || '?';
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.clientes.set(await this.api.listarClientes(this.busca));
    } finally {
      this.carregando.set(false);
    }
  }
}
