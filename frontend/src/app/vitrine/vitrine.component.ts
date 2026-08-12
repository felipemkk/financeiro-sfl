import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ProdutoVitrine } from '../core/models';
import { linkWhatsappProduto as gerarLinkWhatsappProduto } from './vitrine.constants';
import { VitrineHeaderComponent } from './vitrine-header.component';
import { VitrineHeroComponent } from './vitrine-hero.component';
import { VitrineProdutoModalComponent } from './vitrine-produto-modal.component';

const MARCAS = [
  { nome: 'Chanel', logo: null },
  { nome: 'Louis Vuitton', logo: 'marcas/louis-vuitton.png' },
  { nome: 'Gucci', logo: 'marcas/gucci.png' },
  { nome: 'Prada', logo: 'marcas/prada.png' },
  { nome: 'Saint Laurent', logo: 'marcas/saint-laurent.png' },
  { nome: 'Dior', logo: 'marcas/dior.png' },
  { nome: 'Bottega Veneta', logo: null },
];

const CATEGORIAS = [
  { nome: 'Bolsas', clicavel: true },
  { nome: 'Sapatos', clicavel: true },
  { nome: 'Acessórios', clicavel: false },
  { nome: 'Joias', clicavel: false },
  { nome: 'Óculos', clicavel: false },
];

@Component({
  selector: 'app-vitrine',
  standalone: true,
  imports: [CommonModule, RouterLink, VitrineHeaderComponent, VitrineHeroComponent, VitrineProdutoModalComponent],
  template: `
    <div class="vitrine">
      <app-vitrine-header></app-vitrine-header>

      <app-vitrine-hero
        escopo="principal"
        eyebrow="NOVA COLEÇÃO"
        titulo="Ícones que
transcendem
o tempo"
        subtitulo="As peças mais desejadas, selecionadas para mulheres extraordinárias."
        ctaTexto="DESCUBRA AGORA"
        ctaHref="#destaques"
      ></app-vitrine-hero>

      <section class="secao-categorias">
        <p class="rotulo-secao">CATEGORIAS</p>
        <div class="grid-categorias">
          @for (c of categorias; track c.nome) {
            @if (c.clicavel) {
              <a class="card-categoria clicavel" [routerLink]="['/vitrine/categoria', c.nome]">
                <div class="card-categoria-imagem" [style.backgroundImage]="capaEstilo(c.nome)"></div>
                <p class="card-categoria-nome">{{ c.nome | uppercase }}</p>
                <span class="card-categoria-link">VER MAIS</span>
              </a>
            } @else {
              <div class="card-categoria">
                <div class="card-categoria-imagem" [style.backgroundImage]="capaEstilo(c.nome)"></div>
                <p class="card-categoria-nome">{{ c.nome | uppercase }}</p>
              </div>
            }
          }
        </div>
      </section>

      <section class="secao-marcas">
        <p class="rotulo-secao">MARCAS EXCLUSIVAS</p>
        <div class="carrossel-marcas">
          @for (marca of marcas; track marca.nome) {
            @if (marca.logo) {
              <img class="marca-logo" [src]="marca.logo" [alt]="marca.nome" />
            } @else {
              <span class="marca-nome">{{ marca.nome }}</span>
            }
          }
        </div>
      </section>

      <section class="secao-destaques" id="destaques">
        <p class="rotulo-secao">DESTAQUES</p>

        @if (carregando()) {
          <p class="carregando">Carregando…</p>
        } @else if (produtos().length === 0) {
          <div class="vazio">
            <p>Em breve, novidades por aqui.</p>
          </div>
        } @else {
          <div class="grid-produtos">
            @for (p of produtos(); track p.id) {
              <div class="card-produto">
                <button type="button" class="card-produto-imagem" (click)="produtoSelecionado.set(p)">
                  <img [src]="p.imagem_url" [alt]="p.nome" />
                </button>
                <p class="card-produto-marca">{{ p.marca | uppercase }}</p>
                @if (p.nome) {
                  <p class="card-produto-nome">{{ p.nome }}</p>
                }
                @if (p.preco > 0) {
                  <p class="card-produto-preco">{{ p.preco | currency:'BRL' }}</p>
                }
                <a class="card-produto-consultar" [href]="linkWhatsappProduto(p)" target="_blank" rel="noopener">Consultar</a>
              </div>
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
    .secao-categorias, .secao-marcas, .secao-destaques {
      padding: 40px 24px;
      max-width: 1280px;
      margin: 0 auto;
    }
    .grid-categorias {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
    }
    .card-categoria {
      position: relative;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .card-categoria.clicavel { cursor: pointer; }
    .card-categoria-imagem {
      aspect-ratio: 1;
      background-color: var(--v-bg-alt);
      background-image: linear-gradient(160deg, var(--v-bg-alt), var(--v-border));
      background-size: cover;
      background-position: center;
      margin-bottom: 10px;
    }
    .card-categoria-nome {
      font-size: 0.8125rem;
      letter-spacing: 0.05em;
      margin: 0 0 2px;
    }
    .card-categoria-link {
      font-size: 0.6875rem;
      text-decoration: underline;
      color: var(--v-ink-muted);
    }

    .carrossel-marcas {
      display: flex;
      gap: 48px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .carrossel-marcas::-webkit-scrollbar { display: none; }
    .marca-nome {
      font-family: var(--font-display);
      font-size: 1.375rem;
      letter-spacing: 0.04em;
      white-space: nowrap;
      color: var(--v-ink);
      flex: 0 0 auto;
    }
    .marca-logo {
      height: 30px;
      width: auto;
      max-width: 140px;
      object-fit: contain;
      flex: 0 0 auto;
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
    .card-produto-imagem {
      display: block;
      width: 100%;
      aspect-ratio: 1;
      background: var(--v-bg-alt);
      margin-bottom: 12px;
      overflow: hidden;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .card-produto-imagem img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
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
      margin: 0 0 10px;
    }
    .card-produto-consultar {
      display: inline-block;
      border: 1px solid var(--v-preto);
      color: var(--v-preto);
      text-decoration: none;
      font-size: 0.6875rem;
      letter-spacing: 0.06em;
      padding: 8px 14px;
    }
    .card-produto-consultar:hover {
      background: var(--v-preto);
      color: #fff;
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
      .grid-categorias { grid-template-columns: repeat(3, 1fr); }
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
export class VitrineComponent implements OnInit {
  categorias = CATEGORIAS;
  marcas = MARCAS;

  produtos = signal<ProdutoVitrine[]>([]);
  carregando = signal(true);
  produtoSelecionado = signal<ProdutoVitrine | null>(null);
  capas = signal<Record<string, string>>({});

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    this.carregando.set(true);
    try {
      const [produtos, capas] = await Promise.all([
        this.api.listarProdutosVitrine({ destaque: true }),
        this.api.listarProdutosVitrine({ capaCategoria: true }),
      ]);
      this.produtos.set(produtos);
      this.capas.set(Object.fromEntries(capas.map((p) => [p.categoria, p.imagem_url])));
    } finally {
      this.carregando.set(false);
    }
  }

  linkWhatsappProduto(p: ProdutoVitrine): string {
    return gerarLinkWhatsappProduto(p);
  }

  capaEstilo(categoria: string): string {
    const url = this.capas()[categoria];
    return url ? `url("${url}")` : '';
  }
}
