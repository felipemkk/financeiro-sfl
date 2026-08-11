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
import { Venda } from '../core/models';

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

        <button mat-flat-button color="primary" class="full-width" type="submit" [disabled]="salvando()">
          @if (salvando()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Salvar
          }
        </button>
      </form>

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
                      {{ p.numero }}: {{ p.valor | currency:'BRL' }} — {{ p.vencimento | date:'dd/MM' }}
                      @if (p.status === 'paga') { <mat-icon inline="true">check</mat-icon> }
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
    .full-width {
      width: 100%;
      margin-bottom: 8px;
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
  salvando = signal(false);
  vendas = signal<Venda[]>([]);
  carregandoVendas = signal(false);
  quitandoId = signal<number | null>(null);

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.clienteId = Number(idParam);
      const cliente = await this.api.obterCliente(this.clienteId);
      this.nome = cliente.nome;
      this.telefone = cliente.telefone;
      this.observacoes = cliente.observacoes;
      this.carregarVendas();
    }
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

  async salvar(): Promise<void> {
    if (!this.nome.trim()) return;
    this.salvando.set(true);
    try {
      const payload = { nome: this.nome, telefone: this.telefone, observacoes: this.observacoes };
      if (this.clienteId) {
        await this.api.atualizarCliente(this.clienteId, payload);
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
