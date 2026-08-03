import { type PrismaClient, AppointmentStatus } from '@prisma/client';
import { getAvailableSlotsForProfessional } from '@/lib/booking/availability';
import { addDaysToDateKey, businessDateKey } from '@/lib/booking/time';
import { t, type SupportedLocale } from '@/lib/i18n/messages';
import { sendWhatsappTextMessage } from './client';

/**
 * Bot interativo de resposta simples (1/2/3) do lembrete de WhatsApp.
 * Cada handler e independente e recebe o agendamento ja carregado — quem
 * orquestra (a rota do webhook) e responsavel por resolver qual agendamento
 * a mensagem recebida se refere (ver resolveAppointmentForReply).
 */

export type InboundIntent = 'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'UNKNOWN';

// As chaves ja estao normalizadas (sem acento) porque sao comparadas contra
// normalizeReply(), que remove acentos do texto recebido.
const CONFIRM_KEYWORDS = new Set(['1', 'confirmar', 'confirmo', 'confirm', 'confirmer', 'confirme']);
const RESCHEDULE_KEYWORDS = new Set([
  '2',
  'reagendar',
  'remarcar',
  'reschedule',
  'reprogramar',
  'reprogramer',
  'reprogrammer',
  'reporter',
  'report',
]);
const CANCEL_KEYWORDS = new Set(['3', 'cancelar', 'cancel', 'annuler']);

const COMBINING_DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

export function normalizeReply(raw: string): string {
  // NFD separa a letra base do acento (ex: "é" -> "e" + acento combinante),
  // depois removemos os acentos p/ casar variantes com/sem diacritico.
  return raw.trim().toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICS, '');
}

export function parseInboundIntent(rawText: string): InboundIntent {
  const normalized = normalizeReply(rawText);
  if (CONFIRM_KEYWORDS.has(normalized)) return 'CONFIRM';
  if (RESCHEDULE_KEYWORDS.has(normalized)) return 'RESCHEDULE';
  if (CANCEL_KEYWORDS.has(normalized)) return 'CANCEL';
  return 'UNKNOWN';
}

const ACTIVE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

export interface ResolvedAppointment {
  id: string;
  tenantId: string;
  professionalId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  tenant: { timezone: string; locale: SupportedLocale };
  client: { id: string; name: string; whatsapp: string; whatsappOptOut: boolean };
  service: { name: string; durationMinutes: number };
}

/**
 * Encontra o proximo agendamento ativo (PENDING/CONFIRMED, ainda no futuro)
 * do cliente que mandou a mensagem, pelo numero de telefone.
 *
 * `phoneNumberId` (metadata do payload da Meta) restringe a busca ao tenant
 * dono desse numero, quando o tenant tem WhatsApp proprio configurado
 * (Tenant.whatsappPhone). Sem isso — numero compartilhado da plataforma —
 * a busca cai para "o agendamento mais proximo com esse WhatsApp entre todos
 * os tenants", que e ambigua apenas no caso raro de dois clientes com o
 * mesmo numero em tenants diferentes tendo agendamentos pendentes ao mesmo tempo.
 */
