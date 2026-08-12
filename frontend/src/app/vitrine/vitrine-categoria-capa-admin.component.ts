import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-vitrine-categoria-capa-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <a class="voltar" routerLink="/vitrine/gerenciar">
        <mat-icon>arrow_back</mat-icon> Voltar
      </a>
      <p class="section-label">Foto de capa — {{ categoria }}</p>
      <p class="ajuda">
        Essa imagem aparece no quadrado da categoria "{{ categoria }}" na página inicial da vitrine.
      </p>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        @if (capaUrl()) {
          <div class="foto-atual">
            <img [src]="capaUrl()" alt="" />
            <button type="button" class="btn btn-xs btn-danger" (click)="excluir()">Excluir</button>
          </div>
        }

        <label class="foto-card adicionar">
          @if (enviando()) {
            <mat-spinner diameter="24"></mat-spinner>
          } @else {
            <mat-icon>add_photo_alternate</mat-icon>
            <span>{{ capaUrl() ? 'Trocar foto' : 'Adicionar foto' }}</span>
          }
          <input type="file" accept="image/*" (change)="onArquivoSelecionado($event)" hidden />
        </label>

        @if (erro()) {
          <p class="erro">{{ erro() }}</p>
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
      padding: 32px 0;
    }
    .foto-atual {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 220px;
      margin-bottom: 16px;
    }
    .foto-atual img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 10px;
      background: var(--border);
    }
    .foto-card.adicionar {
      max-width: 220px;
      aspect-ratio: 1;
      border: 1px dashed var(--border-strong);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: var(--ink-muted);
      cursor: pointer;
      font-size: 0.75rem;
      text-align: center;
      padding: 8px;
    }
    .foto-card.adicionar:hover {
      background: var(--accent-weak);
      color: var(--accent-ink);
    }
    .btn-xs {
      padding: 5px 10px;
      font-size: 0.6875rem;
      width: 100%;
    }
    .erro {
      color: var(--critical-ink);
      font-size: 0.875rem;
      margin: 16px 0 0;
    }
  `],
})
export class VitrineCategoriaCapaAdminComponent implements OnInit {
  categoria = '';
  capaUrl = signal<string | null>(null);
  carregando = signal(true);
  enviando = signal(false);
  erro = signal('');

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.categoria = this.route.snapshot.paramMap.get('categoria') ?? '';
    await this.carregar();
  }

  async onArquivoSelecionado(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;

    this.erro.set('');
    if (!environment.cloudinaryCloudName || !environment.cloudinaryUploadPreset) {
      this.erro.set('Upload de imagens ainda não configurado (Cloudinary).');
      return;
    }

    this.enviando.set(true);
    try {
      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('upload_preset', environment.cloudinaryUploadPreset);
      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      if (!resp.ok) throw new Error('upload falhou');
      const data = await resp.json();
      const capa = await this.api.definirCapaCategoria(this.categoria, data.secure_url);
      this.capaUrl.set(capa.imagem_url);
    } catch {
      this.erro.set('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }

  async excluir(): Promise<void> {
    await this.api.excluirCapaCategoria(this.categoria);
    this.capaUrl.set(null);
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const capas = await this.api.listarCapasCategorias();
      this.capaUrl.set(capas.find((c) => c.categoria === this.categoria)?.imagem_url ?? null);
    } finally {
      this.carregando.set(false);
    }
  }
}
