import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'financeiro-sfl-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  logado = signal(!!localStorage.getItem(TOKEN_KEY));

  constructor(private http: HttpClient, private router: Router) {}

  async login(email: string, senha: string): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<{ token: string }>(`${environment.apiUrl}/auth/login`, { email, senha })
    );
    localStorage.setItem(TOKEN_KEY, resp.token);
    this.logado.set(true);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.logado.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
