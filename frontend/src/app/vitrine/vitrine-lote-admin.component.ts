import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/api.service';
import { environment } from '../../environments/environment';

type StatusItem = 'pendente' | 'enviando' | 'ok' | 'erro';

interface ItemLote {
  arquivo: File;
  previewUrl: string;
  status: StatusItem;
}

@Component({
  selector: 'app-vitrine-lote-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <a class="voltar" [routerLink]="['/vitrine/gerenciar/catalogo', categoria]">
        <mat-icon>arrow_back</mat-icon> Voltar
      </a>
      <p class="section-label">Postagem em massa — {{ categoria }}</p>
      <p class="ajuda">
        Escolha uma marca e selecione várias fotos de uma vez — cada foto vira um produto novo
        (só com a foto principal, sem nome, preço ou fotos extras). Você pode completar os
        detalhes depois, editando cada produto individualmente.
      </p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Marca</mat-label>
        <input matInput name="marca" [(ngModel)]="marca" placeholder="Ex: Prada" [disabled]="processando()" />
      </mat-form-field>

      <label class="btn upload-btn" [class.desabilitado]="!marca.trim() || processando()">
        <mat-icon>add_photo_alternate</mat-icon>
        Escolher fotos
        <input type="file" accept="image/*" multiple (change)="onArquivosSelecionados($event)" [disabled]="!marca.trim() || processando()" hidden />
      </label>

      @if (erroGeral()) {
        <p class="erro">{{ erroGeral() }}</p>
      }

      @if (itens().length > 0) {
        <div class="grid-itens">
          @for (item of itens(); track item.previewUrl) {
            <div class="item-lote">
              <img [src]="item.previewUrl" alt="" />
              <div class="status" [class.ok]="item.status === 'ok'" [class.erro]="item.status === 'erro'">
                @if (item.status === 'pendente') { Aguardando… }
                @if (item.status === 'enviando') { <mat-spinner diameter="14"></mat-spinner> }
                @if (item.status === 'ok') { <mat-icon>check_circle</mat-icon> Postado }
                @if (item.status === 'erro') { <mat-icon>error</mat-icon> Falhou }
              </div>
            </div>
          }
        </div>
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
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }
    .upload-btn {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 20px;
    }
    .upload-btn.desabilitado {
      opacity: 0.5;
      cursor: default;
      pointer-events: none;
    }
    .erro {
      color: var(--critical-ink);
      font-size: 0.875rem;
      margin: 0 0 16px;
    }
    .grid-itens {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .item-lote {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .item-lote img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 8px;
      background: var(--border);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      color: var(--ink-muted);
      justify-content: center;
    }
    .status.ok { color: var(--accent-ink); }
    .status.erro { color: var(--critical-ink); }
    .status mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `],
})
export class VitrineLoteAdminComponent implements OnInit {
  categoria = '';
  marca = '';
  itens = signal<ItemLote[]>([]);
  processando = signal(false);
  erroGeral = signal('');

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.categoria = this.route.snapshot.paramMap.get('categoria') ?? '';
  }

  async onArquivosSelecionados(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);
    input.value = '';
    if (arquivos.length === 0) return;

    this.erroGeral.set('');
    if (!this.marca.trim()) {
      this.erroGeral.set('Preencha a marca antes de escolher as fotos.');
      return;
    }
    if (!environment.cloudinaryCloudName || !environment.cloudinaryUploadPreset) {
      this.erroGeral.set('Upload de imagens ainda não configurado (Cloudinary).');
      return;
    }

    const novosItens: ItemLote[] = arquivos.map((arquivo) => ({
      arquivo,
      previewUrl: URL.createObjectURL(arquivo),
      status: 'pendente' as StatusItem,
    }));
    this.itens.set([...this.itens(), ...novosItens]);

    this.processando.set(true);
    for (const item of novosItens) {
      await this.processarItem(item);
    }
    this.processando.set(false);
  }

  private async processarItem(item: ItemLote): Promise<void> {
    this.atualizarStatus(item, 'enviando');
    try {
      const formData = new FormData();
      formData.append('file', item.arquivo);
      formData.append('upload_preset', environment.cloudinaryUploadPreset);
      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${environment.cloudinaryCloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      if (!resp.ok) throw new Error('upload falhou');
      const data = await resp.json();

      await this.api.criarProdutoVitrine({
        categoria: this.categoria,
        marca: this.marca.trim(),
        nome: '',
        preco: 0,
        imagem_url: data.secure_url,
        foto_extra_1: '',
        foto_extra_2: '',
        foto_extra_3: '',
        foto_extra_4: '',
        destaque: false,
      });
      this.atualizarStatus(item, 'ok');
    } catch {
      this.atualizarStatus(item, 'erro');
    }
  }

  private atualizarStatus(item: ItemLote, status: StatusItem): void {
    this.itens.set(this.itens().map((i) => (i === item ? { ...i, status } : i)));
  }
}
