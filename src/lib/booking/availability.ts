import { AppointmentStatus, type PrismaClient } from '@prisma/client';
import { addDaysToDateKey, getBusinessMoment, parseTime, zonedWallTimeToUtc } from './time';

const SLOT_STEP_MINUTES = 15;
// Antecedencia minima para agendar "agora" (evita mostrar um horario que ja
// passou ou que esta prestes a comecar a ponto de o profissional nao se preparar).
const MIN_LEAD_MINUTES = 15;

export interface WorkingHourWindow {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface BusyRange {
  startsAt: Date;
  endsAt: Date;
}

export interface ComputeAvailableSlotsParams {
  dateKey: string; // "YYYY-MM-DD" no calendario do negocio
  timezone: string;
  durationMinutes: number;
  workingHours: WorkingHourWindow[];
  busyRanges: BusyRange[];
  now?: Date;
}

/** Gera os horarios de inicio possiveis (em UTC) dentro do expediente, descontando folgas e agendamentos existentes. */
export function computeAvailableSlots(params: ComputeAvailableSlotsParams): Date[] {
  const { dateKey, timezone, durationMinutes, workingHours, busyRanges, now = new Date() } = params;
  const earliestAllowed = new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000);

  const slots: Date[] = [];

  for (const window of workingHours) {
    for (
      let candidate = window.startTime;
      addMinutesToTime(candidate, durationMinutes) <= window.endTime;
      candidate = addMinutesToTime(candidate, SLOT_STEP_MINUTES)
    ) {
      const startsAt = zonedWallTimeToUtc(dateKey, candidate, timezone);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

      if (startsAt < earliestAllowed) continue;

      const isBusy = busyRanges.some((busy) => busy.startsAt < endsAt && busy.endsAt > startsAt);
      if (isBusy) continue;

      slots.push(startsAt);
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = parseTime(time);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const BLOCKING_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

/** Busca no banco tudo que e necessario e calcula os horarios livres de UM profissional em um dia. */
export async function getAvailableSlotsForProfessional(
  prisma: PrismaClient,
  params: { professionalId: string; dateKey: string; timezone: string; durationMinutes: number; now?: Date },
): Promise<Date[]> {
  const { professionalId, dateKey, timezone, durationMinutes, now } = params;
  const weekday = getBusinessMoment(zonedWallTimeToUtc(dateKey, '12:00', timezone), timezone).weekday;
  const dayStart = zonedWallTimeToUtc(dateKey, '00:00', timezone);
  const dayEnd = zonedWallTimeToUtc(addDaysToDateKey(dateKey, 1), '00:00', timezone);

  const [workingHours, timeOffs, appointments] = await Promise.all([
    prisma.workingHour.findMany({
      where: { professionalId, weekday },
      select: { startTime: true, endTime: true },
    }),
    prisma.timeOff.findMany({
      where: { professionalId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return computeAvailableSlots({
    dateKey,
    timezone,
    durationMinutes,
    workingHours,
    busyRanges: [...timeOffs, ...appointments],
    now,
  });
}

/**
 * Horarios livres para um servico. Se `professionalId` for null (o cliente
 * escolheu "qualquer disponivel"), retorna a uniao dos horarios livres entre
 * todos os profissionais ativos vinculados ao servico.
 */
export async function getAvailableSlotsForService(
  prisma: PrismaClient,
  params: { tenantId: string; serviceId: string; professionalId: string | null; dateKey: string; now?: Date },
): Promise<Date[]> {
  const { tenantId, serviceId, professionalId, dateKey, now } = params;

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } });
  const service = await prisma.service.findFirstOrThrow({
    where: { id: serviceId, tenantId },
    select: { durationMinutes: true },
  });

  const professionalIds = professionalId
    ? [professionalId]
    : (
        await prisma.professional.findMany({
          where: { tenantId, active: true, services: { some: { serviceId } } },
          select: { id: true },
        })
      ).map((p) => p.id);

  const perProfessionalSlots = await Promise.all(
    professionalIds.map((id) =>
      getAvailableSlotsForProfessional(prisma, {
        professionalId: id,
        dateKey,
        timezone: tenant.timezone,
        durationMinutes: service.durationMinutes,
        now,
      }),
    ),
  );

  const merged = new Map<number, Date>();
  for (const slots of perProfessionalSlots) {
    for (const slot of slots) merged.set(slot.getTime(), slot);
  }

  return Array.from(merged.values()).sort((a, b) => a.getTime() - b.getTime());
}
