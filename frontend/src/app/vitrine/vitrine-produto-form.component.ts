import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { environment } from '../../environments/environment';

const NOVA_CATEGORIA = '__nova__';
const CATEGORIAS_SUGERIDAS = ['Bolsas', 'Sapatos', 'Acessórios', 'Joias', 'Óculos'];

interface FotoSlot {
  url: string;
  enviando: WritableSignal<boolean>;
  erro: WritableSignal<string>;
}

function novoSlot(): FotoSlot {
  return { url: '', enviando: signal(false), erro: signal('') };
}

@Component({
  selector: 'app-vitrine-produto-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <p class="section-label">{{ modoEdicao ? 'Editar produto' : 'Novo produto' }}</p>

      <div class="upload-foto">
        @if (imagemUrl) {
          <img [src]="imagemUrl" alt="" class="preview" />
        } @else {
          <div class="preview placeholder"></div>
        }
        <label class="btn upload-btn">
          @if (enviandoFoto()) {
            <mat-spinner diameter="16"></mat-spinner>
          } @else {
            {{ imagemUrl ? 'Trocar foto principal' : 'Adicionar foto principal' }}
          }
          <input type="file" accept="image/*" (change)="onArquivoPrincipal($event)" hidden />
        </label>
        @if (erroUpload()) {
          <p class="erro">{{ erroUpload() }}</p>
        }
      </div>

      <p class="section-label extras-label">Fotos extras (opcional, até 4)</p>
      <div class="grid-extras">
        @for (slot of extras; track $index) {
          <div class="upload-extra">
            @if (slot.url) {
              <img [src]="slot.url" alt="" class="preview-extra" />
            } @else {
              <div class="preview-extra placeholder"></div>
            }
            <label class="btn btn-xs upload-btn">
              @if (slot.enviando()) {
                <mat-spinner diameter="14"></mat-spinner>
              } @else {
                {{ slot.url ? 'Trocar' : 'Adicionar' }}
              }
              <input type="file" accept="image/*" (change)="onArquivoExtra($index, $event)" hidden />
            </label>
            @if (slot.url) {
              <button type="button" class="btn btn-xs" (click)="removerExtra($index)">Remover</button>
            }
            @if (slot.erro()) {
              <p class="erro erro-xs">{{ slot.erro() }}</p>
            }
          </div>
        }
      </div>

      <form (ngSubmit)="salvar()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Categoria</mat-label>
          <mat-select name="categoria" [(ngModel)]="categoria" required>
            @for (c of categorias; track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
            <mat-option [value]="novaCategoriaOpcao">+ Nova categoria</mat-option>
          </mat-select>
        </mat-form-field>

        @if (categoria === novaCategoriaOpcao) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nome da nova categoria</mat-label>
            <input matInput name="categoriaNova" [(ngModel)]="categoriaNovaTexto" required />
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Marca</mat-label>
          <input matInput name="marca" [(ngModel)]="marca" placeholder="Ex: Hermès" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome do produto (opcional)</mat-label>
          <input matInput name="nome" [(ngModel)]="nome" placeholder="Ex: Birkin 25 Togo Black" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Preço (R$) (opcional)</mat-label>
          <input matInput type="number" min="0.01" step="0.01" name="preco" [(ngModel)]="preco" />
        </mat-form-field>

        <mat-checkbox name="destaque" [(ngModel)]="destaque" class="checkbox-destaque">
          Mostrar na seção de Destaques da vitrine
        </mat-checkbox>

        @if (erro()) {
          <p class="erro">{{ erro() }}</p>
        }

        <button class="btn btn-primary btn-block" type="submit" [disabled]="salvando()">
          @if (salvando()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            Salvar
          }
        </button>
        <a class="btn btn-block cancelar" routerLink="/vitrine/gerenciar">Cancelar</a>
      </form>
    </div>
  `,
  styles: [`
    .page {
      padding: 20px;
      padding-bottom: 24px;
      max-width: 640px;
      margin: 0 auto;
    }
    .upload-foto {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .preview {
      width: 160px;
      height: 160px;
      object-fit: cover;
      border-radius: 12px;
      background: var(--border);
    }
    .preview.placeholder {
      border: 1px dashed var(--border-strong);
    }
    .upload-btn {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .extras-label {
      margin-top: 20px;
    }
    .grid-extras {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .upload-extra {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .preview-extra {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 8px;
      background: var(--border);
    }
    .preview-extra.placeholder {
      border: 1px dashed var(--border-strong);
    }
    .btn-xs {
      padding: 5px 8px;
      font-size: 0.6875rem;
    }
    .erro-xs {
      font-size: 0.625rem;
      margin: 0;
    }
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .checkbox-destaque {
      display: block;
      margin: 8px 0 16px;
      font-size: 0.875rem;
    }
    .erro {
      color: var(--critical-ink);
      font-size: 0.875rem;
      margin: 8px 0 12px;
      text-align: center;
    }
    .btn-block { margin-top: 8px; }
    .cancelar {
      text-decoration: none;
      text-align: center;
    }
  `],
})
export class VitrineProdutoFormComponent implements OnInit {
  categorias = CATEGORIAS_SUGERIDAS;
  categoria = '';
  categoriaNovaTexto = '';
  readonly novaCategoriaOpcao = NOVA_CATEGORIA;
  marca = '';
  nome = '';
  preco: number | null = null;
  imagemUrl = '';
  destaque = false;

  extras: FotoSlot[] = [novoSlot(), novoSlot(), novoSlot(), novoSlot()];

  enviandoFoto = signal(false);
  erroUpload = signal('');
  salvando = signal(false);
  erro = signal('');

  modoEdicao = false;
  private produtoId: number | null = null;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      const categoriaParam = this.route.snapshot.queryParamMap.get('categoria');
      if (categoriaParam) {
        if (!this.categorias.includes(categoriaParam)) {
          this.categorias = [...this.categorias, categoriaParam];
        }
        this.categoria = categoriaParam;
      }
      return;
    }

    this.modoEdicao = true;
    this.produtoId = Number(idParam);
    const produtos = await this.api.listarProdutosVitrineAdmin();
    const p = produtos.find((item) => item.id === this.produtoId);
    if (!p) return;

    this.categoria = p.categoria;
    if (!this.categorias.includes(p.categoria)) {
      this.categorias = [...this.categorias, p.categoria];
    }
    this.marca = p.marca;
    this.nome = p.nome;
    this.preco = p.preco;
    this.imagemUrl = p.imagem_url;
    this.destaque = p.destaque;
    this.extras[0].url = p.foto_extra_1;
    this.extras[1].url = p.foto_extra_2;
    this.extras[2].url = p.foto_extra_3;
    this.extras[3].url = p.foto_extra_4;
  }

  async onArquivoPrincipal(evento: Event): Promise<void> {
    const arquivo = this.pegarArquivo(evento);
    if (!arquivo) return;

    this.erroUpload.set('');
    if (!this.cloudinaryConfigurado()) {
      this.erroUpload.set('Upload de imagens ainda não configurado (Cloudinary).');
      return;
    }

    this.enviandoFoto.set(true);
    try {
      this.imagemUrl = await this.subirParaCloudinary(arquivo);
    } catch {
      this.erroUpload.set('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      this.enviandoFoto.set(false);
    }
  }

  async onArquivoExtra(indice: number, evento: Event): Promise<void> {
    const arquivo = this.pegarArquivo(evento);
    if (!arquivo) return;
    const slot = this.extras[indice];

    slot.erro.set('');
    if (!this.cloudinaryConfigurado()) {
      slot.erro.set('Cloudinary não configurado.');
      return;
    }

    slot.enviando.set(true);
    try {
      slot.url = await this.subirParaCloudinary(arquivo);
    } catch {
      slot.erro.set('Falha no envio.');
    } finally {
      slot.enviando.set(false);
    }
  }

  removerExtra(indice: number): void {
    this.extras[indice].url = '';
  }

  private pegarArquivo(evento: Event): File | null {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    input.value = '';
    return arquivo;
  }

  private cloudinaryConfigurado(): boolean {
    return !!environment.cloudinaryCloudName && !!environment.cloudinaryUploadPreset;
  }

  private async subirParaCloudinary(arquivo: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', arquivo);
    formData.append('upload_preset', environment.cloudinaryUploadPreset);

    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/image/upload`,
      { method: 'POST', body: formData }
    );
    if (!resp.ok) throw new Error('upload falhou');
    const data = await resp.json();
    return data.secure_url;
  }

  async salvar(): Promise<void> {
    this.erro.set('');
    const categoriaFinal = this.categoria === NOVA_CATEGORIA ? this.categoriaNovaTexto.trim() : this.categoria;

    if (!categoriaFinal || !this.marca) {
      this.erro.set('Preencha categoria e marca.');
      return;
    }
    if (!this.imagemUrl) {
      this.erro.set('Adicione uma foto principal do produto.');
      return;
    }

    this.salvando.set(true);
    try {
      const payload = {
        categoria: categoriaFinal,
        marca: this.marca,
        nome: this.nome,
        preco: this.preco ?? 0,
        imagem_url: this.imagemUrl,
        foto_extra_1: this.extras[0].url,
        foto_extra_2: this.extras[1].url,
        foto_extra_3: this.extras[2].url,
        foto_extra_4: this.extras[3].url,
        destaque: this.destaque,
      };
      if (this.modoEdicao && this.produtoId) {
        await this.api.atualizarProdutoVitrine(this.produtoId, payload);
      } else {
        await this.api.criarProdutoVitrine(payload);
      }
      this.router.navigate(['/vitrine/gerenciar']);
    } catch {
      this.erro.set('Não foi possível salvar.');
    } finally {
      this.salvando.set(false);
    }
  }
}
