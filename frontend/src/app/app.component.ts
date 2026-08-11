import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
  ],
  template: `
    @if (auth.logado()) {
      <mat-toolbar color="primary" class="app-toolbar">
        <span>Financeiro SFL</span>
        <span class="spacer"></span>
        <button mat-icon-button (click)="auth.logout()" aria-label="Sair">
          <mat-icon>logout</mat-icon>
        </button>
      </mat-toolbar>
    }

    <main class="app-content" [class.with-nav]="auth.logado()">
      <router-outlet></router-outlet>
    </main>

    @if (auth.logado()) {
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
      display: block;
      min-height: 100dvh;
    }
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .app-content {
      min-height: 100dvh;
      box-sizing: border-box;
    }
    .app-content.with-nav {
      padding-bottom: calc(64px + env(safe-area-inset-bottom));
    }
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      background: white;
      border-top: 1px solid rgba(0, 0, 0, 0.12);
      padding-bottom: env(safe-area-inset-bottom);
      z-index: 10;
    }
    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 8px 0;
      text-decoration: none;
      color: rgba(0, 0, 0, 0.6);
      font-size: 0.7rem;
    }
    .nav-item.active {
      color: var(--mat-sys-primary, #1976d2);
    }
  `],
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}
}
