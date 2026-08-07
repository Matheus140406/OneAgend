import type { Locale, NicheType } from '@prisma/client';

export interface NicheMeta {
  label: string;
  description: string;
  emoji: string;
}

/** Rótulo, descrição e emoji por nicho (o painel em si não é traduzido — só o bot de WhatsApp é). */
export const NICHE_META: Record<NicheType, NicheMeta> = {
  BEAUTY_SALON: { label: 'Salão de Beleza', description: 'Cabelo, unhas e estética', emoji: '✂️' },
  HEALTH_CLINIC: { label: 'Clínica & Saúde', description: 'Odontologia, psicologia, fisio', emoji: '🏥' },
  BARBERSHOP: { label: 'Barbearia', description: 'Corte, barba e grooming', emoji: '💈' },
  PETSHOP: { label: 'Petshop & Banho/Tosa', description: 'Banho, tosa e cuidados pet', emoji: '🐾' },
  PERSONAL_TRAINER: { label: 'Personal & Academia', description: 'Treinos, avaliações e aulas', emoji: '🏋️' },
  TATTOO_STUDIO: { label: 'Tatuagem & Piercing', description: 'Estúdios de arte corporal', emoji: '🖋️' },
  THERAPY_CONSULTING: { label: 'Terapia & Consultoria', description: 'Psicoterapia, coaching, mentoria', emoji: '🧠' },
  SPORTS_COURT: { label: 'Quadras & Arenas', description: 'Esporte, aluguel de quadras', emoji: '🏟️' },
};

export const NICHE_LABELS: Record<NicheType, string> = Object.fromEntries(
  Object.entries(NICHE_META).map(([key, meta]) => [key, meta.label]),
) as Record<NicheType, string>;

export const LOCALE_LABELS: Record<Locale, string> = {
  PT_BR: 'Português (Brasil)',
  PT_PT: 'Português (Portugal)',
  EN: 'English',
  ES: 'Español',
  FR: 'Français',
};
