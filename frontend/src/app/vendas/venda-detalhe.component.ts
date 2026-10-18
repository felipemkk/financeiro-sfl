import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
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
        <p class="sale-num amt">{{ v.tipo === 'emprestimo' ? 'Empréstimo' : 'Venda' }} Nº {{ v.id }}</p>
        <h1>{{ v.descricao_produto }}</h1>
        <p class="subtitulo">
          {{ v.valor_total | currency:'BRL' }} em {{ v.num_parcelas }}x — início {{ v.data_primeira_parcela | date:'dd/MM/yyyy' }}
        </p>
        @if (editandoInvestido()) {
          <div class="investido-edit">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="investido-input">
              <mat-label>Valor investido (R$)</mat-label>
              <input matInput type="number" min="0" step="0.01" [(ngModel)]="investidoEditavel" />
            </mat-form-field>
            <button class="btn btn-icon" (click)="salvarInvestido()" [disabled]="salvandoInvestido() || investidoEditavel === null" aria-label="Salvar">
              @if (salvandoInvestido()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <mat-icon>check</mat-icon>
              }
            </button>
            <button class="btn btn-icon" (click)="editandoInvestido.set(false)" aria-label="Cancelar">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        } @else {
          <div class="lucro" [class.negativo]="v.lucro < 0">
            <span>{{ v.tipo === 'emprestimo' ? 'Emprestado' : 'Investido' }}: {{ v.valor_investido | currency:'BRL' }} — {{ v.tipo === 'emprestimo' ? 'Juros' : 'Lucro' }}: {{ v.lucro | currency:'BRL' }}</span>
            <button class="btn btn-icon editar-btn" (click)="iniciarEdicaoInvestido(v)" aria-label="Editar valor investido">
              <mat-icon>edit</mat-icon>
            </button>
          </div>
        }

        @if (temPendencias()) {
          <button class="btn btn-primary btn-block" (click)="quitarVenda()" [disabled]="quitando()">
            @if (quitando()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              Quitar venda inteira
            }
          </button>
        }

        <div class="divider-row">
          <p class="section-label">Contrato</p>
          <div class="rule"></div>
        </div>
        <div class="card contrato-card">
          @if (v.contrato_status === 'assinado') {
            <div class="contrato-status">
              <mat-icon class="icone-assinado">check_circle</mat-icon>
              <span>Contrato assinado pela cliente</span>
            </div>
            @if (v.contrato_link_assinatura) {
              <a class="btn btn-xs" [href]="v.contrato_link_assinatura" target="_blank" rel="noopener">Ver contrato</a>
            }
          } @else if (v.contrato_status === 'aguardando_assinatura') {
            <div class="contrato-status">
              <mat-icon class="icone-aguardando">schedule</mat-icon>
              <span>Aguardando a cliente assinar</span>
            </div>
            <div class="contrato-acoes">
              <button class="btn btn-primary btn-xs" (click)="enviarContratoWhatsapp(v)">
                <mat-icon>chat</mat-icon>
                Enviar por WhatsApp
              </button>
              <button class="btn btn-xs" (click)="copiarLinkContrato(v)">Copiar link</button>
            </div>
            @if (linkCopiado()) {
              <p class="copiado">Link copiado!</p>
            }
          } @else if (v.contrato_status === 'recusado') {
            <div class="contrato-status">
              <mat-icon class="icone-recusado">cancel</mat-icon>
              <span>A cliente recusou a assinatura</span>
            </div>
            <button class="btn btn-xs" (click)="gerarContrato()" [disabled]="gerandoContrato()">
              @if (gerandoContrato()) { <mat-spinner diameter="14"></mat-spinner> } @else { Gerar novo contrato }
            </button>
          } @else {
            <p class="contrato-ajuda">
              Gera um contrato de venda a prazo com confissão de dívida, assinado eletronicamente pela cliente —
              serve de base pra cobrança caso ela não pague.
            </p>
            <button class="btn btn-primary btn-xs" (click)="gerarContrato()" [disabled]="gerandoContrato()">
              @if (gerandoContrato()) {
                <mat-spinner diameter="14"></mat-spinner>
              } @else {
                Gerar contrato pra assinatura
              }
            </button>
          }
          @if (erroContrato()) {
            <p class="erro-contrato">{{ erroContrato() }}</p>
          }
        </div>

        <div class="divider-row">
          <p class="section-label">Parcelas</p>
          <div class="rule"></div>
        </div>
        @for (p of v.parcelas; track p.id) {
          <div class="card parcela-card" [class.paga]="p.status === 'paga'">
            <div class="linha-topo">
              <span class="numero">
                @if (p.status === 'paga') { <mat-icon class="icone-paga">check_circle</mat-icon> }
                Parcela {{ p.numero }}/{{ v.num_parcelas }}
              </span>
              <span class="pill" [class.pill-paga]="p.status === 'paga'" [class.pill-pendente]="p.status !== 'paga' && !isAtrasada(p.vencimento)" [class.pill-atrasada]="p.status !== 'paga' && isAtrasada(p.vencimento)">
                {{ statusLabel(p) }}
              </span>
            </div>
            <p class="detalhe">
              Vence {{ p.vencimento | date:'dd/MM/yyyy' }} — {{ p.valor | currency:'BRL' }}
              @if (p.valor_pago > 0 && p.status !== 'paga') {
                <br /><span class="parcial">Já pago: {{ p.valor_pago | currency:'BRL' }} — Restante: {{ (p.valor - p.valor_pago) | currency:'BRL' }}</span>
              }
            </p>

            <div class="acoes">
              @if (p.status === 'paga') {
                <button class="btn" (click)="desfazerPagamento(p)" [disabled]="processando() === p.id">
                  <mat-icon>undo</mat-icon>
                  Desfazer pagamento
                </button>
              } @else {
                <button class="btn btn-primary" (click)="marcarPaga(p)" [disabled]="processando() === p.id">
                  <mat-icon>check</mat-icon>
                  Marcar como paga
                </button>
                <div class="abater-form">
                  <mat-form-field appearance="outline" class="abater-input" subscriptSizing="dynamic">
                    <mat-label>Abater valor (R$)</mat-label>
                    <input matInput type="number" min="0.01" step="0.01" [(ngModel)]="abaterValores[p.id]" />
                  </mat-form-field>
                  <button class="btn" (click)="abater(p)" [disabled]="processando() === p.id || !abaterValores[p.id]">
                    Abater
                  </button>
                </div>
              }
            </div>
          </div>
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
    .sale-num {
      font-size: 0.8125rem;
      color: var(--brass);
      margin: 0 0 2px;
    }
    h1 {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 1.25rem;
      margin: 0 0 4px;
      color: var(--ink);
    }
    .subtitulo {
      color: var(--ink-muted);
      font-size: 0.875rem;
      margin: 0 0 12px;
    }
    .lucro {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--accent-ink);
      background: var(--accent-weak);
      border-radius: 6px;
      padding: 4px 6px 4px 12px;
      margin: 0 0 20px;
    }
    .lucro.negativo {
      color: var(--critical-ink);
      background: var(--critical-weak);
    }
    .editar-btn {
      width: 28px;
      height: 28px;
      padding: 0;
    }
    .editar-btn mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
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
    .btn-block { width: 100%; margin-bottom: 8px; }
    .contrato-card {
      margin-bottom: 4px;
    }
    .contrato-ajuda {
      color: var(--ink-muted);
      font-size: 0.8125rem;
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .contrato-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 10px;
    }
    .icone-assinado { color: var(--accent-ink); }
    .icone-aguardando { color: var(--brass); }
    .icone-recusado { color: var(--critical-ink); }
    .contrato-acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn-xs {
      padding: 6px 12px;
      font-size: 0.75rem;
    }
    .copiado {
      font-size: 0.75rem;
      color: var(--accent-ink);
      margin: 8px 0 0;
    }
    .erro-contrato {
      color: var(--critical-ink);
      font-size: 0.8125rem;
      margin: 8px 0 0;
    }
    .centro {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }
    .divider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 24px 0 14px;
    }
    .divider-row .section-label { margin: 0; white-space: nowrap; }
    .divider-row .rule { flex: 1; height: 1px; background: var(--border); }
    .parcela-card {
      margin-bottom: 12px;
    }
    .parcela-card.paga {
      background: var(--accent-weak);
      border-color: transparent;
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
      font-size: 0.9375rem;
      color: var(--ink);
    }
    .icone-paga {
      color: var(--accent-ink);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .detalhe {
      color: var(--ink-muted);
      font-size: 0.875rem;
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .parcial {
      color: var(--brass);
    }
    .acoes {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .acoes .btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .abater-form {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .abater-input {
      flex: 1;
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
  gerandoContrato = signal(false);
  erroContrato = signal('');
  linkCopiado = signal(false);

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

  async gerarContrato(): Promise<void> {
    this.erroContrato.set('');
    this.gerandoContrato.set(true);
    try {
      this.venda.set(await this.api.gerarContratoVenda(this.vendaId));
    } catch {
      this.erroContrato.set('Não foi possível gerar o contrato. Confira se a assinatura eletrônica está configurada.');
    } finally {
      this.gerandoContrato.set(false);
    }
  }

  enviarContratoWhatsapp(v: Venda): void {
    const mensagem = `Olá! Segue o contrato da sua compra pra você assinar: ${v.contrato_link_assinatura}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
  }

  async copiarLinkContrato(v: Venda): Promise<void> {
    try {
      await navigator.clipboard.writeText(v.contrato_link_assinatura);
      this.linkCopiado.set(true);
      setTimeout(() => this.linkCopiado.set(false), 2500);
    } catch {
      // Clipboard indisponível — a cliente ainda pode usar o botão de WhatsApp.
    }
  }
}
