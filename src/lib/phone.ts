/** Normaliza um numero de WhatsApp brasileiro para E.164 (+55...). */
export function normalizeBrazilianWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

export function isValidBrazilianWhatsapp(raw: string): boolean {
  const normalized = normalizeBrazilianWhatsapp(raw);
  return /^\+55\d{10,11}$/.test(normalized);
}
