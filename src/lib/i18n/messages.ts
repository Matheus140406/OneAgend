import type { Locale } from '@prisma/client';

/**
 * i18n das mensagens automaticas de WhatsApp (lembrete/bot interativo).
 * Nao cobre a UI do painel (que continua so em pt-BR) — escopo deliberado,
 * ja que o publico do bot (clientes finais) pode falar outro idioma mesmo
 * quando o dono do negocio usa o painel em portugues.
 */

export type SupportedLocale = Locale;

export const SUPPORTED_LOCALES: SupportedLocale[] = ['PT_BR', 'PT_PT', 'EN', 'ES', 'FR'];

type WhatsappMessageKey =
  | 'confirmAck'
  | 'cancelAck'
  | 'rescheduleOffer'
  | 'rescheduleNoSlots'
  | 'unrecognizedReply'
  | 'waitlistSlotOpened';

type MessageDictionary = Record<WhatsappMessageKey, string>;

// Placeholders no formato {{chave}}, substituidos por format() abaixo.
const WHATSAPP_MESSAGES: Record<SupportedLocale, MessageDictionary> = {
  PT_BR: {
    confirmAck: 'Prontinho, {{name}}! Seu horário de {{service}} no dia {{date}} às {{time}} está confirmado.',
    cancelAck: 'Ok, {{name}}. Seu horário de {{service}} no dia {{date}} às {{time}} foi cancelado.',
    rescheduleOffer: 'Sem problemas, {{name}}! Próximos horários disponíveis:\n{{slots}}\nResponda com o número da opção desejada.',
    rescheduleNoSlots: 'No momento não há horários disponíveis nos próximos dias. Vamos avisar assim que abrir um novo horário.',
    unrecognizedReply: 'Não entendi sua resposta. Responda 1 para confirmar, 2 para reagendar ou 3 para cancelar.',
    waitlistSlotOpened: '{{name}}, uma vaga abriu para {{service}} no dia {{date}} às {{time}}. Responda SIM para garantir esse horário.',
  },
  PT_PT: {
    confirmAck: 'Está confirmado, {{name}}! A sua marcação de {{service}} no dia {{date}} às {{time}} foi confirmada.',
    cancelAck: 'Ok, {{name}}. A sua marcação de {{service}} no dia {{date}} às {{time}} foi cancelada.',
    rescheduleOffer: 'Sem problema, {{name}}! Próximos horários disponíveis:\n{{slots}}\nResponda com o número da opção pretendida.',
    rescheduleNoSlots: 'De momento não há horários disponíveis nos próximos dias. Avisaremos assim que surgir um novo horário.',
    unrecognizedReply: 'Não percebi a sua resposta. Responda 1 para confirmar, 2 para remarcar ou 3 para cancelar.',
    waitlistSlotOpened: '{{name}}, abriu uma vaga para {{service}} no dia {{date}} às {{time}}. Responda SIM para garantir este horário.',
  },
  EN: {
    confirmAck: 'All set, {{name}}! Your {{service}} appointment on {{date}} at {{time}} is confirmed.',
    cancelAck: 'Ok, {{name}}. Your {{service}} appointment on {{date}} at {{time}} has been canceled.',
    rescheduleOffer: 'No problem, {{name}}! Next available times:\n{{slots}}\nReply with the number of the option you want.',
    rescheduleNoSlots: "There are no available times in the next few days right now. We'll let you know as soon as a new slot opens.",
    unrecognizedReply: "Sorry, we didn't understand. Reply 1 to confirm, 2 to reschedule, or 3 to cancel.",
    waitlistSlotOpened: '{{name}}, a spot opened up for {{service}} on {{date}} at {{time}}. Reply YES to claim it.',
  },
  ES: {
    confirmAck: '¡Listo, {{name}}! Tu cita de {{service}} el {{date}} a las {{time}} está confirmada.',
    cancelAck: 'Ok, {{name}}. Tu cita de {{service}} el {{date}} a las {{time}} fue cancelada.',
    rescheduleOffer: '¡No hay problema, {{name}}! Próximos horarios disponibles:\n{{slots}}\nResponde con el número de la opción deseada.',
    rescheduleNoSlots: 'Por ahora no hay horarios disponibles en los próximos días. Te avisaremos en cuanto se abra un nuevo horario.',
    unrecognizedReply: 'No entendimos tu respuesta. Responde 1 para confirmar, 2 para reprogramar o 3 para cancelar.',
    waitlistSlotOpened: '{{name}}, ¡se liberó un horario para {{service}} el {{date}} a las {{time}}! Responde SÍ para reservarlo.',
  },
  FR: {
    confirmAck: "C'est confirmé, {{name}} ! Votre rendez-vous de {{service}} le {{date}} à {{time}} est confirmé.",
    cancelAck: 'Ok, {{name}}. Votre rendez-vous de {{service}} le {{date}} à {{time}} a été annulé.',
    rescheduleOffer: 'Pas de problème, {{name}} ! Prochains créneaux disponibles :\n{{slots}}\nRépondez avec le numéro de l’option souhaitée.',
    rescheduleNoSlots: "Il n'y a pas de créneau disponible dans les prochains jours pour le moment. Nous vous préviendrons dès qu'un nouveau créneau s'ouvrira.",
    unrecognizedReply: "Nous n'avons pas compris votre réponse. Répondez 1 pour confirmer, 2 pour reporter ou 3 pour annuler.",
    waitlistSlotOpened: '{{name}}, un créneau s’est libéré pour {{service}} le {{date}} à {{time}}. Répondez OUI pour le réserver.',
  },
};

function format(template: string, params: Record<string, string>): string {
  return template.replace(/{{(\w+)}}/g, (match, key: string) => params[key] ?? match);
}

export function t(locale: SupportedLocale, key: WhatsappMessageKey, params: Record<string, string> = {}): string {
  const dictionary = WHATSAPP_MESSAGES[locale] ?? WHATSAPP_MESSAGES.PT_BR;
  return format(dictionary[key], params);
}
