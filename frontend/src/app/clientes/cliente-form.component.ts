import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { Cliente, Venda } from '../core/models';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      @if (carregandoCliente()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (modo() === 'visualizar') {
        <div class="profile-head">
          <span class="avatar">{{ iniciais(nome) }}</span>
          <div>
            <div class="nome-linha">
              <h1>{{ nome }}</h1>
              @if (!clienteAtivo()) {
                <span class="pill pill-inativo">Inativo</span>
              }
            </div>
            <span class="telefone">{{ telefone || 'Sem telefone cadastrado' }}</span>
          </div>
        </div>
        @if (observacoes) {
          <p class="observacoes">{{ observacoes }}</p>
        }

        <div class="acoes-cliente">
          <button class="btn" (click)="modo.set('editar')">
            <mat-icon>edit</mat-icon>
            Editar cliente
          </button>
          @if (clienteAtivo()) {
            <button class="btn btn-danger" (click)="desativarCliente()" [disabled]="alterandoStatus()">
              @if (alterandoStatus()) {
                <mat-spinner diameter="16"></mat-spinner>
              } @else {
                <ng-container>
                  <mat-icon>block</mat-icon>
                  Desativar cliente
                </ng-container>
              }
            </button>
          } @else {
            <button class="btn btn-primary" (click)="ativarCliente()" [disabled]="alterandoStatus()">
              @if (alterandoStatus()) {
                <mat-spinner diameter="16"></mat-spinner>
              } @else {
                <ng-container>
                  <mat-icon>check_circle</mat-icon>
                  Reativar cliente
                </ng-container>
              }
            </button>
          }
        </div>
      } @else {
        <p class="section-label">{{ clienteId ? 'Editar cliente' : 'Nova cliente' }}</p>

        <form (ngSubmit)="salvar()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nome</mat-label>
            <input matInput name="nome" [(ngModel)]="nome" required />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Telefone (WhatsApp)</mat-label>
            <input matInput name="telefone" [(ngModel)]="telefone" placeholder="+55 11 99999-9999" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Observações</mat-label>
            <textarea matInput name="observacoes" [(ngModel)]="observacoes" rows="2"></textarea>
          </mat-form-field>

          <div class="form-acoes">
            @if (clienteId) {
              <button class="btn" type="button" (click)="cancelarEdicao()" [disabled]="salvando()">
                Cancelar
              </button>
            }
            <button class="btn btn-primary btn-block" type="submit" [disabled]="salvando()">
              @if (salvando()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                Salvar
              }
            </button>
          </div>
        </form>
      }

      @if (clienteId) {
        <div class="divider-row">
          <p class="section-label">Histórico de vendas</p>
          <div class="rule"></div>
        </div>
        @if (carregandoVendas()) {
          <div class="centro"><mat-spinner diameter="28"></mat-spinner></div>
        } @else if (vendas().length === 0) {
          <p class="vazio">Nenhuma venda registrada ainda.</p>
        } @else {
          <div class="ledger-summary">
            <div>
              <p class="l-label">Vendido</p>
              <p class="l-value amt">{{ totalVendido() | currency:'BRL' }}</p>
            </div>
            <div>
              <p class="l-label">Pago</p>
              <p class="l-value amt">{{ totalPago() | currency:'BRL' }}</p>
            </div>
            <div class="profit">
              <p class="l-label">Lucro</p>
              <p class="l-value amt">{{ lucroTotal() | currency:'BRL' }}</p>
            </div>
          </div>
          @for (v of vendas(); track v.id) {
            <div class="card sale-card" [class.quitada]="!temPendencia(v)">
              <div class="sale-top">
                <span class="sale-title">
                  @if (v.tipo === 'emprestimo') { <span class="pill pill-pendente">Empréstimo</span> }
                  {{ v.descricao_produto }}
                </span>
                <span class="sale-num amt">Nº {{ v.id }}</span>
              </div>
              <p class="sale-meta">{{ v.valor_total | currency:'BRL' }} em {{ v.num_parcelas }}x — início {{ v.data_primeira_parcela | date:'dd/MM/yyyy' }}</p>
              <p class="lucro" [class.negativo]="v.lucro < 0">
                {{ v.tipo === 'emprestimo' ? 'Emprestado' : 'Investido' }}: {{ v.valor_investido | currency:'BRL' }} — {{ v.tipo === 'emprestimo' ? 'Juros' : 'Lucro' }}: {{ v.lucro | currency:'BRL' }}
              </p>
              <div class="installments">
                @for (p of v.parcelas; track p.id) {
                  <span class="inst" [class.done]="p.status === 'paga'">
                    {{ p.numero }} · {{ p.valor | currency:'BRL' }}
                    @if (p.status === 'paga') { <mat-icon inline="true" class="inst-check">check</mat-icon> }
                  </span>
                }
              </div>
              <div class="card-actions">
                <a class="btn" [routerLink]="['/vendas', v.id]">Ver venda</a>
                @if (temPendencia(v)) {
                  <button class="btn btn-primary" (click)="quitarVenda(v)" [disabled]="quitandoId() === v.id">
                    @if (quitandoId() === v.id) {
                      <mat-spinner diameter="16"></mat-spinner>
                    } @else {
                      Quitar venda
                    }
                  </button>
                }
              </div>
            </div>
          }
        }
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
    .profile-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 10px;
    }
    .avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--accent-weak);
      color: var(--accent-ink);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 1.125rem;
      flex: 0 0 auto;
    }
    .nome-linha {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h1 {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 1.1875rem;
      margin: 0;
      color: var(--ink);
    }
    .telefone {
      font-size: 0.8125rem;
      color: var(--ink-muted);
    }
    .observacoes {
      font-size: 0.875rem;
      color: var(--ink-muted);
      margin: 4px 0 0;
    }
    .acoes-cliente {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 20px 0 8px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .form-acoes {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .form-acoes .btn-block {
      flex: 1;
    }
    .centro {
      display: flex;
      justify-content: center;
      padding: 24px 0;
    }
    .vazio {
      color: var(--ink-muted);
    }
    .divider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 28px 0 14px;
    }
    .divider-row .section-label { margin: 0; white-space: nowrap; }
    .divider-row .rule { flex: 1; height: 1px; background: var(--border); }
    .ledger-summary {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .ledger-summary > div { padding: 12px 8px; text-align: center; }
    .ledger-summary > div + div { border-left: 1px solid var(--border); }
    .l-label { font-size: 0.625rem; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 5px; }
    .l-value { font-size: 0.9375rem; margin: 0; color: var(--ink); }
    .ledger-summary .profit .l-value { color: var(--brass); }
    .sale-card { margin-bottom: 12px; }
    .sale-card.quitada { background: var(--accent-weak); border-color: transparent; }
    .sale-top { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .sale-title { display: flex; align-items: center; gap: 6px; font-size: 0.9375rem; font-weight: 600; color: var(--ink); }
    .sale-num { color: var(--brass); font-size: 0.875rem; }
    .sale-meta { font-size: 0.8125rem; color: var(--ink-muted); margin: 0 0 8px; }
    .lucro {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--accent-ink);
      margin: 0 0 10px;
    }
    .lucro.negativo {
      color: var(--critical-ink);
    }
    .installments { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .inst {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.6875rem;
      font-variant-numeric: tabular-nums;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--border);
      color: var(--ink-muted);
    }
    .inst.done { background: var(--accent-weak); color: var(--accent-ink); border-color: transparent; }
    .inst-check { font-size: 13px; width: 13px; height: 13px; }
    .card-actions {
      display: flex;
      gap: 8px;
    }
  `],
})
export class ClienteFormComponent implements OnInit {
  clienteId: number | null = null;
  nome = '';
  telefone = '';
  observacoes = '';
  modo = signal<'visualizar' | 'editar'>('editar');
  clienteAtivo = signal(true);
  carregandoCliente = signal(false);
  salvando = signal(false);
  alterandoStatus = signal(false);
  vendas = signal<Venda[]>([]);
  carregandoVendas = signal(false);
  quitandoId = signal<number | null>(null);

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.clienteId = Number(idParam);
      this.modo.set('visualizar');
      this.carregandoCliente.set(true);
      try {
        const cliente = await this.api.obterCliente(this.clienteId);
        this.preencherFormulario(cliente);
      } finally {
        this.carregandoCliente.set(false);
      }
      this.carregarVendas();
    }
  }

  private preencherFormulario(cliente: Cliente): void {
    this.nome = cliente.nome;
    this.telefone = cliente.telefone;
    this.observacoes = cliente.observacoes;
    this.clienteAtivo.set(cliente.ativo);
  }

  cancelarEdicao(): void {
    this.modo.set('visualizar');
  }

  private async carregarVendas(): Promise<void> {
    if (!this.clienteId) return;
    this.carregandoVendas.set(true);
    try {
      this.vendas.set(await this.api.listarVendasDoCliente(this.clienteId));
    } finally {
      this.carregandoVendas.set(false);
    }
  }

  iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    const primeiras = partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
    return primeiras.join('') || '?';
  }

  totalVendido(): number {
    return this.vendas().reduce((soma, v) => soma + v.valor_total, 0);
  }

  totalPago(): number {
    return this.vendas().reduce(
      (soma, v) => soma + v.parcelas.filter((p) => p.status === 'paga').reduce((s, p) => s + p.valor, 0),
      0
    );
  }

  lucroTotal(): number {
    return this.vendas().reduce((soma, v) => soma + v.lucro, 0);
  }

  temPendencia(v: Venda): boolean {
    return v.parcelas.some((p) => p.status !== 'paga');
  }

  async quitarVenda(v: Venda): Promise<void> {
    this.quitandoId.set(v.id);
    try {
      const atualizada = await this.api.quitarVenda(v.id);
      this.vendas.set(this.vendas().map((item) => (item.id === v.id ? atualizada : item)));
    } finally {
      this.quitandoId.set(null);
    }
  }

  async desativarCliente(): Promise<void> {
    if (!this.clienteId) return;
    this.alterandoStatus.set(true);
    try {
      await this.api.desativarCliente(this.clienteId);
      this.clienteAtivo.set(false);
    } finally {
      this.alterandoStatus.set(false);
    }
  }

  async ativarCliente(): Promise<void> {
    if (!this.clienteId) return;
    this.alterandoStatus.set(true);
    try {
      await this.api.ativarCliente(this.clienteId);
      this.clienteAtivo.set(true);
    } finally {
      this.alterandoStatus.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (!this.nome.trim()) return;
    this.salvando.set(true);
    try {
      const payload = { nome: this.nome, telefone: this.telefone, observacoes: this.observacoes };
      if (this.clienteId) {
        await this.api.atualizarCliente(this.clienteId, payload);
        this.modo.set('visualizar');
      } else {
        const criado = await this.api.criarCliente(payload);
        this.router.navigate(['/clientes', criado.id]);
        return;
      }
    } finally {
      this.salvando.set(false);
    }
  }
}
