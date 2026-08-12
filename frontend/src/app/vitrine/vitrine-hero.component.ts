import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { ImagemCarrossel } from '../core/models';

const MAPA_POSICAO: Record<string, string> = { top: 'center top', center: 'center center', bottom: 'center bottom' };

@Component({
  selector: 'app-vitrine-hero',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="hero">
      <div class="hero-texto">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>
          @for (linha of linhasTitulo(); track $index) {
            {{ linha }}@if (!$last) {<br>}
          }
        </h1>
        <p class="hero-sub">{{ subtitulo }}</p>
        @if (ctaTexto && ctaHref) {
          <a class="btn-hero" [href]="ctaHref">{{ ctaTexto }}</a>
        }
        @if (imagens().length > 1) {
          <div class="slide-dots">
            @for (img of imagens(); track img.id; let i = $index) {
              <span class="dot" [class.ativo]="i === indiceAtual()" (click)="irPara(i)">{{ (i + 1) | number:'2.0' }}</span>
              @if (!$last) { <span class="linha"></span> }
            }
          </div>
        }
      </div>
      <div class="hero-imagem">
        @if (imagemAtual()) {
          <img [src]="imagemAtual()" [style.object-position]="posicaoAtual()" alt="" />
        } @else {
          <div class="placeholder-imagem"></div>
        }
      </div>
    </section>
  `,
  styles: [`
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
    .dot { cursor: pointer; }
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
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; padding: 32px 20px; }
    }
  `],
})
export class VitrineHeroComponent implements OnInit, OnDestroy {
  @Input() escopo = 'principal';
  @Input() eyebrow = '';
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() ctaTexto = '';
  @Input() ctaHref = '';

  imagens = signal<ImagemCarrossel[]>([]);
  indiceAtual = signal(0);

  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    this.imagens.set(await this.api.listarCarrossel(this.escopo));
    if (this.imagens().length > 1) {
      this.intervalo = setInterval(() => this.proxima(), 5000);
    }
  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  linhasTitulo(): string[] {
    return this.titulo.split('\n');
  }

  imagemAtual(): string | null {
    return this.imagens()[this.indiceAtual()]?.imagem_url ?? null;
  }

  posicaoAtual(): string {
    const posicao = this.imagens()[this.indiceAtual()]?.posicao ?? 'center';
    return MAPA_POSICAO[posicao] ?? MAPA_POSICAO['center'];
  }

  irPara(indice: number): void {
    this.indiceAtual.set(indice);
  }

  private proxima(): void {
    this.indiceAtual.set((this.indiceAtual() + 1) % this.imagens().length);
  }
}