export async function resolveAppointmentForReply(
  prisma: PrismaClient,
  fromPhoneE164: string,
  phoneNumberId: string | null,
  now: Date = new Date(),
): Promise<ResolvedAppointment | null> {
  const tenantScope = phoneNumberId
    ? await prisma.tenant.findFirst({ where: { whatsappPhone: phoneNumberId }, select: { id: true } })
    : null;

  const appointment = await prisma.appointment.findFirst({
    where: {
      status: { in: ACTIVE_STATUSES },
      startsAt: { gte: now },
      client: { whatsapp: fromPhoneE164 },
      ...(tenantScope ? { tenantId: tenantScope.id } : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: {
      tenant: { select: { timezone: true, locale: true } },
      client: { select: { id: true, name: true, whatsapp: true, whatsappOptOut: true } },
      service: { select: { name: true, durationMinutes: true } },
    },
  });

  return appointment as unknown as ResolvedAppointment | null;
}

export function formatDateTimeLabel(date: Date, timezone: string, locale: SupportedLocale): { date: string; time: string } {
  const intlLocale = { PT_BR: 'pt-BR', PT_PT: 'pt-PT', EN: 'en-US', ES: 'es-ES', FR: 'fr-FR' }[locale];
  const dateLabel = new Intl.DateTimeFormat(intlLocale, { timeZone: timezone, day: '2-digit', month: '2-digit' }).format(date);
  const timeLabel = new Intl.DateTimeFormat(intlLocale, { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(date);
  return { date: dateLabel, time: timeLabel };
}

/** Confirma o agendamento (idempotente: reenviar "1" nao gera efeito colateral extra). */
export async function handleConfirmReply(prisma: PrismaClient, appointment: ResolvedAppointment): Promise<string> {
  if (appointment.status === 'PENDING') {
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'CONFIRMED' } });
  }

  const { date, time } = formatDateTimeLabel(appointment.startsAt, appointment.tenant.timezone, appointment.tenant.locale);
  return t(appointment.tenant.locale, 'confirmAck', { name: appointment.client.name, service: appointment.service.name, date, time });
}

export const MAX_RESCHEDULE_SLOTS = 3;
const MAX_RESCHEDULE_SEARCH_DAYS = 14;

export interface RescheduleOfferMessage {
  message: string;
  /** Vazio quando nao ha horario livre — nesse caso nao ha oferta para persistir. */
  slots: Date[];
}

/** Busca ate 3 proximos horarios livres do mesmo profissional/servico e monta a mensagem com as opcoes. */
export async function handleRescheduleReply(
  prisma: PrismaClient,
  appointment: ResolvedAppointment,
  now: Date = new Date(),
): Promise<RescheduleOfferMessage> {
  const { timezone, locale } = appointment.tenant;
  const slots: Date[] = [];
  let dateKey = businessDateKey(now, timezone);

  for (let i = 0; i < MAX_RESCHEDULE_SEARCH_DAYS && slots.length < MAX_RESCHEDULE_SLOTS; i += 1) {
    const daySlots = await getAvailableSlotsForProfessional(prisma, {
      professionalId: appointment.professionalId,
      dateKey,
      timezone,
      durationMinutes: appointment.service.durationMinutes,
      now,
    });
    for (const slot of daySlots) {
      if (slots.length >= MAX_RESCHEDULE_SLOTS) break;
      // Nao oferece de novo o proprio horario atual como "novo" horario.
      if (slot.getTime() !== appointment.startsAt.getTime()) slots.push(slot);
    }
    dateKey = addDaysToDateKey(dateKey, 1);
  }

  if (slots.length === 0) {
    return { message: t(locale, 'rescheduleNoSlots'), slots: [] };
  }

  const slotsLabel = slots
    .map((slot, index) => {
      const { date, time } = formatDateTimeLabel(slot, timezone, locale);
      return `${index + 1}) ${date} ${time}`;
    })
    .join('\n');

  return { message: t(locale, 'rescheduleOffer', { name: appointment.client.name, slots: slotsLabel }), slots };
}

const MAX_WAITLIST_NOTIFICATIONS = 5;
export const WAITLIST_CLAIM_TTL_MINUTES = 60;

export interface CancelReplyResult {
  ackMessage: string;
  waitlistNotified: number;
}

/**
 * Cancela o agendamento e dispara a "recuperacao de no-show": procura
 * clientes elegiveis na fila de espera para o mesmo servico/profissional
 * (e, se informado, o mesmo dia) e avisa que uma vaga abriu. O horario exato
 * fica gravado na entrada (offeredStartsAt/EndsAt) para o cliente poder
 * reivindicar respondendo "SIM" (ver src/lib/whatsapp/waitlist-claim.ts) —
 * e primeiro que responder leva, os demais recebem "vaga ja preenchida".
 */
export async function handleCancelReply(prisma: PrismaClient, appointment: ResolvedAppointment, now: Date = new Date()): Promise<CancelReplyResult> {
  if (appointment.status !== 'CANCELED') {
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'CANCELED' } });
  }

  const { date, time } = formatDateTimeLabel(appointment.startsAt, appointment.tenant.timezone, appointment.tenant.locale);
  const ackMessage = t(appointment.tenant.locale, 'cancelAck', {
    name: appointment.client.name,
    service: appointment.service.name,
    date,
    time,
  });

  const canceledDateKey = businessDateKey(appointment.startsAt, appointment.tenant.timezone);

  const candidates = await prisma.waitlistEntry.findMany({
    where: {
      tenantId: appointment.tenantId,
      serviceId: appointment.serviceId,
      status: 'WAITING',
      OR: [{ professionalId: null }, { professionalId: appointment.professionalId }],
      AND: [{ OR: [{ preferredDateKey: null }, { preferredDateKey: canceledDateKey }] }],
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_WAITLIST_NOTIFICATIONS,
    include: { client: { select: { id: true, name: true, whatsapp: true, whatsappOptOut: true } } },
  });

  let notified = 0;
  for (const entry of candidates) {
    // Falha ao notificar um candidato nao pode impedir a notificacao dos demais.
    try {
      if (entry.client.whatsappOptOut) continue;

      const message = t(appointment.tenant.locale, 'waitlistSlotOpened', {
        name: entry.client.name,
        service: appointment.service.name,
        date,
        time,
      });

      const result = await sendWhatsappTextMessage({ to: entry.client.whatsapp, body: message });
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: result.success
          ? {
              status: 'NOTIFIED',
              notifiedAt: now,
              offeredStartsAt: appointment.startsAt,
              offeredEndsAt: appointment.endsAt,
              offeredProfessionalId: appointment.professionalId,
              offerExpiresAt: new Date(now.getTime() + WAITLIST_CLAIM_TTL_MINUTES * 60_000),
            }
          : {},
      });
      if (result.success) notified += 1;
    } catch (error) {
      console.error(`Falha ao notificar cliente da fila de espera (waitlistEntry ${entry.id}):`, error);
    }
  }

  return { ackMessage, waitlistNotified: notified };
}
