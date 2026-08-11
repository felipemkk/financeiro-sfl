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
import { Cliente } from '../core/models';

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
          <mat-label>Produto</mat-label>
          <input matInput name="produto" [(ngModel)]="descricaoProduto" required placeholder="Ex: Bolsa" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Valor total (R$)</mat-label>
          <input matInput type="number" min="0.01" step="0.01" name="valor" [(ngModel)]="valorTotal" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Valor investido (R$)</mat-label>
          <input matInput type="number" min="0" step="0.01" name="valorInvestido" [(ngModel)]="valorInvestido" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Número de parcelas</mat-label>
          <input matInput type="number" min="1" step="1" name="parcelas" [(ngModel)]="numParcelas" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Data da 1ª parcela</mat-label>
          <input matInput [matDatepicker]="picker" name="dataInicio" [(ngModel)]="dataPrimeiraParcela" required />
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        @if (valorTotal && numParcelas) {
          <p class="preview">{{ numParcelas }}x de {{ (valorTotal / numParcelas) | currency:'BRL' }}</p>
        }

        @if (valorTotal) {
          <p class="lucro-tag" [class.negativo]="lucro() < 0">
            Lucro: <span class="amt">{{ lucro() | currency:'BRL' }}</span>
          </p>
        }

        @if (erro()) {
          <p class="erro">{{ erro() }}</p>
        }

        <button class="btn btn-primary btn-block" type="submit" [disabled]="salvando()">
          @if (salvando()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            Registrar venda
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
  `],
})
export class NovaVendaComponent implements OnInit {
  clientes = signal<Cliente[]>([]);
  clienteId: number | null = null;
  descricaoProduto = '';
  valorTotal: number | null = null;
  valorInvestido: number | null = null;
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

  lucro(): number {
    return (this.valorTotal ?? 0) - (this.valorInvestido ?? 0);
  }

  async salvar(): Promise<void> {
    this.erro.set('');
    if (!this.clienteId || !this.descricaoProduto || !this.valorTotal || !this.numParcelas || !this.dataPrimeiraParcela) {
      this.erro.set('Preencha todos os campos.');
      return;
    }

    this.salvando.set(true);
    try {
      await this.api.criarVenda({
        cliente_id: this.clienteId,
        descricao_produto: this.descricaoProduto,
        valor_total: this.valorTotal,
        valor_investido: this.valorInvestido ?? 0,
        num_parcelas: this.numParcelas,
        data_primeira_parcela: this.formatarData(this.dataPrimeiraParcela),
      });
      this.router.navigate(['/cobranca']);
    } catch {
      this.erro.set('Não foi possível registrar a venda.');
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
