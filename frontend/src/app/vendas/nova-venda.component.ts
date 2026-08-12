import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { Cliente, TipoVenda } from '../core/models';

@Component({
  selector: 'app-nova-venda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <p class="section-label">Nova venda parcelada</p>

      <div class="tipo-toggle">
        <button type="button" class="btn" [class.btn-primary]="tipo() === 'produto'" (click)="tipo.set('produto')">
          Produto
        </button>
        <button type="button" class="btn" [class.btn-primary]="tipo() === 'emprestimo'" (click)="tipo.set('emprestimo')">
          Empréstimo
        </button>
      </div>

      <form (ngSubmit)="salvar()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cliente</mat-label>
          <mat-select name="cliente" [(ngModel)]="clienteId" required>
            @for (c of clientes(); track c.id) {
              <mat-option [value]="c.id">{{ c.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ tipo() === 'emprestimo' ? 'Motivo do empréstimo' : 'Produto' }}</mat-label>
          <input matInput name="produto" [(ngModel)]="descricaoProduto" required
                 [placeholder]="tipo() === 'emprestimo' ? 'Ex: Empréstimo pessoal' : 'Ex: Bolsa'" />
        </mat-form-field>

        @if (tipo() === 'produto') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Valor total (R$)</mat-label>
            <input matInput type="number" min="0.01" step="0.01" name="valor" [(ngModel)]="valorTotal" required />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Valor investido (R$)</mat-label>
            <input matInput type="number" min="0" step="0.01" name="valorInvestido" [(ngModel)]="valorInvestido" />
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Valor emprestado (R$)</mat-label>
            <input matInput type="number" min="0.01" step="0.01" name="valorInvestido" [(ngModel)]="valorInvestido" required />
          </mat-form-field>

          <div class="modo-toggle">
            <button type="button" class="btn btn-sm" [class.btn-primary]="modoCalculo() === 'taxa'" (click)="modoCalculo.set('taxa')">
              Taxa de juros
            </button>
            <button type="button" class="btn btn-sm" [class.btn-primary]="modoCalculo() === 'parcela'" (click)="modoCalculo.set('parcela')">
              Valor da parcela
            </button>
          </div>

          @if (modoCalculo() === 'taxa') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Taxa de juros (%)</mat-label>
              <input matInput type="number" min="0" step="0.01" name="taxaJuros" [(ngModel)]="taxaJuros" required />
            </mat-form-field>
          }
        }

        @if (tipo() === 'produto' || modoCalculo() === 'taxa') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Número de parcelas</mat-label>
            <input matInput type="number" min="1" step="1" name="parcelas" [(ngModel)]="numParcelas" required />
          </mat-form-field>
        }

        @if (tipo() === 'emprestimo' && modoCalculo() === 'parcela') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Número de parcelas</mat-label>
            <input matInput type="number" min="1" step="1" name="parcelasB" [(ngModel)]="numParcelas" required />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Valor de cada parcela (R$)</mat-label>
            <input matInput type="number" min="0.01" step="0.01" name="valorParcela" [(ngModel)]="valorParcela" required />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Data da 1ª parcela</mat-label>
          <input matInput [matDatepicker]="picker" name="dataInicio" [(ngModel)]="dataPrimeiraParcela" required />
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        @if (tipo() === 'produto') {
          @if (valorTotalEfetivo() && numParcelas) {
            <p class="preview">{{ numParcelas }}x de {{ (valorTotalEfetivo() / numParcelas) | currency:'BRL' }}</p>
          }
          @if (valorTotalEfetivo()) {
            <p class="lucro-tag" [class.negativo]="lucro() < 0">
              Lucro: <span class="amt">{{ lucro() | currency:'BRL' }}</span>
            </p>
          }
        } @else if (valorInvestido && numParcelas && valorTotalEfetivo()) {
          <div class="resumo-emprestimo">
            <div class="linha">
              <span>Valor emprestado</span>
              <span class="amt">{{ valorInvestido | currency:'BRL' }}</span>
            </div>
            <div class="linha">
              <span>Parcelamento</span>
              <span class="amt">{{ numParcelas }}x de {{ (valorTotalEfetivo() / numParcelas) | currency:'BRL' }}</span>
            </div>
            <div class="linha">
              <span>Valor total</span>
              <span class="amt">{{ valorTotalEfetivo() | currency:'BRL' }}</span>
            </div>
            <div class="linha">
              <span>Taxa de juros total</span>
              <span class="amt">{{ taxaCalculada() | number:'1.2-2' }}%</span>
            </div>
            <div class="linha">
              <span>Taxa de juros mensal</span>
              <span class="amt">{{ taxaMensal() | number:'1.2-2' }}%</span>
            </div>
            <div class="linha destaque" [class.negativo]="lucro() < 0">
              <span>Lucro total</span>
              <span class="amt">{{ lucro() | currency:'BRL' }}</span>
            </div>
          </div>
        }

        @if (erro()) {
          <p class="erro">{{ erro() }}</p>
        }

        <button class="btn btn-primary btn-block" type="submit" [disabled]="salvando()">
          @if (salvando()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            Registrar {{ tipo() === 'emprestimo' ? 'empréstimo' : 'venda' }}
          }
        </button>
      </form>
    </div>
  `,
  styles: [`
    .page {
      padding: 20px;
      padding-bottom: 24px;
      max-width: 640px;
      margin: 0 auto;
    }
    .tipo-toggle {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .tipo-toggle .btn {
      flex: 1;
    }
    .modo-toggle {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .btn-sm {
      flex: 1;
      padding: 8px 10px;
      font-size: 0.75rem;
    }
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .preview {
      color: var(--ink-muted);
      font-size: 0.875rem;
      margin: 0 0 12px;
    }
    .lucro-tag {
      display: inline-block;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--accent-ink);
      background: var(--accent-weak);
      border-radius: 6px;
      padding: 6px 12px;
      margin: 0 0 16px;
    }
    .lucro-tag.negativo {
      color: var(--critical-ink);
      background: var(--critical-weak);
    }
    .erro {
      color: var(--critical-ink);
      font-size: 0.875rem;
      margin: 0 0 12px;
    }
    .btn-block { margin-top: 8px; }
    .resumo-emprestimo {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 4px 16px;
      margin: 0 0 20px;
      background: var(--paper-raised);
    }
    .resumo-emprestimo .linha {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--ink-muted);
    }
    .resumo-emprestimo .linha:last-child {
      border-bottom: none;
    }
    .resumo-emprestimo .linha .amt {
      color: var(--ink);
      font-weight: 600;
    }
    .resumo-emprestimo .linha.destaque {
      color: var(--ink);
      font-weight: 600;
    }
    .resumo-emprestimo .linha.destaque .amt {
      color: var(--accent-ink);
      font-size: 1.0625rem;
    }
    .resumo-emprestimo .linha.destaque.negativo .amt {
      color: var(--critical-ink);
    }
  `],
})
export class NovaVendaComponent implements OnInit {
  clientes = signal<Cliente[]>([]);
  tipo = signal<TipoVenda>('produto');
  modoCalculo = signal<'taxa' | 'parcela'>('taxa');
  clienteId: number | null = null;
  descricaoProduto = '';
  valorTotal: number | null = null;
  valorInvestido: number | null = null;
  taxaJuros: number | null = null;
  valorParcela: number | null = null;
  numParcelas: number | null = null;
  dataPrimeiraParcela: Date | null = null;
  salvando = signal(false);
  erro = signal('');

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.clientes.set(await this.api.listarClientes());
    const clienteParam = this.route.snapshot.queryParamMap.get('cliente_id');
    if (clienteParam) {
      this.clienteId = Number(clienteParam);
    }
  }

  valorTotalCalculado(): number {
    if (this.modoCalculo() === 'parcela') {
      return (this.numParcelas ?? 0) * (this.valorParcela ?? 0);
    }
    return (this.valorInvestido ?? 0) * (1 + (this.taxaJuros ?? 0) / 100);
  }

  valorTotalEfetivo(): number {
    return this.tipo() === 'emprestimo' ? this.valorTotalCalculado() : (this.valorTotal ?? 0);
  }

  taxaCalculada(): number {
    if (!this.valorInvestido) return 0;
    return (this.valorTotalCalculado() / this.valorInvestido - 1) * 100;
  }

  taxaMensal(): number {
    if (!this.numParcelas) return 0;
    return this.taxaCalculada() / this.numParcelas;
  }

  lucro(): number {
    return this.valorTotalEfetivo() - (this.valorInvestido ?? 0);
  }

  async salvar(): Promise<void> {
    this.erro.set('');
    const valorTotalEfetivo = this.valorTotalEfetivo();
    if (!this.clienteId || !this.descricaoProduto || !valorTotalEfetivo || !this.numParcelas || !this.dataPrimeiraParcela) {
      this.erro.set('Preencha todos os campos.');
      return;
    }
    if (this.tipo() === 'emprestimo') {
      if (!this.valorInvestido) {
        this.erro.set('Preencha todos os campos.');
        return;
      }
      if (this.modoCalculo() === 'taxa' && this.taxaJuros === null) {
        this.erro.set('Preencha todos os campos.');
        return;
      }
      if (this.modoCalculo() === 'parcela' && !this.valorParcela) {
        this.erro.set('Preencha todos os campos.');
        return;
      }
    }

    this.salvando.set(true);
    try {
      await this.api.criarVenda({
        cliente_id: this.clienteId,
        tipo: this.tipo(),
        descricao_produto: this.descricaoProduto,
        valor_total: valorTotalEfetivo,
        valor_investido: this.valorInvestido ?? 0,
        num_parcelas: this.numParcelas,
        data_primeira_parcela: this.formatarData(this.dataPrimeiraParcela),
      });
      this.router.navigate(['/cobranca']);
    } catch {
      this.erro.set(`Não foi possível registrar ${this.tipo() === 'emprestimo' ? 'o empréstimo' : 'a venda'}.`);
    } finally {
      this.salvando.set(false);
    }
  }

  private formatarData(d: Date): string {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
