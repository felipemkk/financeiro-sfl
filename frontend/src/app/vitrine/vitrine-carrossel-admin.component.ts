import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { ImagemCarrossel } from '../core/models';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-vitrine-carrossel-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <a class="voltar" routerLink="/vitrine/gerenciar">
        <mat-icon>arrow_back</mat-icon> Voltar
      </a>
      <p class="section-label">Carrossel — {{ tituloEscopo() }}</p>
      <p class="ajuda">
        Essas fotos aparecem no carrossel grande {{ escopo === 'principal' ? 'da página inicial da vitrine' : 'do topo da página de ' + escopo }}.
      </p>

      @if (carregando()) {
        <div class="centro"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <div class="grid-fotos">
          @for (img of imagens(); track img.id) {
            <div class="foto-card">
              <img [src]="img.imagem_url" alt="" />
              <button type="button" class="btn btn-xs btn-danger" (click)="excluir(img)">Excluir</button>
            </div>
          }

          <label class="foto-card adicionar">
            @if (enviando()) {
              <mat-spinner diameter="24"></mat-spinner>
            } @else {
              <mat-icon>add_photo_alternate</mat-icon>
              <span>Adicionar foto</span>
            }
            <input type="file" accept="image/*" (change)="onArquivoSelecionado($event)" hidden />
          </label>
        </div>

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
    .grid-fotos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .foto-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: center;
    }
    .foto-card img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 10px;
      background: var(--border);
    }
    .foto-card.adicionar {
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
      text-align: center;
    }
  `],
})
export class VitrineCarrosselAdminComponent implements OnInit {
  escopo = '';
  imagens = signal<ImagemCarrossel[]>([]);
  carregando = signal(true);
  enviando = signal(false);
  erro = signal('');

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.escopo = this.route.snapshot.paramMap.get('escopo') ?? 'principal';
    await this.carregar();
  }

  tituloEscopo(): string {
    return this.escopo === 'principal' ? 'Principal' : this.escopo;
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
      const nova = await this.api.adicionarImagemCarrossel(this.escopo, data.secure_url);
      this.imagens.set([...this.imagens(), nova]);
    } catch {
      this.erro.set('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      this.enviando.set(false);
    }
  }

  async excluir(img: ImagemCarrossel): Promise<void> {
    await this.api.excluirImagemCarrossel(img.id);
    this.imagens.set(this.imagens().filter((i) => i.id !== img.id));
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.imagens.set(await this.api.listarCarrosselAdmin(this.escopo));
    } finally {
      this.carregando.set(false);
    }
  }
}
