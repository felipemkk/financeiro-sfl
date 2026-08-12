import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { LancamentoCasa, TipoLancamentoCasa } from '../core/models';
import { CasaNavComponent } from './casa-nav.component';

type FiltroStatus = 'todas' | 'paga' | 'pendente' | 'atrasada';
type Ordenacao = 'nenhuma' | 'maior' | 'menor';

const NOVA_CATEGORIA = '__nova__';

@Component({
  selector: 'app-casa-lancamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule, CasaNavComponent],
  template: `
    <div class="page">
      <app-casa-nav></app-casa-nav>

      <div class="mes-seletor">
        <button class="btn btn-icon" (click)="mesAnterior()" aria-label="Mês anterior">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="mes-label">{{ nomeMes() }} de {{ ano() }}</span>
        <button class="btn btn-icon" (click)="proximoMes()" aria-label="Próximo mês">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <div class="totals-strip">
        <div class="prev">
          <p class="t-label">Previsto</p>
          <p class="t-value amt">{{ totalPrevisto() | currency:'BRL' }}</p>
        </div>
        <div class="real">
          <p class="t-label">{{ tipo === 'receita' ? 'Recebido' : 'Pago' }}</p>
          <p class="t-value amt">{{ totalRealizado() | currency:'BRL' }}</p>
        </div>
        <div class="pendente">
          <p class="t-label">Pendente</p>
          <p class="t-value amt">{{ totalPendente() | currency:'BRL' }}</p>
        </div>
      </div>

      <div class="filtros">
        <button type="button" class="btn btn-sm" [class.btn-primary]="filtroStatus() === 'paga'" (click)="alternarFiltroStatus('paga')">
          {{ tipo === 'receita' ? 'Recebidas' : 'Pagas' }}
        </button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="filtroStatus() === 'pendente'" (click)="alternarFiltroStatus('pendente')">
          Em aberto
        </button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="filtroStatus() === 'atrasada'" (click)="alternarFiltroStatus('atrasada')">
          Atrasadas
        </button>
      </div>
      <div class="filtros">
        <button type="button" class="btn btn-sm" [class.btn-primary]="ordenacao() === 'maior'" (click)="alternarOrdenacao('maior')">
          <mat-icon>arrow_downward</mat-icon> Maior valor
        </button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="ordenacao() === 'menor'" (click)="alternarOrdenacao('menor')">
          <mat-icon>arrow_upward</mat-icon> Menor valor
        </button>
      </div>

      @if (erro()) {
        <p class="erro">{{ erro() }}</p>
      }

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (lancamentosFiltrados().length === 0) {
        <p class="vazio">Nenhum{{ tipo === 'receita' ? 'a receita' : 'a despesa' }} encontrada.</p>
      } @else {
        @for (l of lancamentosFiltrados(); track l.id) {
          <div class="card lancamento-card" [class.paga]="l.status === 'paga'">
            <div class="card-top">
              <span class="nome-conta">
                {{ l.descricao }} <span class="categoria-inline">- {{ l.categoria }}</span>
              </span>
              <span class="pill" [class.pill-paga]="l.status === 'paga'" [class.pill-pendente]="l.status === 'pendente'" [class.pill-atrasada]="l.status === 'atrasada'">
                {{ statusLabel(l.status) }}
              </span>
            </div>

            @if (l.tipo_recorrencia !== 'pontual') {
              <p class="tag-linha">
                @if (l.tipo_recorrencia === 'fixa') {
                  <span class="tag-recorrente">recorrente fixa</span>
                } @else if (l.tipo_recorrencia === 'variavel') {
                  <span class="tag-recorrente">recorrente variável</span>
                } @else if (l.tipo_recorrencia === 'parcelada') {
                  <span class="tag-recorrente">parcela {{ l.numero_parcela }}/{{ l.num_parcelas_total }}</span>
                }
              </p>
            }

            <div class="card-bottom">
              <span class="amt valor">{{ l.valor_previsto | currency:'BRL' }}</span>
              @if (l.data_vencimento) {
                <span class="due">vence {{ l.data_vencimento | date:'dd/MM' }}</span>
              }
            </div>

            <div class="editor-categoria">
              <button type="button" class="btn btn-xs" (click)="alternarEditorCategoria(l)">
                <mat-icon>edit</mat-icon> Editar categoria
              </button>
              @if (editandoCategoriaId() === l.id) {
                <div class="dropdown-categoria">
                  <select class="select-categoria" [(ngModel)]="categoriaSelecionada" (ngModelChange)="onCategoriaSelecionada(l, $event)">
                    <option value="" disabled selected>Escolher categoria…</option>
                    @for (c of categorias(); track c) {
                      <option [value]="c">{{ c }}</option>
                    }
                    <option [value]="novaCategoriaOpcao">+ Nova categoria</option>
                  </select>
                  @if (categoriaSelecionada === novaCategoriaOpcao) {
                    <div class="nova-categoria">
                      <input class="input-nova-categoria" [(ngModel)]="novaCategoriaTexto" placeholder="Nome da nova categoria" />
                      <button type="button" class="btn btn-primary btn-xs" (click)="confirmarNovaCategoria(l)">Salvar</button>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="card-actions">
              @if (l.status !== 'paga') {
                <a class="btn" [routerLink]="['/casa/lancamentos', l.id]">Editar</a>
                <button class="btn btn-primary" (click)="marcarPaga(l)">Pago</button>
                <button class="btn" (click)="suspender(l)">Suspender</button>
              } @else {
                <a class="btn" [routerLink]="['/casa/lancamentos', l.id]">Editar</a>
                <button class="btn" (click)="despagar(l)">Reabrir</button>
              }
            </div>
          </div>
        }
      }

      <a class="btn btn-primary btn-block novo-btn" [routerLink]="['/casa/novo']" [queryParams]="{ tipo, ano: ano(), mes: mes() }">
        + {{ tipo === 'receita' ? 'Nova receita' : 'Nova despesa' }}
      </a>
    </div>
  `,
  styles: [`
    .page {
      padding: 20px;
      padding-bottom: 24px;
      max-width: 640px;
      margin: 0 auto;
    }
    .mes-seletor {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .mes-label {
      font-family: var(--font-display);
      font-size: 1rem;
      min-width: 160px;
      text-align: center;
      text-transform: capitalize;
      color: var(--ink);
    }
    .totals-strip {
      display: flex;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .totals-strip > div {
      flex: 1;
      padding: 14px 10px;
      text-align: center;
    }
    .totals-strip > div + div { border-left: 1px solid var(--border); }
    .t-label {
      font-size: 0.6875rem;
      color: var(--ink-faint);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 6px;
    }
    .t-value {
      font-size: 1rem;
      margin: 0;
      color: var(--ink);
    }
    .real .t-value { color: var(--accent-ink); }
    .pendente .t-value { color: var(--critical-ink); }
    .filtros {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .filtros .btn-sm {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 6px;
      font-size: 0.75rem;
    }
    .filtros .btn-sm mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
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
    .erro {
      color: var(--critical-ink);
      background: var(--critical-weak);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.8125rem;
      margin: 0 0 16px;
    }
    .lancamento-card {
      margin-bottom: 12px;
    }
    .lancamento-card.paga {
      background: var(--accent-weak);
      border-color: transparent;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
      gap: 8px;
    }
    .nome-conta {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ink);
    }
    .categoria-inline {
      font-weight: 400;
      color: var(--ink-muted);
    }
    .tag-linha {
      margin: 2px 0 8px;
    }
    .tag-recorrente {
      display: inline-block;
      font-size: 0.6875rem;
      color: var(--brass);
      background: var(--brass-weak);
      border-radius: 100px;
      padding: 1px 8px;
    }
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 10px;
    }
    .card-bottom .valor {
      font-size: 1.25rem;
      color: var(--ink);
    }
    .due {
      font-size: 0.75rem;
      color: var(--ink-faint);
    }
    .editor-categoria {
      margin-bottom: 10px;
    }
    .btn-xs {
      padding: 5px 10px;
      font-size: 0.6875rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-xs mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .dropdown-categoria {
      margin-top: 8px;
    }
    .select-categoria {
      width: 100%;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background: var(--paper-raised);
      color: var(--ink);
      font-family: var(--font-body);
      font-size: 0.8125rem;
    }
    .nova-categoria {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }
    .input-nova-categoria {
      flex: 1;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background: var(--paper-raised);
      color: var(--ink);
      font-family: var(--font-body);
      font-size: 0.8125rem;
    }
    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .card-actions .btn {
      flex: 1;
    }
    .novo-btn {
      margin-top: 8px;
      text-decoration: none;
    }
  `],
})
export class CasaLancamentosComponent implements OnInit {
  tipo: TipoLancamentoCasa = 'despesa';
  ano = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1);
  lancamentos = signal<LancamentoCasa[]>([]);
  categorias = signal<string[]>([]);
  carregando = signal(true);
  erro = signal('');

  filtroStatus = signal<FiltroStatus>('todas');
  ordenacao = signal<Ordenacao>('nenhuma');

  editandoCategoriaId = signal<number | null>(null);
  categoriaSelecionada = '';
  novaCategoriaTexto = '';
  readonly novaCategoriaOpcao = NOVA_CATEGORIA;

  private nomesMeses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.tipo = (this.route.snapshot.data['tipo'] as TipoLancamentoCasa) ?? 'despesa';
    this.categorias.set(await this.api.listarCategoriasCasa());
    await this.carregar();
  }

  nomeMes(): string {
    return this.nomesMeses[this.mes() - 1];
  }

  lancamentosFiltrados(): LancamentoCasa[] {
    let resultado = this.lancamentos();
    if (this.filtroStatus() !== 'todas') {
      resultado = resultado.filter((l) => l.status === this.filtroStatus());
    }
    if (this.ordenacao() === 'maior') {
      resultado = [...resultado].sort((a, b) => b.valor_previsto - a.valor_previsto);
    } else if (this.ordenacao() === 'menor') {
      resultado = [...resultado].sort((a, b) => a.valor_previsto - b.valor_previsto);
    }
    return resultado;
  }

  alternarFiltroStatus(status: FiltroStatus): void {
    this.filtroStatus.set(this.filtroStatus() === status ? 'todas' : status);
  }

  alternarOrdenacao(ordenacao: Ordenacao): void {
    this.ordenacao.set(this.ordenacao() === ordenacao ? 'nenhuma' : ordenacao);
  }

  totalPrevisto(): number {
    return this.lancamentos().reduce((soma, l) => soma + l.valor_previsto, 0);
  }

  totalRealizado(): number {
    return this.lancamentos()
      .filter((l) => l.status === 'paga')
      .reduce((soma, l) => soma + l.valor_realizado, 0);
  }

  totalPendente(): number {
    return this.lancamentos()
      .filter((l) => l.status !== 'paga')
      .reduce((soma, l) => soma + l.valor_previsto, 0);
  }

  statusLabel(status: string): string {
    if (status === 'paga') return this.tipo === 'receita' ? 'Recebida' : 'Paga';
    if (status === 'atrasada') return 'Atrasada';
    return 'Pendente';
  }

  async mesAnterior(): Promise<void> {
    if (this.mes() === 1) {
      this.mes.set(12);
      this.ano.update((a) => a - 1);
    } else {
      this.mes.update((m) => m - 1);
    }
    await this.carregar();
  }

  async proximoMes(): Promise<void> {
    if (this.mes() === 12) {
      this.mes.set(1);
      this.ano.update((a) => a + 1);
    } else {
      this.mes.update((m) => m + 1);
    }
    await this.carregar();
  }

  async marcarPaga(l: LancamentoCasa): Promise<void> {
    const atualizado = await this.api.pagarLancamentoCasa(l.id);
    this.substituir(atualizado);
  }

  async despagar(l: LancamentoCasa): Promise<void> {
    await this.api.despagarLancamentoCasa(l.id);
    l.status = 'pendente';
    l.valor_realizado = 0;
    this.lancamentos.set([...this.lancamentos()]);
  }

  async suspender(l: LancamentoCasa): Promise<void> {
    this.erro.set('');
    try {
      await this.api.suspenderLancamentoCasa(l.id);
      this.lancamentos.set(this.lancamentos().filter((item) => item.id !== l.id));
    } catch {
      this.erro.set('O mês seguinte já tem um lançamento dessa recorrência — edite-o diretamente por lá.');
    }
  }

  alternarEditorCategoria(l: LancamentoCasa): void {
    const abrindo = this.editandoCategoriaId() !== l.id;
    this.editandoCategoriaId.set(abrindo ? l.id : null);
    this.categoriaSelecionada = '';
    this.novaCategoriaTexto = '';
  }

  async onCategoriaSelecionada(l: LancamentoCasa, categoria: string): Promise<void> {
    if (categoria === NOVA_CATEGORIA) return;
    await this.salvarCategoria(l, categoria);
  }

  async confirmarNovaCategoria(l: LancamentoCasa): Promise<void> {
    const nova = this.novaCategoriaTexto.trim();
    if (!nova) return;
    await this.salvarCategoria(l, nova);
  }

  private async salvarCategoria(l: LancamentoCasa, categoria: string): Promise<void> {
    const atualizado = await this.api.atualizarLancamentoCasa(l.id, {
      categoria,
      descricao: l.descricao,
      valor_previsto: l.valor_previsto,
      data_vencimento: l.data_vencimento ?? undefined,
      observacoes: l.observacoes,
    });
    this.substituir(atualizado);
    if (!this.categorias().includes(categoria)) {
      this.categorias.set([...this.categorias(), categoria].sort());
    }
    this.editandoCategoriaId.set(null);
  }

  private substituir(atualizado: LancamentoCasa): void {
    this.lancamentos.set(this.lancamentos().map((l) => (l.id === atualizado.id ? atualizado : l)));
  }

  private carregamentoAtual = 0;

  private async carregar(): Promise<void> {
    const id = ++this.carregamentoAtual;
    this.carregando.set(true);
    try {
      const resultado = await this.api.listarLancamentosCasa(this.ano(), this.mes(), this.tipo);
      if (id !== this.carregamentoAtual) return;
      this.lancamentos.set(resultado);
    } finally {
      if (id === this.carregamentoAtual) this.carregando.set(false);
    }
  }
}
