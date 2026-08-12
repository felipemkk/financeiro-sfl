export const NUMERO_WHATSAPP_LOJA = '5534997340076';

export function linkWhatsapp(mensagem: string): string {
  return `https://wa.me/${NUMERO_WHATSAPP_LOJA}?text=${encodeURIComponent(mensagem)}`;
}
