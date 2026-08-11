import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'cobranca',
    canActivate: [authGuard],
    loadComponent: () => import('./cobranca/cobranca.component').then((m) => m.CobrancaComponent),
  },
  {
    path: 'clientes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./clientes/clientes-list.component').then((m) => m.ClientesListComponent),
  },
  {
    path: 'clientes/novo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./clientes/cliente-form.component').then((m) => m.ClienteFormComponent),
  },
  {
    path: 'clientes/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./clientes/cliente-form.component').then((m) => m.ClienteFormComponent),
  },
  {
    path: 'vendas/nova',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./vendas/nova-venda.component').then((m) => m.NovaVendaComponent),
  },
  {
    path: 'vendas/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./vendas/venda-detalhe.component').then((m) => m.VendaDetalheComponent),
  },
  { path: '**', redirectTo: 'home' },
];
