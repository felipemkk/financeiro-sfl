import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { ProdutoVitrine } from '../core/models';

@Component({
  selector: 'app-vitrine-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="topo">
        <p class="section-label">Vitrine</p>
        <a class="ver-publica" href="/vitrine" target="_blank" rel="noopener">
          Ver vitrine pública <mat-icon>open_in_new</mat-icon>
        </a>
      </div>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (produtos().length === 0) {
        <p class="vazio">Nenhum produto cadastrado ainda.</p>
      } @else {
        @for (p of produtos(); track p.id) {
          <div class="card produto-card" [class.inativo]="!p.ativo">
            <img class="thumb" [src]="p.imagem_url" [alt]="p.nome" />
            <div class="info">
              <p class="nome">{{ p.nome }}</p>
              <p class="detalhe">{{ p.categoria }} @if (p.marca) { — {{ p.marca }} }</p>
              <p class="preco amt">{{ p.preco | currency:'BRL' }}</p>
              <div class="tags">
                @if (p.destaque) { <span class="pill pill-paga">Destaque</span> }
                <span class="pill" [class.pill-pendente]="p.ativo" [class.pill-inativo]="!p.ativo">
                  {{ p.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </div>
            <div class="acoes">
              <a class="btn btn-xs" [routerLink]="['/vitrine/gerenciar', p.id]">Editar</a>
              @if (p.ativo) {
                <button class="btn btn-xs" (click)="desativar(p)">Desativar</button>
              } @else {
                <button class="btn btn-xs" (click)="ativar(p)">Ativar</button>
              }
            </div>
          </div>
        }
      }
    </div>

    <a class="fab-add" routerLink="/vitrine/gerenciar/novo" aria-label="Novo produto">
      <mat-icon>add</mat-icon>
    </a>
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
      margin-bottom: 16px;
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
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .vazio {
      color: var(--ink-muted);
      text-align: center;
      padding: 32px 0;
    }
    .produto-card {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    .produto-card.inativo { opacity: 0.6; }
    .thumb {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      flex: 0 0 auto;
      background: var(--border);
    }
    .info { flex: 1; min-width: 0; }
    .nome { margin: 0 0 2px; font-weight: 600; font-size: 0.9375rem; }
    .detalhe { margin: 0 0 4px; font-size: 0.8125rem; color: var(--ink-muted); }
    .preco { margin: 0 0 6px; font-size: 0.9375rem; }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .acoes {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 0 0 auto;
    }
    .btn-xs { padding: 6px 10px; font-size: 0.75rem; }
    .fab-add {
      position: fixed;
      right: 20px;
      bottom: calc(84px + env(safe-area-inset-bottom));
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--paper-raised);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow);
      text-decoration: none;
    }
    .fab-add:hover { background: var(--accent-ink); }
  `],
})
export class VitrineAdminComponent implements OnInit {
  produtos = signal<ProdutoVitrine[]>([]);
  carregando = signal(true);

  constructor(private api: ApiService) {}

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  async ativar(p: ProdutoVitrine): Promise<void> {
    await this.api.ativarProdutoVitrine(p.id);
    p.ativo = true;
    this.produtos.set([...this.produtos()]);
  }

  async desativar(p: ProdutoVitrine): Promise<void> {
    await this.api.desativarProdutoVitrine(p.id);
    p.ativo = false;
    this.produtos.set([...this.produtos()]);
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.produtos.set(await this.api.listarProdutosVitrineAdmin());
    } finally {
      this.carregando.set(false);
    }
  }
}
