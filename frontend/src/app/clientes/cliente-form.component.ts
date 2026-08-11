import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
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
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      @if (carregandoCliente()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (modo() === 'visualizar') {
        <div class="cabecalho">
          <h1>{{ nome }}</h1>
          @if (!clienteAtivo()) {
            <mat-chip class="chip-inativo">Inativo</mat-chip>
          }
        </div>
        <div class="info-linha">
          <mat-icon>call</mat-icon>
          <span>{{ telefone || 'Sem telefone cadastrado' }}</span>
        </div>
        @if (observacoes) {
          <div class="info-linha">
            <mat-icon>notes</mat-icon>
            <span>{{ observacoes }}</span>
          </div>
        }

        <div class="acoes-cliente">
          <button mat-stroked-button (click)="modo.set('editar')">
            <mat-icon>edit</mat-icon>
            Editar cliente
          </button>
          @if (clienteAtivo()) {
            <button mat-stroked-button color="warn" (click)="desativarCliente()" [disabled]="alterandoStatus()">
              @if (alterandoStatus()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <ng-container>
                  <mat-icon>block</mat-icon>
                  Desativar cliente
                </ng-container>
              }
            </button>
          } @else {
            <button mat-stroked-button color="primary" (click)="ativarCliente()" [disabled]="alterandoStatus()">
              @if (alterandoStatus()) {
                <mat-spinner diameter="18"></mat-spinner>
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
        <h1>{{ clienteId ? 'Editar cliente' : 'Nova cliente' }}</h1>

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
              <button mat-stroked-button type="button" (click)="cancelarEdicao()" [disabled]="salvando()">
                Cancelar
              </button>
            }
            <button mat-flat-button color="primary" class="full-width" type="submit" [disabled]="salvando()">
              @if (salvando()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Salvar
              }
            </button>
          </div>
        </form>
      }

      @if (clienteId) {
        <h2>Histórico de vendas</h2>
        @if (carregandoVendas()) {
          <div class="centro"><mat-spinner diameter="28"></mat-spinner></div>
        } @else if (vendas().length === 0) {
          <p class="vazio">Nenhuma venda registrada ainda.</p>
        } @else {
          <div class="resumo">
            <p class="total">Total vendido: {{ totalVendido() | currency:'BRL' }}</p>
            <p class="total">Total pago: {{ totalPago() | currency:'BRL' }}</p>
            <p class="total" [class.negativo]="lucroTotal() < 0">Lucro total: {{ lucroTotal() | currency:'BRL' }}</p>
          </div>
          @for (v of vendas(); track v.id) {
            <mat-card class="venda-card" [class.quitada]="!temPendencia(v)">
              <mat-card-header>
                <mat-card-title>Venda #{{ v.id }} — {{ v.descricao_produto }}</mat-card-title>
                <mat-card-subtitle>
                  {{ v.valor_total | currency:'BRL' }} em {{ v.num_parcelas }}x — início {{ v.data_primeira_parcela | date:'dd/MM/yyyy' }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p class="lucro" [class.negativo]="v.lucro < 0">
                  Investido: {{ v.valor_investido | currency:'BRL' }} — Lucro: {{ v.lucro | currency:'BRL' }}
                </p>
                <div class="parcelas-chips">
                  @for (p of v.parcelas; track p.id) {
                    <mat-chip [class.chip-paga]="p.status === 'paga'" [class.chip-atrasada]="p.status !== 'paga' && isAtrasada(p.vencimento)">
                      <span class="chip-conteudo">
                        <span>{{ p.numero }}: {{ p.valor | currency:'BRL' }} — {{ p.vencimento | date:'dd/MM' }}</span>
                        @if (p.status === 'paga') { <mat-icon inline="true" class="chip-check">check</mat-icon> }
                      </span>
                    </mat-chip>
                  }
                </div>
                <div class="venda-acoes">
                  <a mat-stroked-button [routerLink]="['/vendas', v.id]">Ver venda</a>
                  @if (temPendencia(v)) {
                    <button mat-stroked-button color="primary" (click)="quitarVenda(v)" [disabled]="quitandoId() === v.id">
                      @if (quitandoId() === v.id) {
                        <mat-spinner diameter="18"></mat-spinner>
                      } @else {
                        Quitar venda
                      }
                    </button>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        }
      }
    </div>
  `,
  styles: [`
    .page {
      padding: 16px;
      padding-bottom: 24px;
      max-width: 640px;
      margin: 0 auto;
    }
    h1 {
      font-size: 1.25rem;
      margin: 0 0 12px;
    }
    h2 {
      font-size: 1rem;
      margin: 24px 0 12px;
    }
    .cabecalho {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .cabecalho h1 {
      margin: 0;
    }
    .chip-inativo {
      background: #f0f0f0 !important;
      color: rgba(0, 0, 0, 0.6);
    }
    .info-linha {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(0, 0, 0, 0.7);
      margin-bottom: 8px;
    }
    .info-linha mat-icon {
      color: rgba(0, 0, 0, 0.4);
      flex: 0 0 auto;
    }
    .acoes-cliente {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0 8px;
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
    .form-acoes .full-width {
      margin-bottom: 0;
    }
    .centro {
      display: flex;
      justify-content: center;
      padding: 24px 0;
    }
    .vazio {
      color: rgba(0, 0, 0, 0.6);
    }
    .resumo {
      margin: 0 0 12px;
    }
    .total {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 2px;
    }
    .total.negativo {
      color: #b3261e;
    }
    .venda-card {
      margin-bottom: 12px;
      border-left: 4px solid transparent;
    }
    .venda-card.quitada {
      background: #eef8ef;
      border-left-color: #4caf50;
    }
    .lucro {
      font-size: 0.875rem;
      font-weight: 600;
      color: #2e7d32;
      margin: 0 0 4px;
    }
    .lucro.negativo {
      color: #b3261e;
    }
    .parcelas-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .chip-conteudo {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .chip-check {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
    }
    .venda-acoes {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .chip-paga {
      background: #d5f2dd !important;
    }
    .chip-atrasada {
      background: #fbdada !important;
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

  isAtrasada(vencimento: string): boolean {
    return new Date(vencimento) < new Date(new Date().toDateString());
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
