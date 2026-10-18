import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';

interface ViaCepResposta {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

@Component({
  selector: 'app-cliente-cadastro-publico',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="cadastro-page">
      <div class="cadastro-card">
        <img class="logo" src="/logo-sfl.png" alt="Store Flávia Lima" />

        @if (enviado()) {
          <p class="eyebrow">Recebemos seu cadastro</p>
          <h1>Obrigado! <em>:)</em></h1>
          <p class="sucesso-texto">
            Em breve seus dados estarão confirmados em nosso sistema. Qualquer coisa, é só chamar
            no WhatsApp.
          </p>
        } @else {
          <p class="eyebrow">Complete seu cadastro</p>
          <h1>Seus <em>dados</em></h1>
          <p class="intro">Leva menos de um minuto — preencha os campos abaixo.</p>

          <form (ngSubmit)="enviar()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nome</mat-label>
              <input matInput name="nome" [(ngModel)]="nome" required />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Sobrenome</mat-label>
              <input matInput name="sobrenome" [(ngModel)]="sobrenome" required />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>CPF</mat-label>
              <input matInput name="cpf" [(ngModel)]="cpf" placeholder="000.000.000-00" required />
            </mat-form-field>

            <div class="linha-cep">
              <mat-form-field appearance="outline" class="campo-cep">
                <mat-label>CEP</mat-label>
                <input
                  matInput
                  name="cep"
                  [(ngModel)]="cep"
                  (ngModelChange)="onCepChange()"
                  inputmode="numeric"
                  maxlength="9"
                  placeholder="00000-000"
                  required
                />
                @if (buscandoCep()) {
                  <mat-spinner matSuffix diameter="16"></mat-spinner>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="campo-numero">
                <mat-label>Número</mat-label>
                <input matInput name="numero" [(ngModel)]="numero" inputmode="numeric" required />
              </mat-form-field>
            </div>

            @if (erroCep()) {
              <p class="erro erro-cep">{{ erroCep() }}</p>
            } @else if (enderecoResolvido()) {
              <p class="endereco-preview">
                {{ enderecoResolvido()!.logradouro }}@if (enderecoResolvido()!.bairro) {, {{ enderecoResolvido()!.bairro }}}
                — {{ enderecoResolvido()!.cidade }}/{{ enderecoResolvido()!.uf }}
              </p>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>WhatsApp</mat-label>
              <input matInput name="whatsapp" [(ngModel)]="whatsapp" placeholder="+55 11 99999-9999" />
            </mat-form-field>

            @if (erro()) {
              <p class="erro">{{ erro() }}</p>
            }

            <button class="btn btn-primary btn-block" type="submit" [disabled]="enviando()">
              @if (enviando()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                Enviar
              }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .cadastro-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 16px;
      box-sizing: border-box;
      background: var(--paper);
    }
    .cadastro-card {
      width: 100%;
      max-width: 380px;
      background: var(--paper-raised);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: var(--shadow);
    }
    .logo {
      display: block;
      width: 180px;
      height: auto;
      margin: 0 auto 24px;
    }
    .eyebrow {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--brass);
      font-weight: 600;
      margin: 0 0 8px;
    }
    h1 {
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 1.5rem;
      margin: 0 0 12px;
      color: var(--ink);
    }
    h1 em {
      font-style: normal;
      color: var(--brass);
    }
    .intro {
      font-size: 0.875rem;
      color: var(--ink-muted);
      margin: 0 0 20px;
    }
    .sucesso-texto {
      font-size: 0.9375rem;
      color: var(--ink-muted);
      line-height: 1.5;
      margin: 0;
    }
    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }
    .linha-cep {
      display: flex;
      gap: 10px;
    }
    .campo-cep { flex: 1.4; }
    .campo-numero { flex: 1; }
    .endereco-preview {
      font-size: 0.75rem;
      color: var(--ink-muted);
      margin: -2px 0 12px;
    }
    .erro {
      color: var(--critical-ink);
      font-size: 0.875rem;
      margin: 4px 0 12px;
    }
    .erro-cep {
      margin: -2px 0 12px;
    }
    .btn-block {
      margin-top: 12px;
    }
  `],
})
export class ClienteCadastroPublicoComponent {
  nome = '';
  sobrenome = '';
  cpf = '';
  cep = '';
  numero = '';
  whatsapp = '';
  enviando = signal(false);
  enviado = signal(false);
  erro = signal('');

  buscandoCep = signal(false);
  erroCep = signal('');
  enderecoResolvido = signal<{ logradouro: string; bairro: string; cidade: string; uf: string } | null>(null);
  private cepBuscadoPara = '';

  constructor(private api: ApiService, private http: HttpClient) {}

  onCepChange(): void {
    this.erroCep.set('');
    this.enderecoResolvido.set(null);
    const cepLimpo = this.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    this.cepBuscadoPara = cepLimpo;
    this.buscandoCep.set(true);
    this.http.get<ViaCepResposta>(`https://viacep.com.br/ws/${cepLimpo}/json/`).subscribe({
      next: (resposta) => {
        if (this.cepBuscadoPara !== cepLimpo) return; // cliente já digitou outro CEP
        this.buscandoCep.set(false);
        if (resposta.erro) {
          this.erroCep.set('CEP não encontrado.');
          return;
        }
        this.enderecoResolvido.set({
          logradouro: resposta.logradouro ?? '',
          bairro: resposta.bairro ?? '',
          cidade: resposta.localidade ?? '',
          uf: resposta.uf ?? '',
        });
      },
      error: () => {
        if (this.cepBuscadoPara !== cepLimpo) return;
        this.buscandoCep.set(false);
        this.erroCep.set('Não foi possível buscar o endereço — confira o CEP.');
      },
    });
  }

  private montarEndereco(): string {
    const cepFormatado = this.cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
    const resolvido = this.enderecoResolvido();
    if (!resolvido) return `CEP ${cepFormatado}, nº ${this.numero}`;

    const partes = [resolvido.logradouro, `nº ${this.numero}`];
    if (resolvido.bairro) partes.push(resolvido.bairro);
    const linha = partes.filter(Boolean).join(', ');
    return `${linha} — ${resolvido.cidade}/${resolvido.uf}, CEP ${cepFormatado}`;
  }

  async enviar(): Promise<void> {
    this.erro.set('');
    if (!this.nome.trim() || !this.sobrenome.trim() || !this.cpf.trim()) {
      this.erro.set('Preencha nome, sobrenome e CPF.');
      return;
    }
    if (this.cep.replace(/\D/g, '').length !== 8 || !this.numero.trim()) {
      this.erro.set('Preencha o CEP e o número do endereço.');
      return;
    }

    this.enviando.set(true);
    try {
      await this.api.enviarCadastroPublico({
        nome: `${this.nome.trim()} ${this.sobrenome.trim()}`,
        cpf: this.cpf,
        telefone: '',
        whatsapp: this.whatsapp,
        endereco: this.montarEndereco(),
        observacoes: '',
      });
      this.enviado.set(true);
    } catch {
      this.erro.set('Não foi possível enviar. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }
}
