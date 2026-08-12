import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { ProdutoVitrine } from '../core/models';

@Component({
  selector: 'app-vitrine-catalogo-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <a class="voltar" routerLink="/vitrine/gerenciar">
        <mat-icon>arrow_back</mat-icon> Voltar
      </a>
      <div class="topo">
        <p class="section-label">Catálogo — {{ categoria }}</p>
        <a class="lote-link" [routerLink]="['/vitrine/gerenciar/catalogo', categoria, 'lote']">
          <mat-icon>library_add</mat-icon> Postagem em massa
        </a>
      </div>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (produtos().length === 0) {
        <p class="vazio">Nenhum produto cadastrado em {{ categoria }} ainda.</p>
      } @else {
        @for (p of produtos(); track p.id) {
          <div class="card produto-card" [class.inativo]="!p.ativo">
            <img class="thumb" [src]="p.imagem_url" [alt]="p.nome || p.marca" />
            <div class="info">
              <p class="nome">{{ p.nome || p.marca }}</p>
              <p class="detalhe">{{ p.categoria }} @if (p.marca) { — {{ p.marca }} }</p>
              @if (p.preco > 0) {
                <p class="preco amt">{{ p.preco | currency:'BRL' }}</p>
              }
              <div class="tags">
                @if (p.destaque) { <span class="pill pill-paga">Destaque</span> }
                @if (p.capa_categoria) { <span class="pill pill-paga">Capa da categoria</span> }
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
              @if (!p.capa_categoria) {
                <button class="btn btn-xs" (click)="definirCapa(p)">Definir como capa</button>
              }
            </div>
          </div>
        }
      }
    </div>

    <a class="fab-add" [routerLink]="['/vitrine/gerenciar/novo']" [queryParams]="{ categoria }" aria-label="Novo produto">
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
    .voltar {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8125rem;
      color: var(--ink-muted);
      text-decoration: none;
      margin-bottom: 12px;
    }
    .voltar mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .topo .section-label { margin: 0; }
    .lote-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--accent-ink);
      text-decoration: none;
    }
    .lote-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
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
export class VitrineCatalogoAdminComponent implements OnInit {
  categoria = '';
  produtos = signal<ProdutoVitrine[]>([]);
  carregando = signal(true);

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.categoria = this.route.snapshot.paramMap.get('categoria') ?? '';
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

  async definirCapa(p: ProdutoVitrine): Promise<void> {
    await this.api.definirCapaCategoria(p.id);
    this.produtos.set(this.produtos().map((item) => ({
      ...item,
      capa_categoria: item.id === p.id,
    })));
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const todos = await this.api.listarProdutosVitrineAdmin();
      this.produtos.set(todos.filter((p) => p.categoria === this.categoria));
    } finally {
      this.carregando.set(false);
    }
  }
}
