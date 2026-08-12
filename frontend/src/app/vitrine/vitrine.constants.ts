import { ProdutoVitrine } from '../core/models';

export const NUMERO_WHATSAPP_LOJA = '5534997340076';

export function linkWhatsapp(mensagem: string): string {
  return `https://wa.me/${NUMERO_WHATSAPP_LOJA}?text=${encodeURIComponent(mensagem)}`;
}

export function linkWhatsappProduto(p: ProdutoVitrine): string {
  const item = p.nome ? `${p.nome}${p.marca ? ' (' + p.marca + ')' : ''}` : p.marca;
  const precoTexto = p.preco > 0
    ? `, no valor de ${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    : '';
  return linkWhatsapp(`Olá! Tenho interesse em ${item}${precoTexto}. Ainda está disponível?`);
}
