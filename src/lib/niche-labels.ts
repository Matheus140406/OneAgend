import type { Locale, NicheType } from '@prisma/client';

/** Rótulos em pt-BR para os selects do painel (o painel em si não é traduzido — só o bot de WhatsApp é). */
export const NICHE_LABELS: Record<NicheType, string> = {
  BEAUTY_SALON: 'Salão de beleza',
  HEALTH_CLINIC: 'Clínica de saúde',
  BARBERSHOP: 'Barbearia',
  PETSHOP: 'Petshop',
  PERSONAL_TRAINER: 'Personal trainer',
  TATTOO_STUDIO: 'Estúdio de tatuagem',
  THERAPY_CONSULTING: 'Terapia / consultoria',
  SPORTS_COURT: 'Quadra esportiva',
};

export const LOCALE_LABELS: Record<Locale, string> = {
  PT_BR: 'Português (Brasil)',
  PT_PT: 'Português (Portugal)',
  EN: 'English',
  ES: 'Español',
  FR: 'Français',
};
