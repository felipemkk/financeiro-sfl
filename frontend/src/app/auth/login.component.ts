import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Financeiro SFL</mat-card-title>
        </mat-card-header>
        <mat-card-content>
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

            <button mat-flat-button color="primary" class="full-width" type="submit" [disabled]="carregando()">
              @if (carregando()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Entrar
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
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
    }
    .login-card {
      width: 100%;
      max-width: 360px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .erro {
      color: #b3261e;
      font-size: 0.875rem;
      margin: 0 0 12px;
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
