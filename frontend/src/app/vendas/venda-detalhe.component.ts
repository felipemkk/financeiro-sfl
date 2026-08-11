import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { Parcela, Venda } from '../core/models';

@Component({
  selector: 'app-venda-detalhe',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (venda()) {
        @let v = venda()!;
        <h1>Venda #{{ v.id }} — {{ v.descricao_produto }}</h1>
        <p class="subtitulo">
          {{ v.valor_total | currency:'BRL' }} em {{ v.num_parcelas }}x — início {{ v.data_primeira_parcela | date:'dd/MM/yyyy' }}
        </p>
        @if (editandoInvestido()) {
          <div class="investido-edit">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="investido-input">
              <mat-label>Valor investido (R$)</mat-label>
              <input matInput type="number" min="0" step="0.01" [(ngModel)]="investidoEditavel" />
            </mat-form-field>
            <button mat-icon-button color="primary" (click)="salvarInvestido()" [disabled]="salvandoInvestido() || investidoEditavel === null" aria-label="Salvar">
              @if (salvandoInvestido()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>check</mat-icon>
              }
            </button>
            <button mat-icon-button (click)="editandoInvestido.set(false)" aria-label="Cancelar">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        } @else {
          <div class="lucro" [class.negativo]="v.lucro < 0">
            <span>Investido: {{ v.valor_investido | currency:'BRL' }} — Lucro: {{ v.lucro | currency:'BRL' }}</span>
            <button mat-icon-button class="editar-btn" (click)="iniciarEdicaoInvestido(v)" aria-label="Editar valor investido">
              <mat-icon>edit</mat-icon>
            </button>
          </div>
        }

        @if (temPendencias()) {
          <button mat-flat-button color="primary" class="full-width" (click)="quitarVenda()" [disabled]="quitando()">
            @if (quitando()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Quitar venda inteira
            }
          </button>
        }

        <h2>Parcelas</h2>
        @for (p of v.parcelas; track p.id) {
          <mat-card class="parcela-card" [class.paga]="p.status === 'paga'" [class.atrasada]="p.status !== 'paga' && isAtrasada(p.vencimento)">
            <mat-card-content>
              <div class="linha-topo">
                <span class="numero">
                  @if (p.status === 'paga') { <mat-icon class="icone-paga">check_circle</mat-icon> }
                  Parcela {{ p.numero }}/{{ v.num_parcelas }}
                </span>
                <mat-chip [class.chip-paga]="p.status === 'paga'" [class.chip-atrasada]="p.status !== 'paga' && isAtrasada(p.vencimento)">
                  {{ statusLabel(p) }}
                </mat-chip>
              </div>
              <p class="detalhe">
                Vence {{ p.vencimento | date:'dd/MM/yyyy' }} — {{ p.valor | currency:'BRL' }}
                @if (p.valor_pago > 0 && p.status !== 'paga') {
                  <br /><span class="parcial">Já pago: {{ p.valor_pago | currency:'BRL' }} — Restante: {{ (p.valor - p.valor_pago) | currency:'BRL' }}</span>
                }
              </p>

              <div class="acoes">
                @if (p.status === 'paga') {
                  <button mat-stroked-button (click)="desfazerPagamento(p)" [disabled]="processando() === p.id">
                    <mat-icon>undo</mat-icon>
                    Desfazer pagamento
                  </button>
                } @else {
                  <button mat-flat-button color="primary" (click)="marcarPaga(p)" [disabled]="processando() === p.id">
                    <mat-icon>check</mat-icon>
                    Marcar como paga
                  </button>
                  <div class="abater-form">
                    <mat-form-field appearance="outline" class="abater-input" subscriptSizing="dynamic">
                      <mat-label>Abater valor (R$)</mat-label>
                      <input matInput type="number" min="0.01" step="0.01" [(ngModel)]="abaterValores[p.id]" />
                    </mat-form-field>
                    <button mat-stroked-button (click)="abater(p)" [disabled]="processando() === p.id || !abaterValores[p.id]">
                      Abater
                    </button>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
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
      font-size: 1.2rem;
      margin: 0 0 4px;
    }
    h2 {
      font-size: 0.95rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: rgba(0, 0, 0, 0.5);
      margin: 24px 0 12px;
    }
    .subtitulo {
      color: rgba(0, 0, 0, 0.6);
      margin: 0 0 8px;
    }
    .lucro {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      font-size: 0.9rem;
      color: #2e7d32;
      background: #e8f5e9;
      border-radius: 6px;
      padding: 4px 6px 4px 12px;
      margin: 0 0 20px;
    }
    .lucro.negativo {
      color: #b3261e;
      background: #fdecea;
    }
    .editar-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex: 0 0 auto;
      color: inherit;
    }
    .editar-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .investido-edit {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin: 0 0 20px;
    }
    .investido-input {
      flex: 1;
      max-width: 200px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .parcela-card {
      margin-bottom: 12px;
      border-left: 4px solid transparent;
      transition: background-color 0.15s ease;
    }
    .parcela-card.paga {
      background: #eef8ef;
      border-left-color: #4caf50;
    }
    .parcela-card.atrasada {
      background: #fdf1f0;
      border-left-color: #e57373;
    }
    .linha-topo {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .numero {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .icone-paga {
      color: #4caf50;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .detalhe {
      color: rgba(0, 0, 0, 0.6);
      font-size: 0.875rem;
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .parcial {
      color: #b26a00;
    }
    .acoes {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .acoes button mat-icon {
      margin-right: 4px;
    }
    .abater-form {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .abater-input {
      flex: 1;
    }
    .chip-paga {
      background: #d5f2dd !important;
    }
    .chip-atrasada {
      background: #fbdada !important;
    }
  `],
})
export class VendaDetalheComponent implements OnInit {
  venda = signal<Venda | null>(null);
  carregando = signal(true);
  quitando = signal(false);
  processando = signal<number | null>(null);
  abaterValores: Record<number, number | null> = {};
  editandoInvestido = signal(false);
  salvandoInvestido = signal(false);
  investidoEditavel: number | null = null;

  private vendaId!: number;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.vendaId = Number(this.route.snapshot.paramMap.get('id'));
    await this.carregar();
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.venda.set(await this.api.obterVenda(this.vendaId));
    } finally {
      this.carregando.set(false);
    }
  }

  temPendencias(): boolean {
    return (this.venda()?.parcelas ?? []).some((p) => p.status !== 'paga');
  }

  statusLabel(p: Parcela): string {
    if (p.status === 'paga') return 'Paga';
    if (this.isAtrasada(p.vencimento)) return 'Atrasada';
    return 'Pendente';
  }

  isAtrasada(vencimento: string): boolean {
    return new Date(vencimento) < new Date(new Date().toDateString());
  }

  iniciarEdicaoInvestido(v: Venda): void {
    this.investidoEditavel = v.valor_investido;
    this.editandoInvestido.set(true);
  }

  async salvarInvestido(): Promise<void> {
    if (this.investidoEditavel === null || this.investidoEditavel < 0) return;
    this.salvandoInvestido.set(true);
    try {
      this.venda.set(await this.api.atualizarValorInvestido(this.vendaId, this.investidoEditavel));
      this.editandoInvestido.set(false);
    } finally {
      this.salvandoInvestido.set(false);
    }
  }

  async quitarVenda(): Promise<void> {
    this.quitando.set(true);
    try {
      this.venda.set(await this.api.quitarVenda(this.vendaId));
    } finally {
      this.quitando.set(false);
    }
  }

  async marcarPaga(p: Parcela): Promise<void> {
    this.processando.set(p.id);
    try {
      await this.api.marcarParcelaPaga(p.id);
      await this.carregar();
    } finally {
      this.processando.set(null);
    }
  }

  async desfazerPagamento(p: Parcela): Promise<void> {
    this.processando.set(p.id);
    try {
      await this.api.desfazerPagamentoParcela(p.id);
      await this.carregar();
    } finally {
      this.processando.set(null);
    }
  }

  async abater(p: Parcela): Promise<void> {
    const valor = this.abaterValores[p.id];
    if (!valor || valor <= 0) return;
    this.processando.set(p.id);
    try {
      await this.api.abaterParcela(p.id, valor);
      this.abaterValores[p.id] = null;
      await this.carregar();
    } finally {
      this.processando.set(null);
    }
  }
}
