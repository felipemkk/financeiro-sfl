import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-casa-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="subnav">
      <a routerLink="/casa" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="subnav-item">
        Despesas
      </a>
      <a routerLink="/casa/receitas" routerLinkActive="active" class="subnav-item">Receitas</a>
      <a routerLink="/casa/resumo" routerLinkActive="active" class="subnav-item">Resumo</a>
    </nav>
  `,
  styles: [`
    .subnav {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    .subnav-item {
      flex: 1;
      text-align: center;
      padding: 10px 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--ink-faint);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .subnav-item.active {
      color: var(--accent-ink);
      border-bottom-color: var(--brass);
    }
  `],
})
export class CasaNavComponent {}
