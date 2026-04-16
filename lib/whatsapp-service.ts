import { stripNonDigits } from './utils';

/**
 * Gera um link direto do WhatsApp (wa.me) para envio manual.
 */
export const getWhatsAppLink = (phone: string, message: string): string => {
  // Normaliza o número: Remove tudo que não é dígito e garante o código do país
  let cleanNumber = stripNonDigits(phone);
  if (cleanNumber.length <= 11) {
    cleanNumber = '55' + cleanNumber;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodedMessage}`;
};

/**
 * Interface unificada para manter compatibilidade com o frontend
 */
export const sendWhatsAppMessage = async (
  phone: string,
  message: string
) => {
  // Retorna o link para que o frontend decida abrir
  return { 
    success: true, 
    link: getWhatsAppLink(phone, message) 
  };
};
