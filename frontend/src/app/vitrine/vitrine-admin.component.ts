import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

const CATEGORIAS = ['Bolsas', 'Sapatos', 'Acessórios', 'Joias', 'Óculos'];

@Component({
  selector: 'app-vitrine-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="page">
      <div class="topo">
        <p class="section-label">Editar Vitrine</p>
        <a class="ver-publica" href="/vitrine" target="_blank" rel="noopener">
          Ver vitrine pública <mat-icon>open_in_new</mat-icon>
        </a>
      </div>

      <a class="card secao-link destaque" [routerLink]="['/vitrine/gerenciar/carrossel', 'principal']">
        <mat-icon>view_carousel</mat-icon>
        <div class="secao-texto">
          <p class="secao-titulo">Carrossel Principal</p>
          <p class="secao-sub">Fotos grandes da página inicial da vitrine</p>
        </div>
        <mat-icon class="seta">chevron_right</mat-icon>
      </a>

      @for (cat of categorias; track cat) {
        <div class="secao-categoria">
          <p class="secao-categoria-titulo">{{ cat }}</p>
          <div class="secao-categoria-links">
            <a class="card secao-link" [routerLink]="['/vitrine/gerenciar/carrossel', cat]">
              <mat-icon>view_carousel</mat-icon>
              <div class="secao-texto">
                <p class="secao-titulo">Carrossel principal</p>
                <p class="secao-sub">Fotos grandes da página de {{ cat }}</p>
              </div>
              <mat-icon class="seta">chevron_right</mat-icon>
            </a>
            <a class="card secao-link" [routerLink]="['/vitrine/gerenciar/catalogo', cat]">
              <mat-icon>grid_view</mat-icon>
              <div class="secao-texto">
                <p class="secao-titulo">Catálogo</p>
                <p class="secao-sub">Produtos cadastrados em {{ cat }}</p>
              </div>
              <mat-icon class="seta">chevron_right</mat-icon>
            </a>
          </div>
        </div>
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
    .topo {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .topo .section-label { margin: 0; }
    .ver-publica {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--accent-ink);
      text-decoration: none;
    }
    .ver-publica mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .secao-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      margin-bottom: 10px;
    }
    .secao-link.destaque {
      margin-bottom: 24px;
      background: var(--brass-weak);
      border-color: transparent;
    }
    .secao-link mat-icon:first-child {
      color: var(--brass);
      flex: 0 0 auto;
    }
    .secao-texto { flex: 1; min-width: 0; }
    .secao-titulo {
      margin: 0 0 2px;
      font-family: var(--font-display);
      font-size: 0.9375rem;
      color: var(--ink);
    }
    .secao-sub {
      margin: 0;
      font-size: 0.75rem;
      color: var(--ink-muted);
    }
    .seta {
      color: var(--ink-faint);
      flex: 0 0 auto;
    }
    .secao-categoria {
      margin-bottom: 20px;
    }
    .secao-categoria-titulo {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      color: var(--ink);
      margin: 0 0 10px;
    }
    .secao-categoria-links {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `],
})
export class VitrineAdminComponent {
  categorias = CATEGORIAS;
}
