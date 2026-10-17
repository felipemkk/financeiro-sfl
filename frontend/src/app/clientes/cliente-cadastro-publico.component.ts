import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-cliente-cadastro-publico',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="cadastro-page">
      <div class="cadastro-card">
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
          <p class="intro">Leva menos de um minuto — preencha o que puder.</p>

          <form (ngSubmit)="enviar()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nome</mat-label>
              <input matInput name="nome" [(ngModel)]="nome" required />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>CPF</mat-label>
              <input matInput name="cpf" [(ngModel)]="cpf" placeholder="000.000.000-00" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Telefone</mat-label>
              <input matInput name="telefone" [(ngModel)]="telefone" placeholder="(11) 99999-9999" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>WhatsApp</mat-label>
              <input matInput name="whatsapp" [(ngModel)]="whatsapp" placeholder="+55 11 99999-9999" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Endereço</mat-label>
              <input matInput name="endereco" [(ngModel)]="endereco" placeholder="Rua, número, bairro, cidade" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Observações</mat-label>
              <textarea matInput name="observacoes" [(ngModel)]="observacoes" rows="2"></textarea>
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
    .erro {
      color: var(--critical-ink);
      font-size: 0.875rem;
      margin: 4px 0 12px;
    }
    .btn-block {
      margin-top: 12px;
    }
  `],
})
export class ClienteCadastroPublicoComponent {
  nome = '';
  cpf = '';
  telefone = '';
  whatsapp = '';
  endereco = '';
  observacoes = '';
  enviando = signal(false);
  enviado = signal(false);
  erro = signal('');

  constructor(private api: ApiService) {}

  async enviar(): Promise<void> {
    this.erro.set('');
    if (!this.nome.trim()) {
      this.erro.set('Preencha ao menos o nome.');
      return;
    }

    this.enviando.set(true);
    try {
      await this.api.enviarCadastroPublico({
        nome: this.nome,
        cpf: this.cpf,
        telefone: this.telefone,
        whatsapp: this.whatsapp,
        endereco: this.endereco,
        observacoes: this.observacoes,
      });
      this.enviado.set(true);
    } catch {
      this.erro.set('Não foi possível enviar. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }
}
