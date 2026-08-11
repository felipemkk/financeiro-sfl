import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
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
    MatListModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1>Clientes</h1>

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
        <mat-nav-list>
          @for (c of clientes(); track c.id) {
            <a mat-list-item [routerLink]="['/clientes', c.id]">
              <span matListItemTitle>{{ c.nome }}</span>
              <span matListItemLine>{{ c.telefone || 'sem telefone' }}</span>
            </a>
          }
        </mat-nav-list>
      }
    </div>

    <a mat-fab color="primary" class="fab-add" routerLink="/clientes/novo" aria-label="Nova cliente">
      <mat-icon>add</mat-icon>
    </a>
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
      margin: 0 0 12px;
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
      color: rgba(0, 0, 0, 0.6);
      text-align: center;
      padding: 32px 0;
    }
    .fab-add {
      position: fixed;
      right: 16px;
      bottom: calc(80px + env(safe-area-inset-bottom));
    }
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

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.clientes.set(await this.api.listarClientes(this.busca));
    } finally {
      this.carregando.set(false);
    }
  }
}
