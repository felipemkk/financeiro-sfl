import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ProdutoVitrine } from '../core/models';
import { VitrineHeaderComponent } from './vitrine-header.component';
import { VitrineHeroComponent } from './vitrine-hero.component';
import { VitrineProdutoModalComponent } from './vitrine-produto-modal.component';

@Component({
  selector: 'app-vitrine-categoria',
  standalone: true,
  imports: [CommonModule, VitrineHeaderComponent, VitrineHeroComponent, VitrineProdutoModalComponent],
  template: `
    <div class="vitrine">
      <app-vitrine-header [categoriaAtiva]="categoria"></app-vitrine-header>

      <app-vitrine-hero
        [escopo]="categoria"
        eyebrow="COLEÇÃO"
        [titulo]="categoria"
        subtitulo="Peças selecionadas, prontas para fazer parte da sua história."
      ></app-vitrine-hero>

      <section class="secao-catalogo">
        <p class="rotulo-secao">CATÁLOGO</p>

        @if (!carregando() && marcasDisponiveis().length > 1) {
          <div class="filtro-marcas">
            <button
              type="button"
              class="chip-marca"
              [class.ativo]="marcaFiltro() === ''"
              (click)="marcaFiltro.set('')"
            >Todas</button>
            @for (m of marcasDisponiveis(); track m) {
              <button
                type="button"
                class="chip-marca"
                [class.ativo]="marcaFiltro() === m"
                (click)="marcaFiltro.set(m)"
              >{{ m }}</button>
            }
          </div>
        }

        @if (carregando()) {
          <p class="carregando">Carregando…</p>
        } @else if (produtosFiltrados().length === 0) {
          <div class="vazio">
            <p>Em breve, novidades por aqui.</p>
          </div>
        } @else {
          <div class="grid-produtos">
            @for (p of produtosFiltrados(); track p.id) {
              <button type="button" class="card-produto" (click)="produtoSelecionado.set(p)">
                <div class="card-produto-imagem">
                  <img [src]="p.imagem_url" [alt]="p.nome || p.marca" />
                </div>
                <p class="card-produto-marca">{{ p.marca | uppercase }}</p>
                @if (p.nome) {
                  <p class="card-produto-nome">{{ p.nome }}</p>
                }
                @if (p.preco > 0) {
                  <p class="card-produto-preco">{{ p.preco | currency:'BRL' }}</p>
                }
              </button>
            }
          </div>
        }
      </section>

      <footer class="rodape">
        <div class="selo">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 2l3 5 5.5.8-4 3.9.9 5.5-5.4-2.8-5.4 2.8.9-5.5-4-3.9L9 7z"/></svg>
          <p class="selo-titulo">AUTENTICIDADE GARANTIDA</p>
          <p class="selo-texto">Peças 100% originais com certificado de autenticidade.</p>
        </div>
        <div class="selo">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>
          <p class="selo-titulo">FRETE GRÁTIS</p>
          <p class="selo-texto">Para todo o Brasil em compras acima de R$ 2.000.</p>
        </div>
        <div class="selo">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>
          <p class="selo-titulo">EMBALAGEM EXCLUSIVA</p>
          <p class="selo-texto">Cada pedido uma experiência única.</p>
        </div>
        <div class="selo">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h1v-6H5a1 1 0 0 0-1 1z"/><path d="M20 13v4a2 2 0 0 1-2 2h-1v-6h2a1 1 0 0 1 1 1z"/></svg>
          <p class="selo-titulo">ATENDIMENTO PERSONALIZADO</p>
          <p class="selo-texto">Nossa concierge está pronta para te atender.</p>
        </div>
      </footer>
    </div>

    <app-vitrine-produto-modal [produto]="produtoSelecionado()" (fechar)="produtoSelecionado.set(null)"></app-vitrine-produto-modal>
  `,
  styles: [`
    :host {
      display: block;
    }
    .vitrine {
      --v-bg: #F7F4EE;
      --v-bg-alt: #EFEAE0;
      --v-ink: #17140F;
      --v-ink-muted: #6B6355;
      --v-ink-faint: #9A9284;
      --v-border: #E2DCCE;
      --v-preto: #111010;
      --font-display: 'Playfair Display', 'Iowan Old Style', Georgia, serif;
      --font-nav: 'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-family: var(--font-nav);
      color: var(--v-ink);
      background: var(--v-bg);
      min-height: 100vh;
    }
    .vitrine * { box-sizing: border-box; }

    .rotulo-secao {
      font-size: 0.6875rem;
      letter-spacing: 0.14em;
      color: var(--v-ink-muted);
      margin: 0 0 20px;
    }
    .secao-catalogo {
      padding: 40px 24px;
      max-width: 1280px;
      margin: 0 auto;
    }
    .filtro-marcas {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: -8px 0 28px;
    }
    .chip-marca {
      border: 1px solid var(--v-border);
      background: none;
      color: var(--v-ink-muted);
      font-family: var(--font-nav);
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      padding: 7px 16px;
      cursor: pointer;
    }
    .chip-marca.ativo {
      background: var(--v-preto);
      border-color: var(--v-preto);
      color: #fff;
    }
    .carregando, .vazio {
      color: var(--v-ink-muted);
      padding: 40px 0;
      text-align: center;
    }
    .grid-produtos {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }
    .card-produto {
      background: none;
      border: none;
      padding: 0;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      color: inherit;
    }
    .card-produto-imagem {
      aspect-ratio: 1;
      background: var(--v-bg-alt);
      margin-bottom: 12px;
      overflow: hidden;
    }
    .card-produto-imagem img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      transition: transform 0.2s ease;
    }
    .card-produto:hover .card-produto-imagem img {
      transform: scale(1.03);
    }
    .card-produto-marca {
      font-size: 0.6875rem;
      letter-spacing: 0.06em;
      color: var(--v-ink-muted);
      margin: 0 0 2px;
    }
    .card-produto-nome {
      font-size: 0.875rem;
      margin: 0 0 4px;
    }
    .card-produto-preco {
      font-family: var(--font-display);
      font-size: 1rem;
      margin: 0;
    }

    .rodape {
      background: var(--v-preto);
      color: #fff;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      padding: 36px 24px;
      margin-top: 24px;
    }
    .selo { text-align: center; }
    .selo svg { margin-bottom: 10px; }
    .selo-titulo {
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      margin: 0 0 6px;
    }
    .selo-texto {
      font-size: 0.75rem;
      color: #B9B3A6;
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 900px) {
      .grid-produtos { grid-template-columns: repeat(2, 1fr); }
      .rodape { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .rodape {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 22px 20px;
        margin-top: 12px;
      }
      .selo {
        display: flex;
        align-items: center;
        gap: 12px;
        text-align: left;
      }
      .selo svg { margin-bottom: 0; flex: 0 0 auto; width: 20px; height: 20px; }
      .selo-titulo { font-size: 0.6875rem; margin: 0 0 2px; }
      .selo-texto { font-size: 0.6875rem; line-height: 1.4; }
    }
  `],
})
export class VitrineCategoriaComponent implements OnInit {
  categoria = '';
  produtos = signal<ProdutoVitrine[]>([]);
  carregando = signal(true);
  produtoSelecionado = signal<ProdutoVitrine | null>(null);
  marcaFiltro = signal('');

  marcasDisponiveis = computed(() =>
    [...new Set(this.produtos().map((p) => p.marca))].sort((a, b) => a.localeCompare(b))
  );

  produtosFiltrados = computed(() => {
    const marca = this.marcaFiltro();
    return marca ? this.produtos().filter((p) => p.marca === marca) : this.produtos();
  });

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.categoria = this.route.snapshot.paramMap.get('categoria') ?? '';
    this.carregando.set(true);
    try {
      this.produtos.set(await this.api.listarProdutosVitrine({ categoria: this.categoria }));
    } finally {
      this.carregando.set(false);
    }
  }
}
