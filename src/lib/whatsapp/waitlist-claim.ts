import type { PrismaClient } from '@prisma/client';
import { createAppointmentInTransaction, AppointmentConflictError } from '@/lib/booking/validateAppointment';
import { t, type SupportedLocale } from '@/lib/i18n/messages';
import { formatDateTimeLabel } from './interactive';

// As chaves ja estao normalizadas (sem acento) — normalizeReply() e privada
// de interactive.ts, entao repetimos o pequeno conjunto aqui em vez de
// exportar detalhe interno so para isso.
export const CLAIM_KEYWORDS = new Set(['sim', 'yes', 'oui', 'si']);

export interface ActiveWaitlistClaim {
  id: string;
  tenantId: string;
  serviceId: string;
  clientId: string;
  offeredProfessionalId: string;
  offeredStartsAt: Date;
  offeredEndsAt: Date;
  tenant: { timezone: string; locale: SupportedLocale };
  client: { name: string; whatsapp: string };
  service: { name: string };
}

/** Entrada NOTIFIED, ainda dentro do prazo, para o telefone que respondeu. */
export async function resolveActiveWaitlistClaim(
  prisma: PrismaClient,
  fromPhoneE164: string,
  now: Date = new Date(),
): Promise<ActiveWaitlistClaim | null> {
  const entry = await prisma.waitlistEntry.findFirst({
    where: {
      status: 'NOTIFIED',
      offerExpiresAt: { gt: now },
      offeredStartsAt: { not: null },
      client: { whatsapp: fromPhoneE164 },
    },
    orderBy: { notifiedAt: 'desc' },
    include: {
      tenant: { select: { timezone: true, locale: true } },
      client: { select: { name: true, whatsapp: true } },
      service: { select: { name: true } },
    },
  });

  if (!entry || !entry.offeredStartsAt || !entry.offeredEndsAt || !entry.offeredProfessionalId) return null;

  return {
    id: entry.id,
    tenantId: entry.tenantId,
    serviceId: entry.serviceId,
    clientId: entry.clientId,
    offeredProfessionalId: entry.offeredProfessionalId,
    offeredStartsAt: entry.offeredStartsAt,
    offeredEndsAt: entry.offeredEndsAt,
    tenant: entry.tenant,
    client: entry.client,
    service: entry.service,
  };
}

/**
 * Efetiva a reserva para quem respondeu "SIM" primeiro. Como varios
 * clientes da fila sao avisados do MESMO horario ao mesmo tempo, existe uma
 * corrida entre eles: aqui fechamos a maior parte da janela checando se
 * algum outro já reivindicou esse exato horario antes de tentar criar o
 * agendamento — a defesa final contra dois "SIM" simultaneos e a propria
 * checagem de conflito dentro da transacao de criacao (mesma que protege a
 * agenda publica).
 */
export async function handleWaitlistClaimReply(prisma: PrismaClient, claim: ActiveWaitlistClaim): Promise<string> {
  const alreadyTaken = await prisma.waitlistEntry.findFirst({
    where: {
      tenantId: claim.tenantId,
      offeredProfessionalId: claim.offeredProfessionalId,
      offeredStartsAt: claim.offeredStartsAt,
      status: 'BOOKED',
    },
    select: { id: true },
  });

  if (alreadyTaken) {
    await prisma.waitlistEntry.updateMany({ where: { id: claim.id, status: 'NOTIFIED' }, data: { status: 'EXPIRED' } });
    return t(claim.tenant.locale, 'waitlistAlreadyTaken', { name: claim.client.name });
  }

  try {
    await createAppointmentInTransaction(prisma, {
      tenantId: claim.tenantId,
      professionalId: claim.offeredProfessionalId,
      serviceId: claim.serviceId,
      clientId: claim.clientId,
      startsAt: claim.offeredStartsAt,
      endsAt: claim.offeredEndsAt,
      timezone: claim.tenant.timezone,
    });
  } catch (error) {
    if (error instanceof AppointmentConflictError) {
      await prisma.waitlistEntry.updateMany({ where: { id: claim.id, status: 'NOTIFIED' }, data: { status: 'EXPIRED' } });
      return t(claim.tenant.locale, 'waitlistAlreadyTaken', { name: claim.client.name });
    }
    throw error;
  }

  await prisma.waitlistEntry.updateMany({ where: { id: claim.id, status: 'NOTIFIED' }, data: { status: 'BOOKED' } });

  const { date, time } = formatDateTimeLabel(claim.offeredStartsAt, claim.tenant.timezone, claim.tenant.locale);
  return t(claim.tenant.locale, 'confirmAck', {
    name: claim.client.name,
    service: claim.service.name,
    date,
    time,
  });
}
