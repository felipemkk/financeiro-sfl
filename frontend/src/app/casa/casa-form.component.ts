import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { TipoLancamentoCasa, TipoRecorrencia } from '../core/models';

@Component({
  selector: 'app-casa-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <p class="section-label">
        {{ modoEdicao ? 'Editar' : (tipo === 'receita' ? 'Nova receita' : 'Nova despesa') }}
      </p>

      @if (!modoEdicao) {
        <div class="recorrencia-toggle">
          <button type="button" class="btn btn-sm" [class.btn-primary]="tipoRecorrencia() === 'pontual'" (click)="tipoRecorrencia.set('pontual')">
            Pontual
          </button>
          <button type="button" class="btn btn-sm" [class.btn-primary]="tipoRecorrencia() === 'fixa'" (click)="tipoRecorrencia.set('fixa')">
            Recorrente — valor fixo
          </button>
          <button type="button" class="btn btn-sm" [class.btn-primary]="tipoRecorrencia() === 'variavel'" (click)="tipoRecorrencia.set('variavel')">
            Recorrente — valor variável
          </button>
        </div>
        @if (tipoRecorrencia() !== 'pontual') {
          <p class="ajuda">
            {{ tipoRecorrencia() === 'fixa'
              ? 'Todo mês será gerado um lançamento com esse mesmo valor (ex: Vivo, academia).'
              : 'Todo mês será gerado um lançamento com esse valor como estimativa — você ajusta quando a conta chegar (ex: Cemig).' }}
          </p>
        }
      }

      <form (ngSubmit)="salvar()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Categoria</mat-label>
          <input matInput name="categoria" [(ngModel)]="categoria" required list="categorias-lista" />
          <datalist id="categorias-lista">
            @for (c of categorias(); track c) {
              <option [value]="c"></option>
            }
          </datalist>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição</mat-label>
          <input matInput name="descricao" [(ngModel)]="descricao" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ tipoRecorrencia() === 'variavel' && !modoEdicao ? 'Valor estimado (R$)' : 'Valor (R$)' }}</mat-label>
          <input matInput type="number" min="0.01" step="0.01" name="valor" [(ngModel)]="valorPrevisto" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ tipo === 'receita' ? 'Data de recebimento' : 'Data de vencimento' }} (opcional)</mat-label>
          <input matInput [matDatepicker]="picker" name="dataVencimento" [(ngModel)]="dataVencimento" />
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observações</mat-label>
          <input matInput name="observacoes" [(ngModel)]="observacoes" />
        </mat-form-field>

        @if (erro()) {
          <p class="erro">{{ erro() }}</p>
        }

        <button class="btn btn-primary btn-block" type="submit" [disabled]="salvando()">
          @if (salvando()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            Salvar
          }
        </button>
        <a class="btn btn-block cancelar" [routerLink]="voltarPara()">Cancelar</a>
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
    .recorrencia-toggle {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    .btn-sm {
      padding: 10px;
      font-size: 0.8125rem;
    }
    .ajuda {
      color: var(--ink-muted);
      font-size: 0.75rem;
      margin: 0 0 16px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .erro {
      color: var(--critical-ink);
      font-size: 0.875rem;
      margin: 0 0 12px;
    }
    .btn-block { margin-top: 8px; }
    .cancelar {
      text-decoration: none;
      text-align: center;
    }
  `],
})
export class CasaFormComponent implements OnInit {
  tipo: TipoLancamentoCasa = 'despesa';
  tipoRecorrencia = signal<TipoRecorrencia>('pontual');
  categorias = signal<string[]>([]);
  categoria = '';
  descricao = '';
  valorPrevisto: number | null = null;
  dataVencimento: Date | null = null;
  observacoes = '';
  salvando = signal(false);
  erro = signal('');

  modoEdicao = false;
  private lancamentoId: number | null = null;
  private competenciaAno = new Date().getFullYear();
  private competenciaMes = new Date().getMonth() + 1;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.categorias.set(await this.api.listarCategoriasCasa());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicao = true;
      this.lancamentoId = Number(idParam);
      const l = await this.api.obterLancamentoCasa(this.lancamentoId);
      this.tipo = l.tipo;
      this.categoria = l.categoria;
      this.descricao = l.descricao;
      this.valorPrevisto = l.valor_previsto;
      this.dataVencimento = l.data_vencimento ? new Date(l.data_vencimento + 'T00:00:00') : null;
      this.observacoes = l.observacoes;
      this.competenciaAno = l.competencia_ano;
      this.competenciaMes = l.competencia_mes;
      return;
    }

    const qp = this.route.snapshot.queryParamMap;
    this.tipo = (qp.get('tipo') as TipoLancamentoCasa) ?? 'despesa';
    this.competenciaAno = Number(qp.get('ano')) || this.competenciaAno;
    this.competenciaMes = Number(qp.get('mes')) || this.competenciaMes;
  }

  voltarPara(): string[] {
    return this.tipo === 'receita' ? ['/casa/receitas'] : ['/casa'];
  }

  async salvar(): Promise<void> {
    this.erro.set('');
    if (!this.categoria || !this.descricao || !this.valorPrevisto) {
      this.erro.set('Preencha categoria, descrição e valor.');
      return;
    }

    this.salvando.set(true);
    try {
      const dataVencimentoStr = this.dataVencimento ? this.formatarData(this.dataVencimento) : undefined;

      if (this.modoEdicao && this.lancamentoId) {
        await this.api.atualizarLancamentoCasa(this.lancamentoId, {
          categoria: this.categoria,
          descricao: this.descricao,
          valor_previsto: this.valorPrevisto,
          data_vencimento: dataVencimentoStr,
          observacoes: this.observacoes,
        });
      } else {
        await this.api.criarLancamentoCasa({
          tipo: this.tipo,
          tipo_recorrencia: this.tipoRecorrencia(),
          categoria: this.categoria,
          descricao: this.descricao,
          valor_previsto: this.valorPrevisto,
          data_vencimento: dataVencimentoStr,
          observacoes: this.observacoes,
          competencia_ano: this.competenciaAno,
          competencia_mes: this.competenciaMes,
        });
      }
      this.router.navigate(this.voltarPara());
    } catch {
      this.erro.set('Não foi possível salvar.');
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
