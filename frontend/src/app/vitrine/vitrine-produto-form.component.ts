import { Component, OnInit, signal } from '@angular/core';
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
            {{ imagemUrl ? 'Trocar foto' : 'Adicionar foto' }}
          }
          <input type="file" accept="image/*" (change)="onArquivoSelecionado($event)" hidden />
        </label>
        @if (erroUpload()) {
          <p class="erro">{{ erroUpload() }}</p>
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
          <input matInput name="marca" [(ngModel)]="marca" placeholder="Ex: Hermès" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome do produto</mat-label>
          <input matInput name="nome" [(ngModel)]="nome" placeholder="Ex: Birkin 25 Togo Black" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Preço (R$)</mat-label>
          <input matInput type="number" min="0.01" step="0.01" name="preco" [(ngModel)]="preco" required />
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
      margin-bottom: 24px;
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

  enviandoFoto = signal(false);
  erroUpload = signal('');
  salvando = signal(false);
  erro = signal('');

  modoEdicao = false;
  private produtoId: number | null = null;

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.modoEdicao = true;
    this.produtoId = Number(idParam);
    const produtos = await this.api.listarProdutosVitrineAdmin();
    const p = produtos.find((item) => item.id === this.produtoId);
    if (!p) return;

    this.categoria = this.categorias.includes(p.categoria) ? p.categoria : p.categoria;
    if (!this.categorias.includes(p.categoria)) {
      this.categorias = [...this.categorias, p.categoria];
    }
    this.marca = p.marca;
    this.nome = p.nome;
    this.preco = p.preco;
    this.imagemUrl = p.imagem_url;
    this.destaque = p.destaque;
  }

  async onArquivoSelecionado(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    this.erroUpload.set('');

    if (!environment.cloudinaryCloudName || !environment.cloudinaryUploadPreset) {
      this.erroUpload.set('Upload de imagens ainda não configurado (Cloudinary).');
      return;
    }

    this.enviandoFoto.set(true);
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
      this.imagemUrl = data.secure_url;
    } catch {
      this.erroUpload.set('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      this.enviandoFoto.set(false);
      input.value = '';
    }
  }

  async salvar(): Promise<void> {
    this.erro.set('');
    const categoriaFinal = this.categoria === NOVA_CATEGORIA ? this.categoriaNovaTexto.trim() : this.categoria;

    if (!categoriaFinal || !this.nome || !this.preco) {
      this.erro.set('Preencha categoria, nome e preço.');
      return;
    }
    if (!this.imagemUrl) {
      this.erro.set('Adicione uma foto do produto.');
      return;
    }

    this.salvando.set(true);
    try {
      const payload = {
        categoria: categoriaFinal,
        marca: this.marca,
        nome: this.nome,
        preco: this.preco,
        imagem_url: this.imagemUrl,
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
