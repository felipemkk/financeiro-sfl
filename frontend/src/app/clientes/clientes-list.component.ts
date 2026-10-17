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

      <a class="card link-pendentes" routerLink="/clientes/pendentes">
        <mat-icon>how_to_reg</mat-icon>
        <div class="texto">
          <p class="titulo">Cadastros pendentes</p>
          <p class="sub">Respostas do formulário de autocadastro aguardando revisão</p>
        </div>
        @if (totalPendentes() > 0) {
          <span class="badge">{{ totalPendentes() }}</span>
        }
        <mat-icon class="seta">chevron_right</mat-icon>
      </a>

      <button type="button" class="card link-compartilhar" (click)="compartilharLink()">
        <mat-icon>ios_share</mat-icon>
        <div class="texto">
          <p class="titulo">Enviar link de cadastro</p>
          <p class="sub">A cliente preenche os dados dela sozinha, pelo celular</p>
        </div>
      </button>
      @if (linkCopiado()) {
        <p class="copiado">Link copiado!</p>
      }

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
    .link-pendentes, .link-compartilhar {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      text-align: left;
      text-decoration: none;
      color: inherit;
      font-family: inherit;
      cursor: pointer;
      margin-bottom: 10px;
    }
    .link-pendentes mat-icon:first-child,
    .link-compartilhar mat-icon:first-child {
      color: var(--brass);
      flex: 0 0 auto;
    }
    .texto { flex: 1; min-width: 0; }
    .titulo {
      margin: 0 0 2px;
      font-family: var(--font-display);
      font-size: 0.9375rem;
      color: var(--ink);
    }
    .sub {
      margin: 0;
      font-size: 0.75rem;
      color: var(--ink-muted);
    }
    .badge {
      flex: 0 0 auto;
      background: var(--critical-ink);
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 600;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }
    .seta { color: var(--ink-faint); flex: 0 0 auto; }
    .copiado {
      font-size: 0.75rem;
      color: var(--accent-ink);
      margin: -4px 0 12px;
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
  totalPendentes = signal(0);
  linkCopiado = signal(false);
  busca = '';
  private buscaTimeout: any;

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    await this.carregar();
    this.api.listarClientesPendentes().then((pendentes) => this.totalPendentes.set(pendentes.length));
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

  async compartilharLink(): Promise<void> {
    const link = `${window.location.origin}/cadastro`;
    const mensagem = `Olá! Pra agilizar seu cadastro, preenche seus dados por aqui: ${link}`;
    try {
      await navigator.clipboard.writeText(mensagem);
      this.linkCopiado.set(true);
      setTimeout(() => this.linkCopiado.set(false), 2500);
    } catch {
      // Clipboard indisponível (ex: sem HTTPS) — abre o WhatsApp mesmo assim.
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
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
