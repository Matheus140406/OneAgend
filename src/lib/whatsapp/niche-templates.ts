import type { NicheType } from '@prisma/client';
import type { SupportedLocale } from '@/lib/i18n/messages';

/**
 * Mensagem padrao de divulgacao/agendamento por nicho e idioma, usada quando
 * o tenant nao define um `whatsappTemplate` proprio (ver Tenant.whatsappTemplate
 * e o endpoint POST /api/whatsapp/link). O texto e sempre "substantivo do
 * nicho, localizado" + "frase fixa do idioma" + link publico de agendamento,
 * o que evita ter que escrever 40 frases inteiras na mao (8 nichos x 5 idiomas).
 */

const NICHE_NOUN: Record<NicheType, Record<SupportedLocale, string>> = {
  BEAUTY_SALON: {
    PT_BR: 'nosso salão de beleza',
    PT_PT: 'o nosso salão de beleza',
    EN: 'our beauty salon',
    ES: 'nuestro salón de belleza',
    FR: 'notre salon de beauté',
  },
  HEALTH_CLINIC: {
    PT_BR: 'nossa clínica',
    PT_PT: 'a nossa clínica',
    EN: 'our clinic',
    ES: 'nuestra clínica',
    FR: 'notre clinique',
  },
  BARBERSHOP: {
    PT_BR: 'nossa barbearia',
    PT_PT: 'a nossa barbearia',
    EN: 'our barbershop',
    ES: 'nuestra barbería',
    FR: 'notre barbier',
  },
  PETSHOP: {
    PT_BR: 'nosso petshop',
    PT_PT: 'o nosso petshop',
    EN: 'our pet shop',
    ES: 'nuestra peluquería canina',
    FR: 'notre salon de toilettage',
  },
  PERSONAL_TRAINER: {
    PT_BR: 'nossos treinos com personal trainer',
    PT_PT: 'os nossos treinos com personal trainer',
    EN: 'our personal training sessions',
    ES: 'nuestras sesiones de entrenador personal',
    FR: 'nos séances de coaching sportif',
  },
  TATTOO_STUDIO: {
    PT_BR: 'nosso estúdio de tatuagem',
    PT_PT: 'o nosso estúdio de tatuagem',
    EN: 'our tattoo studio',
    ES: 'nuestro estudio de tatuajes',
    FR: 'notre studio de tatouage',
  },
  THERAPY_CONSULTING: {
    PT_BR: 'nossas sessões de terapia',
    PT_PT: 'as nossas sessões de terapia',
    EN: 'our therapy sessions',
    ES: 'nuestras sesiones de terapia',
    FR: 'nos séances de thérapie',
  },
  SPORTS_COURT: {
    PT_BR: 'nossa quadra esportiva',
    PT_PT: 'o nosso campo desportivo',
    EN: 'our sports court',
    ES: 'nuestra cancha deportiva',
    FR: 'notre terrain de sport',
  },
};

const BOOKING_LINK_SENTENCE: Record<SupportedLocale, (noun: string, link: string) => string> = {
  PT_BR: (noun, link) => `Olá! Agende seu horário em ${noun} pelo link: ${link}`,
  PT_PT: (noun, link) => `Olá! Marque a sua hora em ${noun} através do link: ${link}`,
  EN: (noun, link) => `Hi! Book your appointment at ${noun} here: ${link}`,
  ES: (noun, link) => `¡Hola! Agenda tu cita en ${noun} en este enlace: ${link}`,
  FR: (noun, link) => `Bonjour ! Réservez votre créneau chez ${noun} via ce lien : ${link}`,
};

const DEFAULT_APP_URL = 'https://oneagend.com';

export function buildBookingLink(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, '');
  return `${base}/agendar/${slug}`;
}

/** Texto padrao (nicho + idioma) sugerido para o tenant divulgar sua agenda publica. */
export function buildNicheDefaultTemplate(niche: NicheType, locale: SupportedLocale, slug: string): string {
  const noun = NICHE_NOUN[niche][locale];
  const link = buildBookingLink(slug);
  return BOOKING_LINK_SENTENCE[locale](noun, link);
}
