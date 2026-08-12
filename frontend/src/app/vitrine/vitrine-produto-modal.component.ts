import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutoVitrine } from '../core/models';
import { linkWhatsappProduto } from './vitrine.constants';

@Component({
  selector: 'app-vitrine-produto-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (produto) {
      <div class="overlay" (click)="fechar.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <button type="button" class="fechar" (click)="fechar.emit()" aria-label="Fechar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>

          <div class="galeria">
            <img [src]="fotos()[indiceAtual()]" [alt]="produto.nome || produto.marca" />
            @if (fotos().length > 1) {
              <button type="button" class="nav anterior" (click)="anterior()" aria-label="Foto anterior">‹</button>
              <button type="button" class="nav proxima" (click)="proxima()" aria-label="Próxima foto">›</button>
              <div class="miniaturas">
                @for (foto of fotos(); track $index; let i = $index) {
                  <button type="button" class="miniatura" [class.ativa]="i === indiceAtual()" (click)="indiceAtual.set(i)">
                    <img [src]="foto" alt="" />
                  </button>
                }
              </div>
            }
          </div>

          <div class="info">
            <p class="marca">{{ produto.marca | uppercase }}</p>
            @if (produto.nome) {
              <p class="nome">{{ produto.nome }}</p>
            }
            @if (produto.preco > 0) {
              <p class="preco">{{ produto.preco | currency:'BRL' }}</p>
            }
            <a class="consultar" [href]="linkContato()" target="_blank" rel="noopener">Consultar no WhatsApp</a>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(17, 16, 16, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 100;
    }
    .modal {
      background: var(--v-bg, #F7F4EE);
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      position: relative;
    }
    .fechar {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255,255,255,0.85);
      border: none;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--v-ink, #17140F);
      z-index: 2;
    }
    .galeria {
      position: relative;
      background: var(--v-bg-alt, #EFEAE0);
    }
    .galeria img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      object-position: center top;
      display: block;
    }
    .nav {
      position: absolute;
      top: 40%;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.85);
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: var(--v-ink, #17140F);
    }
    .anterior { left: 10px; }
    .proxima { right: 10px; }
    .miniaturas {
      display: flex;
      gap: 8px;
      padding: 10px;
      overflow-x: auto;
    }
    .miniatura {
      border: 2px solid transparent;
      padding: 0;
      background: none;
      cursor: pointer;
      flex: 0 0 auto;
    }
    .miniatura.ativa { border-color: var(--v-ink, #17140F); }
    .miniatura img {
      width: 48px;
      height: 48px;
      object-fit: cover;
      display: block;
    }
    .info {
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .marca {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      color: var(--v-ink-muted, #6B6355);
      margin: 0 0 6px;
    }
    .nome {
      font-family: var(--font-display);
      font-size: 1.375rem;
      margin: 0 0 10px;
      color: var(--v-ink, #17140F);
    }
    .preco {
      font-family: var(--font-display);
      font-size: 1.25rem;
      margin: 0 0 24px;
      color: var(--v-ink, #17140F);
    }
    .consultar {
      display: inline-block;
      background: var(--v-preto, #111010);
      color: #fff;
      text-decoration: none;
      padding: 13px 24px;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-align: center;
    }
    @media (max-width: 700px) {
      .modal { grid-template-columns: 1fr; max-height: 95vh; }
    }
  `],
})
export class VitrineProdutoModalComponent implements OnChanges {
  @Input() produto: ProdutoVitrine | null = null;
  @Output() fechar = new EventEmitter<void>();

  indiceAtual = signal(0);

  ngOnChanges(): void {
    this.indiceAtual.set(0);
  }

  fotos(): string[] {
    if (!this.produto) return [];
    return [
      this.produto.imagem_url,
      this.produto.foto_extra_1,
      this.produto.foto_extra_2,
      this.produto.foto_extra_3,
      this.produto.foto_extra_4,
    ].filter((url): url is string => !!url);
  }

  anterior(): void {
    const total = this.fotos().length;
    this.indiceAtual.set((this.indiceAtual() - 1 + total) % total);
  }

  proxima(): void {
    const total = this.fotos().length;
    this.indiceAtual.set((this.indiceAtual() + 1) % total);
  }

  linkContato(): string {
    if (!this.produto) return '';
    return linkWhatsappProduto(this.produto);
  }
}
