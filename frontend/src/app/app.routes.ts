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
  {
    path: 'casa',
    canActivate: [authGuard],
    data: { tipo: 'despesa' },
    loadComponent: () =>
      import('./casa/casa-lancamentos.component').then((m) => m.CasaLancamentosComponent),
  },
  {
    path: 'casa/receitas',
    canActivate: [authGuard],
    data: { tipo: 'receita' },
    loadComponent: () =>
      import('./casa/casa-lancamentos.component').then((m) => m.CasaLancamentosComponent),
  },
  {
    path: 'casa/resumo',
    canActivate: [authGuard],
    loadComponent: () => import('./casa/casa-resumo.component').then((m) => m.CasaResumoComponent),
  },
  {
    path: 'casa/novo',
    canActivate: [authGuard],
    loadComponent: () => import('./casa/casa-form.component').then((m) => m.CasaFormComponent),
  },
  {
    path: 'casa/lancamentos/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./casa/casa-form.component').then((m) => m.CasaFormComponent),
  },
  {
    path: 'vitrine',
    loadComponent: () => import('./vitrine/vitrine.component').then((m) => m.VitrineComponent),
  },
  {
    path: 'vitrine/categoria/:categoria',
    loadComponent: () =>
      import('./vitrine/vitrine-categoria.component').then((m) => m.VitrineCategoriaComponent),
  },
  {
    path: 'vitrine/gerenciar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./vitrine/vitrine-admin.component').then((m) => m.VitrineAdminComponent),
  },
  {
    path: 'vitrine/gerenciar/novo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./vitrine/vitrine-produto-form.component').then((m) => m.VitrineProdutoFormComponent),
  },
  {
    path: 'vitrine/gerenciar/carrossel/:escopo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./vitrine/vitrine-carrossel-admin.component').then((m) => m.VitrineCarrosselAdminComponent),
  },
  {
    path: 'vitrine/gerenciar/catalogo/:categoria',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./vitrine/vitrine-catalogo-admin.component').then((m) => m.VitrineCatalogoAdminComponent),
  },
  {
    path: 'vitrine/gerenciar/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./vitrine/vitrine-produto-form.component').then((m) => m.VitrineProdutoFormComponent),
  },
  { path: '**', redirectTo: 'home' },
];
