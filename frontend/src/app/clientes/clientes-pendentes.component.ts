import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { Cliente, ClientePendente } from '../core/models';

@Component({
  selector: 'app-clientes-pendentes',
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
      <a class="voltar" routerLink="/clientes">
        <mat-icon>arrow_back</mat-icon> Voltar
      </a>
      <p class="section-label">Cadastros pendentes</p>
      <p class="ajuda">
        Respostas do formulário de autocadastro. Confira os dados e escolha criar uma cliente nova
        ou completar o cadastro de uma que já existe.
      </p>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (pendentes().length === 0) {
        <p class="vazio">Nenhum cadastro pendente no momento.</p>
      } @else {
        @for (p of pendentes(); track p.id) {
          <div class="card pendente-card">
            <p class="nome">{{ p.nome }}</p>
            <div class="dados">
              @if (p.cpf) { <span class="dado"><mat-icon>badge</mat-icon>{{ p.cpf }}</span> }
              @if (p.telefone) { <span class="dado"><mat-icon>call</mat-icon>{{ p.telefone }}</span> }
              @if (p.whatsapp) { <span class="dado"><mat-icon>chat</mat-icon>{{ p.whatsapp }}</span> }
              @if (p.endereco) { <span class="dado"><mat-icon>place</mat-icon>{{ p.endereco }}</span> }
              @if (p.observacoes) { <span class="dado"><mat-icon>notes</mat-icon>{{ p.observacoes }}</span> }
            </div>

            @if (vinculandoId() === p.id) {
              <mat-form-field appearance="outline" class="full-width busca-vinculo">
                <mat-label>Buscar cliente existente</mat-label>
                <input matInput [(ngModel)]="busca" (ngModelChange)="onBuscaChange()" />
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              @if (buscando()) {
                <div class="centro"><mat-spinner diameter="22"></mat-spinner></div>
              } @else if (resultados().length > 0) {
                <div class="resultados">
                  @for (c of resultados(); track c.id) {
                    <button
                      type="button"
                      class="resultado"
                      [disabled]="processandoId() === p.id"
                      (click)="aprovar(p, c.id)"
                    >{{ c.nome }} <span class="r-tel">{{ c.telefone || c.whatsapp }}</span></button>
                  }
                </div>
              } @else if (busca.trim()) {
                <p class="sem-resultado">Nenhuma cliente encontrada.</p>
              }
              <button class="btn btn-xs" type="button" (click)="cancelarVinculo()">Cancelar</button>
            } @else {
              <div class="acoes">
                <button
                  class="btn btn-primary btn-xs"
                  type="button"
                  [disabled]="processandoId() === p.id"
                  (click)="aprovar(p, null)"
                >
                  @if (processandoId() === p.id) {
                    <mat-spinner diameter="14"></mat-spinner>
                  } @else {
                    Criar cliente nova
                  }
                </button>
                <button class="btn btn-xs" type="button" (click)="iniciarVinculo(p)">
                  Associar a cliente existente
                </button>
                <button
                  class="btn btn-xs btn-danger"
                  type="button"
                  [disabled]="processandoId() === p.id"
                  (click)="descartar(p)"
                >Descartar</button>
              </div>
            }
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
    .ajuda {
      color: var(--ink-muted);
      font-size: 0.8125rem;
      margin: -8px 0 20px;
    }
    .centro {
      display: flex;
      justify-content: center;
      padding: 16px 0;
    }
    .vazio {
      color: var(--ink-muted);
      text-align: center;
      padding: 32px 0;
    }
    .pendente-card { margin-bottom: 14px; }
    .nome {
      margin: 0 0 8px;
      font-family: var(--font-display);
      font-size: 1.0625rem;
      color: var(--ink);
    }
    .dados {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .dado {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--ink-muted);
    }
    .dado mat-icon {
      color: var(--ink-faint);
      font-size: 17px;
      width: 17px;
      height: 17px;
      flex: 0 0 auto;
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn-xs {
      padding: 6px 12px;
      font-size: 0.75rem;
    }
    .busca-vinculo {
      width: 100%;
      margin-top: 4px;
    }
    .resultados {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    }
    .resultado {
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: left;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--paper-raised);
      padding: 8px 12px;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .resultado:hover { background: var(--accent-weak); }
    .r-tel { color: var(--ink-faint); font-size: 0.75rem; }
    .sem-resultado {
      font-size: 0.8125rem;
      color: var(--ink-muted);
      margin: 4px 0 10px;
    }
  `],
})
export class ClientesPendentesComponent implements OnInit {
  pendentes = signal<ClientePendente[]>([]);
  carregando = signal(true);
  processandoId = signal<number | null>(null);

  vinculandoId = signal<number | null>(null);
  busca = '';
  resultados = signal<Cliente[]>([]);
  buscando = signal(false);
  private buscaTimeout: any;

  constructor(private api: ApiService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.pendentes.set(await this.api.listarClientesPendentes());
    } finally {
      this.carregando.set(false);
    }
  }

  iniciarVinculo(p: ClientePendente): void {
    this.vinculandoId.set(p.id);
    this.busca = p.nome;
    this.resultados.set([]);
    this.onBuscaChange();
  }

  cancelarVinculo(): void {
    this.vinculandoId.set(null);
    this.busca = '';
    this.resultados.set([]);
  }

  onBuscaChange(): void {
    clearTimeout(this.buscaTimeout);
    this.buscaTimeout = setTimeout(async () => {
      if (!this.busca.trim()) {
        this.resultados.set([]);
        return;
      }
      this.buscando.set(true);
      try {
        this.resultados.set(await this.api.listarClientes(this.busca));
      } finally {
        this.buscando.set(false);
      }
    }, 300);
  }

  async aprovar(p: ClientePendente, clienteId: number | null): Promise<void> {
    this.processandoId.set(p.id);
    try {
      const cliente = await this.api.aprovarClientePendente(p.id, clienteId);
      this.pendentes.set(this.pendentes().filter((item) => item.id !== p.id));
      this.router.navigate(['/clientes', cliente.id]);
    } finally {
      this.processandoId.set(null);
    }
  }

  async descartar(p: ClientePendente): Promise<void> {
    this.processandoId.set(p.id);
    try {
      await this.api.descartarClientePendente(p.id);
      this.pendentes.set(this.pendentes().filter((item) => item.id !== p.id));
    } finally {
      this.processandoId.set(null);
    }
  }
}
