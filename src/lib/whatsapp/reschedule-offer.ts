import type { PrismaClient } from '@prisma/client';
import { rescheduleAppointmentInTransaction } from '@/lib/booking/validateAppointment';
import { AppointmentConflictError } from '@/lib/booking/validateAppointment';
import { t } from '@/lib/i18n/messages';
import { formatDateTimeLabel, type ResolvedAppointment } from './interactive';

/** Tempo que o cliente tem para escolher um dos horarios oferecidos antes da oferta expirar. */
export const RESCHEDULE_OFFER_TTL_MINUTES = 30;

export async function saveRescheduleOffer(
  prisma: PrismaClient,
  appointmentId: string,
  slots: Date[],
  now: Date = new Date(),
): Promise<void> {
  if (slots.length === 0) return;

  const expiresAt = new Date(now.getTime() + RESCHEDULE_OFFER_TTL_MINUTES * 60_000);
  await prisma.rescheduleOffer.upsert({
    where: { appointmentId },
    create: { appointmentId, slotsOffered: slots, expiresAt },
    update: { slotsOffered: slots, expiresAt, createdAt: now },
  });
}

export interface ActiveRescheduleOffer {
  appointment: ResolvedAppointment;
  slotsOffered: Date[];
}

/**
 * Encontra uma oferta de reagendamento ainda valida para o telefone que
 * respondeu. So existe uma por agendamento (chave unica appointmentId), e o
 * agendamento so pode ter uma oferta ativa relevante se ainda estiver
 * PENDING/CONFIRMED — senao (foi cancelado por outro caminho, por ex.) a
 * oferta e ignorada mesmo que ainda exista a linha no banco.
 */
export async function resolveActiveRescheduleOffer(
  prisma: PrismaClient,
  fromPhoneE164: string,
  now: Date = new Date(),
): Promise<ActiveRescheduleOffer | null> {
  const offer = await prisma.rescheduleOffer.findFirst({
    where: {
      expiresAt: { gt: now },
      appointment: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        client: { whatsapp: fromPhoneE164 },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      appointment: {
        include: {
          tenant: { select: { timezone: true, locale: true } },
          client: { select: { id: true, name: true, whatsapp: true, whatsappOptOut: true } },
          service: { select: { name: true, durationMinutes: true } },
        },
      },
    },
  });

  if (!offer) return null;

  return {
    appointment: offer.appointment as unknown as ResolvedAppointment,
    slotsOffered: offer.slotsOffered,
  };
}

/** "1"/"2"/"3" (normalizado) -> indice 0-based da oferta, ou null se fora do intervalo. */
export function parseSlotSelection(normalizedText: string, slotCount: number): number | null {
  if (!/^\d+$/.test(normalizedText)) return null;
  const choice = Number(normalizedText);
  if (choice < 1 || choice > slotCount) return null;
  return choice - 1;
}

/**
 * Efetiva o reagendamento para o horario escolhido. Revalida disponibilidade
 * na hora (o horario ofertado minutos atras pode ter sido preenchido por
 * outra pessoa nesse meio tempo) — em caso de conflito, devolve os mesmos 3
 * horarios de novo nao e o objetivo aqui; simplesmente avisamos que aquele
 * horario especifico nao esta mais livre e pedimos para o cliente responder
 * "2" de novo para ver opcoes atualizadas.
 */
export async function handleRescheduleSelection(
  prisma: PrismaClient,
  offer: ActiveRescheduleOffer,
  chosenIndex: number,
): Promise<string> {
  const { appointment, slotsOffered } = offer;
  const chosenSlot = slotsOffered[chosenIndex];
  if (!chosenSlot) {
    // So acontece se chosenIndex vier de fora dos limites de parseSlotSelection.
    throw new Error(`Indice de horario invalido: ${chosenIndex} (${slotsOffered.length} ofertados).`);
  }
  const durationMs = appointment.endsAt.getTime() - appointment.startsAt.getTime();
  const newEndsAt = new Date(chosenSlot.getTime() + durationMs);

  try {
    await rescheduleAppointmentInTransaction(prisma, {
      appointmentId: appointment.id,
      professionalId: appointment.professionalId,
      startsAt: chosenSlot,
      endsAt: newEndsAt,
      timezone: appointment.tenant.timezone,
    });
  } catch (error) {
    await prisma.rescheduleOffer.deleteMany({ where: { appointmentId: appointment.id } });
    if (error instanceof AppointmentConflictError) {
      return t(appointment.tenant.locale, 'rescheduleNoSlots');
    }
    throw error;
  }

  await prisma.rescheduleOffer.deleteMany({ where: { appointmentId: appointment.id } });

  const { date, time } = formatDateTimeLabel(chosenSlot, appointment.tenant.timezone, appointment.tenant.locale);
  return t(appointment.tenant.locale, 'confirmAck', {
    name: appointment.client.name,
    service: appointment.service.name,
    date,
    time,
  });
}
