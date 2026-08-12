import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ProdutoVitrine } from '../core/models';

const NUMERO_WHATSAPP_LOJA = '5534997340076';

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
  imports: [CommonModule],
  template: `
    <div class="vitrine">
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

        <span class="logo">LUX<span class="logo-acento">È</span></span>

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
              <a (click)="filtrarCategoria(c.nome)" [class.ativa]="categoriaAtiva() === c.nome">{{ c.nome | uppercase }}</a>
            } @else {
              <span class="nav-decorativa">{{ c.nome | uppercase }}</span>
            }
          }
        </nav>
      </header>

      <section class="hero">
        <div class="hero-texto">
          <p class="eyebrow">NOVA COLEÇÃO</p>
          <h1>Ícones que<br>transcendem<br>o tempo</h1>
          <p class="hero-sub">As peças mais desejadas, selecionadas para mulheres extraordinárias.</p>
          <a class="btn-hero" href="#destaques">DESCUBRA AGORA</a>
          <div class="slide-dots">
            <span class="dot ativo">01</span>
            <span class="linha"></span>
            <span class="dot">02</span>
            <span class="dot">03</span>
          </div>
        </div>
        <div class="hero-imagem">
          @if (imagemHero()) {
            <img [src]="imagemHero()" alt="" />
          } @else {
            <div class="placeholder-imagem"></div>
          }
        </div>
      </section>

      <section class="secao-categorias">
        <p class="rotulo-secao">CATEGORIAS</p>
        <div class="grid-categorias">
          @for (c of categorias; track c.nome) {
            <div class="card-categoria" [class.clicavel]="c.clicavel" (click)="c.clicavel ? filtrarCategoria(c.nome) : null">
              <div class="card-categoria-imagem"></div>
              <p class="card-categoria-nome">{{ c.nome | uppercase }}</p>
              @if (c.clicavel) {
                <span class="card-categoria-link">VER MAIS</span>
              }
            </div>
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
        <div class="destaques-topo">
          <p class="rotulo-secao">
            DESTAQUES
            @if (categoriaAtiva()) {
              <button type="button" class="limpar-filtro" (click)="filtrarCategoria(null)">— limpar filtro de {{ categoriaAtiva() }}</button>
            }
          </p>
        </div>

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
                <div class="card-produto-imagem">
                  <img [src]="p.imagem_url" [alt]="p.nome" />
                  <button type="button" class="icone-coracao" aria-label="Favoritar">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7.5-4.6-10-9.2C.5 8 2 4.5 5.5 4c2-.3 3.7.6 4.5 2 .8-1.4 2.5-2.3 4.5-2 3.5.5 5 4 3.5 7.8-2.5 4.6-10 9.2-10 9.2z"/></svg>
                  </button>
                </div>
                <p class="card-produto-marca">{{ p.marca | uppercase }}</p>
                <p class="card-produto-nome">{{ p.nome }}</p>
                <p class="card-produto-preco">{{ p.preco | currency:'BRL' }}</p>
                @if (numeroWhatsapp) {
                  <a class="card-produto-consultar" [href]="linkWhatsappProduto(p)" target="_blank" rel="noopener">Consultar</a>
                }
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
  `,
  styles: [`
    :host {
      display: block;
      background: var(--v-bg);
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

    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: center;
      padding: 56px 24px;
      max-width: 1280px;
      margin: 0 auto;
    }
    .eyebrow {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: var(--v-ink-muted);
      margin: 0 0 18px;
    }
    .hero-texto h1 {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: clamp(2.25rem, 4.5vw, 3.5rem);
      line-height: 1.12;
      margin: 0 0 20px;
    }
    .hero-sub {
      color: var(--v-ink-muted);
      max-width: 380px;
      line-height: 1.6;
      margin: 0 0 32px;
    }
    .btn-hero {
      display: inline-block;
      background: var(--v-preto);
      color: #fff;
      text-decoration: none;
      padding: 15px 30px;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
    }
    .slide-dots {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 44px;
      font-size: 0.75rem;
      color: var(--v-ink-faint);
    }
    .dot.ativo { color: var(--v-ink); }
    .linha { width: 40px; height: 1px; background: var(--v-border); }
    .hero-imagem img, .placeholder-imagem {
      width: 100%;
      aspect-ratio: 4 / 3.4;
      border-radius: 2px;
      object-fit: cover;
    }
    .placeholder-imagem {
      background: linear-gradient(135deg, var(--v-bg-alt), var(--v-border));
    }

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
    }
    .card-categoria.clicavel { cursor: pointer; }
    .card-categoria-imagem {
      aspect-ratio: 1;
      background: linear-gradient(160deg, var(--v-bg-alt), var(--v-border));
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

    .destaques-topo {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    .limpar-filtro {
      background: none;
      border: none;
      color: var(--v-ink-muted);
      text-decoration: underline;
      cursor: pointer;
      font-size: 0.6875rem;
      padding: 0;
      margin-left: 8px;
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
      position: relative;
      aspect-ratio: 1;
      background: var(--v-bg-alt);
      margin-bottom: 12px;
      overflow: hidden;
    }
    .card-produto-imagem img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .icone-coracao {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.85);
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--v-ink);
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
      .hero { grid-template-columns: 1fr; padding: 32px 20px; }
      .grid-categorias { grid-template-columns: repeat(3, 1fr); }
      .grid-produtos { grid-template-columns: repeat(2, 1fr); }
      .rodape { grid-template-columns: repeat(2, 1fr); }
      .nav-categorias { display: none; }
      .nav-categorias.aberto { display: flex; }
    }
    @media (min-width: 901px) {
      .icone-menu { display: none; }
    }
  `],
})
export class VitrineComponent implements OnInit {
  categorias = CATEGORIAS;
  marcas = MARCAS;
  numeroWhatsapp = NUMERO_WHATSAPP_LOJA;

  produtos = signal<ProdutoVitrine[]>([]);
  carregando = signal(true);
  categoriaAtiva = signal<string | null>(null);
  menuAberto = signal(false);

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    const categoriaInicial = this.route.snapshot.queryParamMap.get('categoria');
    if (categoriaInicial) {
      this.categoriaAtiva.set(categoriaInicial);
    }
    await this.carregar();
  }

  imagemHero(): string | null {
    return this.produtos()[0]?.imagem_url ?? null;
  }

  async filtrarCategoria(categoria: string | null): Promise<void> {
    this.categoriaAtiva.set(categoria);
    this.menuAberto.set(false);
    await this.carregar();
    document.getElementById('destaques')?.scrollIntoView({ behavior: 'smooth' });
  }

  linkWhatsappGeral(): string {
    const mensagem = 'Olá! Vim pela vitrine online e gostaria de mais informações.';
    return `https://wa.me/${this.numeroWhatsapp}?text=${encodeURIComponent(mensagem)}`;
  }

  linkWhatsappProduto(p: ProdutoVitrine): string {
    const mensagem = `Olá! Tenho interesse em ${p.nome}${p.marca ? ' (' + p.marca + ')' : ''}, no valor de ${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Ainda está disponível?`;
    return `https://wa.me/${this.numeroWhatsapp}?text=${encodeURIComponent(mensagem)}`;
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const categoria = this.categoriaAtiva();
      this.produtos.set(await this.api.listarProdutosVitrine(categoria ? { categoria } : { destaque: true }));
    } finally {
      this.carregando.set(false);
    }
  }
}
