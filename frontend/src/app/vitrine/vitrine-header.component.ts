import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { linkWhatsapp } from './vitrine.constants';

const CATEGORIAS = [
  { nome: 'Bolsas', clicavel: true },
  { nome: 'Sapatos', clicavel: true },
  { nome: 'Acessórios', clicavel: false },
  { nome: 'Joias', clicavel: false },
  { nome: 'Óculos', clicavel: false },
];

@Component({
  selector: 'app-vitrine-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="anuncio">
      <span>FRETE GRÁTIS PARA TODO O BRASIL</span>
      <a class="anuncio-contato" [href]="linkWhatsappGeral()" target="_blank" rel="noopener">
        ATENDIMENTO EXCLUSIVO
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.07-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.11-.44-4.4-1.2l-.32-.19-3.01.79.8-2.93-.2-.31A7.93 7.93 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.29-5.71c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.53.12-.16.24-.61.77-.75.93-.14.16-.28.18-.51.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.18-1.39-1.31-1.63-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.28-.73-1.75-.19-.46-.39-.4-.53-.4h-.45c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28z"/></svg>
      </a>
    </div>

    <header class="topo">
      <button type="button" class="icone-menu" (click)="menuAberto.set(!menuAberto())" aria-label="Menu">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>

      <a routerLink="/vitrine" class="logo">LUX<span class="logo-acento">È</span></a>

      <div class="icones-topo">
        <span class="icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        </span>
        <span class="icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>
        </span>
        <span class="icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
          <span class="badge-carrinho">0</span>
        </span>
      </div>

      <nav class="nav-categorias" [class.aberto]="menuAberto()">
        @for (c of categorias; track c.nome) {
          @if (c.clicavel) {
            <a [routerLink]="['/vitrine/categoria', c.nome]" [class.ativa]="categoriaAtiva === c.nome">{{ c.nome | uppercase }}</a>
          } @else {
            <span class="nav-decorativa">{{ c.nome | uppercase }}</span>
          }
        }
      </nav>
    </header>
  `,
  styles: [`
    .anuncio {
      background: var(--v-preto);
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 24px;
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
    }
    .anuncio-contato {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #fff;
      text-decoration: none;
    }
    .topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      position: relative;
      flex-wrap: wrap;
      gap: 12px;
      border-bottom: 1px solid var(--v-border);
    }
    .icone-menu {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--v-ink);
      padding: 4px;
      order: 1;
    }
    .logo {
      font-family: var(--font-display);
      font-size: 1.75rem;
      letter-spacing: 0.15em;
      font-weight: 500;
      order: 2;
      margin: 0 auto;
      color: var(--v-ink);
      text-decoration: none;
    }
    .logo-acento { font-style: italic; }
    .icones-topo {
      display: flex;
      align-items: center;
      gap: 18px;
      order: 3;
    }
    .icone {
      position: relative;
      color: var(--v-ink);
      display: inline-flex;
    }
    .badge-carrinho {
      position: absolute;
      top: -7px;
      right: -8px;
      background: var(--v-preto);
      color: #fff;
      font-size: 0.5625rem;
      border-radius: 50%;
      width: 15px;
      height: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-categorias {
      order: 4;
      width: 100%;
      display: flex;
      justify-content: center;
      gap: 28px;
      flex-wrap: wrap;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      padding-top: 6px;
    }
    .nav-categorias a, .nav-decorativa {
      color: var(--v-ink);
      text-decoration: none;
      cursor: pointer;
      padding-bottom: 3px;
      border-bottom: 1px solid transparent;
    }
    .nav-decorativa { color: var(--v-ink-faint); cursor: default; }
    .nav-categorias a:hover, .nav-categorias a.ativa {
      border-bottom-color: var(--v-ink);
    }
    @media (max-width: 900px) {
      .nav-categorias { display: none; }
      .nav-categorias.aberto { display: flex; }
    }
    @media (min-width: 901px) {
      .icone-menu { display: none; }
    }
  `],
})
export class VitrineHeaderComponent {
  @Input() categoriaAtiva: string | null = null;

  categorias = CATEGORIAS;
  menuAberto = signal(false);

  linkWhatsappGeral(): string {
    return linkWhatsapp('Olá! Vim pela vitrine online e gostaria de mais informações.');
  }
}
