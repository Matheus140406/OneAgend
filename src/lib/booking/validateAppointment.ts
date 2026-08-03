import type { PrismaClient } from '@prisma/client';
import { getBusinessMoment } from './time';

/**
 * REGRA DE NEGOCIO CRITICA
 *
 * Antes de confirmar qualquer agendamento, validamos tres condicoes, nessa ordem,
 * sempre dentro de uma transacao para eliminar condicoes de corrida entre duas
 * pessoas reservando o mesmo horario ao mesmo tempo:
 *
 *   1. O horario esta dentro do expediente do profissional (WorkingHour) naquele dia da semana.
 *   2. O horario nao cai dentro de uma folga/bloqueio (TimeOff) do profissional.
 *   3. Nao existe outro Appointment ativo do mesmo profissional com intervalo [start,end) sobreposto.
 *
 * Qualquer falha rejeita a operacao com um erro tipado e uma mensagem clara.
 */

export type AppointmentConflictCode =
  | 'INVALID_RANGE'
  | 'OUTSIDE_WORKING_HOURS'
  | 'TIME_OFF'
  | 'OVERLAPPING_APPOINTMENT';

export class AppointmentConflictError extends Error {
  code: AppointmentConflictCode;

  constructor(code: AppointmentConflictCode, message: string) {
    super(message);
    this.name = 'AppointmentConflictError';
    this.code = code;
  }
}

const BLOCKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;

// Interface minima do acesso a dados exigido pela validacao, para que a regra
// de negocio possa ser testada com um banco falso, sem subir Postgres.
export interface BookingDataSource {
  workingHour: {
    findMany: (args: unknown) => Promise<{ startTime: string; endTime: string }[]>;
  };
  timeOff: {
    findMany: (args: unknown) => Promise<{ id: string }[]>;
  };
  appointment: {
    findMany: (args: unknown) => Promise<{ id: string }[]>;
  };
}

export interface AssertSlotIsAvailableParams {
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  /** Ao reagendar, exclui o proprio agendamento da checagem de sobreposicao. */
  excludeAppointmentId?: string;
}

export async function assertSlotIsAvailable(
  db: BookingDataSource,
  params: AssertSlotIsAvailableParams,
): Promise<void> {
  const { professionalId, startsAt, endsAt, timezone, excludeAppointmentId } = params;

  if (endsAt <= startsAt) {
    throw new AppointmentConflictError(
      'INVALID_RANGE',
      'O horario de termino precisa ser depois do horario de inicio.',
    );
  }

  const start = getBusinessMoment(startsAt, timezone);
  const end = getBusinessMoment(endsAt, timezone);

  // Agendamentos que atravessam a virada do dia nao sao suportados pelo modelo
  // de expediente semanal (WorkingHour e definido por dia da semana isolado).
  if (start.weekday !== end.weekday) {
    throw new AppointmentConflictError(
      'OUTSIDE_WORKING_HOURS',
      'O horario escolhido atravessa a virada do dia e nao pode ser agendado.',
    );
  }

  // 1. Dentro do expediente do profissional naquele dia da semana.
  const workingHours = await db.workingHour.findMany({
    where: { professionalId, weekday: start.weekday },
  });

  const fitsWorkingHours = workingHours.some(
    (wh) => start.time >= wh.startTime && end.time <= wh.endTime,
  );

  if (!fitsWorkingHours) {
    throw new AppointmentConflictError(
      'OUTSIDE_WORKING_HOURS',
      'O profissional nao atende nesse dia/horario.',
    );
  }

  // 2. Nao pode cair dentro de uma folga/bloqueio (TimeOff) do profissional.
  const overlappingTimeOff = await db.timeOff.findMany({
    where: {
      professionalId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
    take: 1,
  });

  if (overlappingTimeOff.length > 0) {
    throw new AppointmentConflictError('TIME_OFF', 'O profissional esta de folga nesse horario.');
  }

  // 3. Nao pode sobrepor outro agendamento ativo (PENDING/CONFIRMED) do mesmo
  // profissional. Sobreposicao classica de intervalos: [start,end) vs [start,end).
  const overlappingAppointment = await db.appointment.findMany({
    where: {
      professionalId,
      status: { in: BLOCKING_STATUSES as unknown as string[] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true },
    take: 1,
  });

  if (overlappingAppointment.length > 0) {
    throw new AppointmentConflictError(
      'OVERLAPPING_APPOINTMENT',
      'Ja existe um agendamento nesse horario para este profissional.',
    );
  }
}

export interface CreateAppointmentInput {
  tenantId: string;
  professionalId: string;
  serviceId: string;
  clientId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}

/**
 * Executa a validacao e a criacao do agendamento atomicamente. Usar sempre
 * este helper (nunca `prisma.appointment.create` direto) para criar
 * agendamentos, garantindo que a regra de negocio critica seja aplicada.
 */
export async function createAppointmentInTransaction(
  prisma: PrismaClient,
  input: CreateAppointmentInput,
) {
  return prisma.$transaction(async (tx) => {
    await assertSlotIsAvailable(tx as unknown as BookingDataSource, {
      professionalId: input.professionalId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
    });

    return tx.appointment.create({
      data: {
        tenantId: input.tenantId,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        clientId: input.clientId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: 'PENDING',
      },
      include: { service: true, professional: true, client: true },
    });
  });
}

export interface RescheduleAppointmentInput {
  appointmentId: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}

/**
 * Move um agendamento existente para outro horario, revalidando a regra de
 * negocio critica (excluindo o proprio agendamento da checagem de
 * sobreposicao). Sempre usar isto em vez de `prisma.appointment.update`
 * direto para mudar startsAt/endsAt.
 *
 * Reseta os campos de lembrete: eles controlam a idempotencia do cron para o
 * horario ANTERIOR — sem resetar, o lembrete do novo horario nunca seria
 * disparado (os campos ja estariam "preenchidos").
 */
export async function rescheduleAppointmentInTransaction(
  prisma: PrismaClient,
  input: RescheduleAppointmentInput,
) {
  return prisma.$transaction(async (tx) => {
    await assertSlotIsAvailable(tx as unknown as BookingDataSource, {
      professionalId: input.professionalId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      excludeAppointmentId: input.appointmentId,
    });

    return tx.appointment.update({
      where: { id: input.appointmentId },
      data: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: 'PENDING',
        reminder24hSentAt: null,
        reminder1hSentAt: null,
      },
      include: { service: true, professional: true, client: true },
    });
  });
}
