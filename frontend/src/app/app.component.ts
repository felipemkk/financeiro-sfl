import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    @if (mostrarShell()) {
      <header class="topbar">
        <span class="brand">Financeiro <em>SFL</em></span>
        <button class="sair" (click)="auth.logout()" aria-label="Sair">
          <mat-icon>logout</mat-icon>
          Sair
        </button>
      </header>
    }

    <main class="app-content">
      <router-outlet></router-outlet>
    </main>

    @if (mostrarShell()) {
      <nav class="bottom-nav">
        <a routerLink="/home" routerLinkActive="active" class="nav-item">
          <mat-icon>home</mat-icon>
          <span>Início</span>
        </a>
        <a routerLink="/cobranca" routerLinkActive="active" class="nav-item">
          <mat-icon>event_available</mat-icon>
          <span>Cobrança</span>
        </a>
        <a routerLink="/clientes" routerLinkActive="active" class="nav-item">
          <mat-icon>people</mat-icon>
          <span>Clientes</span>
        </a>
        <a routerLink="/vendas/nova" routerLinkActive="active" class="nav-item">
          <mat-icon>add_shopping_cart</mat-icon>
          <span>Nova venda</span>
        </a>
      </nav>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
      background: var(--paper);
    }
    .topbar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--paper-raised);
    }
    .brand {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 500;
      color: var(--ink);
      letter-spacing: 0.01em;
    }
    .brand em {
      font-style: normal;
      color: var(--brass);
    }
    .sair {
      display: flex;
      align-items: center;
      gap: 4px;
      font-family: var(--font-body);
      font-size: 0.75rem;
      color: var(--ink-faint);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
    }
    .sair:hover { color: var(--ink); }
    .sair mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .app-content {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
    }
    .bottom-nav {
      flex: 0 0 auto;
      display: flex;
      background: var(--paper-raised);
      border-top: 1px solid var(--border);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 9px 0 10px;
      text-decoration: none;
      color: var(--ink-faint);
      font-size: 0.6875rem;
      font-family: var(--font-body);
      position: relative;
    }
    .nav-item mat-icon {
      font-size: 21px;
      width: 21px;
      height: 21px;
    }
    .nav-item.active {
      color: var(--accent-ink);
    }
    .nav-item.active::before {
      content: "";
      position: absolute;
      top: 4px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--brass);
    }
  `],
})
export class AppComponent {
  private urlAtual = signal('');

  constructor(public auth: AuthService, private router: Router) {
    this.urlAtual.set(this.router.url);
    this.router.events
      .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
      .subscribe((evento) => this.urlAtual.set(evento.urlAfterRedirects));
  }

  // A vitrine pública (/vitrine) é uma página separada, sem o shell do app —
  // mesmo quando quem está navegando está logada. A área de gestão
  // (/vitrine/gerenciar) continua usando o shell normal.
  mostrarShell(): boolean {
    const caminho = this.urlAtual().split('?')[0];
    return this.auth.logado() && caminho !== '/vitrine';
  }
}
