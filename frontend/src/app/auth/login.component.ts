import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page">
      <div class="login-card">
        <p class="eyebrow">Bem-vinda de volta</p>
        <h1>Financeiro <em>SFL</em></h1>
        <form (ngSubmit)="entrar()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>E-mail</mat-label>
            <input matInput type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Senha</mat-label>
            <input matInput type="password" name="senha" [(ngModel)]="senha" required autocomplete="current-password" />
          </mat-form-field>

          @if (erro()) {
            <p class="erro">{{ erro() }}</p>
          }

          <button class="btn btn-primary btn-block" type="submit" [disabled]="carregando()">
            @if (carregando()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              Entrar
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 16px;
      box-sizing: border-box;
      background: var(--paper);
    }
    .login-card {
      width: 100%;
      max-width: 360px;
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
      margin: 0 0 24px;
      color: var(--ink);
    }
    h1 em {
      font-style: normal;
      color: var(--brass);
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
export class LoginComponent {
  email = '';
  senha = '';
  carregando = signal(false);
  erro = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  async entrar(): Promise<void> {
    this.erro.set('');
    this.carregando.set(true);
    try {
      await this.auth.login(this.email, this.senha);
      this.router.navigate(['/home']);
    } catch {
      this.erro.set('E-mail ou senha inválidos.');
    } finally {
      this.carregando.set(false);
    }
  }
}
