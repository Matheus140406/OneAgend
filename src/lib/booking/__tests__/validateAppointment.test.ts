import { describe, it, expect, vi } from 'vitest';
import { assertSlotIsAvailable, AppointmentConflictError, type BookingDataSource } from '../validateAppointment';
import { getBusinessMoment, zonedWallTimeToUtc } from '../time';

const TZ = 'America/Sao_Paulo';
const DATE_KEY = '2026-08-03';
const PROFESSIONAL_ID = 'prof_1';

function slot(startTime: string, endTime: string) {
  return {
    startsAt: zonedWallTimeToUtc(DATE_KEY, startTime, TZ),
    endsAt: zonedWallTimeToUtc(DATE_KEY, endTime, TZ),
  };
}

const weekday = getBusinessMoment(zonedWallTimeToUtc(DATE_KEY, '10:00', TZ), TZ).weekday;

function createFakeDb(overrides: Partial<BookingDataSource> = {}): BookingDataSource {
  return {
    workingHour: {
      findMany: vi.fn().mockResolvedValue([{ startTime: '09:00', endTime: '18:00' }]),
    },
    timeOff: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    appointment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

describe('assertSlotIsAvailable — regra de negocio critica de conflito de horario', () => {
  it('permite um horario dentro do expediente, sem folga e sem conflito', async () => {
    const db = createFakeDb();
    const { startsAt, endsAt } = slot('10:00', '10:30');

    await expect(
      assertSlotIsAvailable(db, { professionalId: PROFESSIONAL_ID, startsAt, endsAt, timezone: TZ }),
    ).resolves.toBeUndefined();

    expect(db.workingHour.findMany).toHaveBeenCalledWith({
      where: { professionalId: PROFESSIONAL_ID, weekday },
    });
  });

  it('caso 1: rejeita horario fora do expediente do profissional', async () => {
    const db = createFakeDb();
    const { startsAt, endsAt } = slot('19:00', '19:30'); // expediente termina as 18:00

    await expect(
      assertSlotIsAvailable(db, { professionalId: PROFESSIONAL_ID, startsAt, endsAt, timezone: TZ }),
    ).rejects.toMatchObject({ code: 'OUTSIDE_WORKING_HOURS' });
  });

  it('caso 2: rejeita horario dentro de uma folga (TimeOff) do profissional', async () => {
    const db = createFakeDb({
      timeOff: { findMany: vi.fn().mockResolvedValue([{ id: 'timeoff_1' }]) },
    });
    const { startsAt, endsAt } = slot('10:00', '10:30');

    await expect(
      assertSlotIsAvailable(db, { professionalId: PROFESSIONAL_ID, startsAt, endsAt, timezone: TZ }),
    ).rejects.toMatchObject({ code: 'TIME_OFF' });
  });

  it('caso 3: rejeita horario que sobrepoe outro agendamento ativo do mesmo profissional', async () => {
    const db = createFakeDb({
      appointment: { findMany: vi.fn().mockResolvedValue([{ id: 'appt_1' }]) },
    });
    const { startsAt, endsAt } = slot('10:00', '10:30');

    await expect(
      assertSlotIsAvailable(db, { professionalId: PROFESSIONAL_ID, startsAt, endsAt, timezone: TZ }),
    ).rejects.toMatchObject({ code: 'OVERLAPPING_APPOINTMENT' });
  });

  it('rejeita quando o horario de termino nao e depois do inicio', async () => {
    const db = createFakeDb();
    const { startsAt } = slot('10:00', '10:30');

    await expect(
      assertSlotIsAvailable(db, {
        professionalId: PROFESSIONAL_ID,
        startsAt,
        endsAt: startsAt,
        timezone: TZ,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RANGE' });
  });

  it('rejeita agendamento que atravessa a virada do dia', async () => {
    const db = createFakeDb({
      workingHour: { findMany: vi.fn().mockResolvedValue([{ startTime: '00:00', endTime: '23:59' }]) },
    });
    const startsAt = zonedWallTimeToUtc(DATE_KEY, '23:30', TZ);
    const endsAt = zonedWallTimeToUtc('2026-08-04', '00:30', TZ);

    await expect(
      assertSlotIsAvailable(db, { professionalId: PROFESSIONAL_ID, startsAt, endsAt, timezone: TZ }),
    ).rejects.toMatchObject({ code: 'OUTSIDE_WORKING_HOURS' });
  });

  it('todo erro de conflito e uma instancia de AppointmentConflictError', async () => {
    const db = createFakeDb({ timeOff: { findMany: vi.fn().mockResolvedValue([{ id: 'x' }]) } });
    const { startsAt, endsAt } = slot('10:00', '10:30');

    await expect(
      assertSlotIsAvailable(db, { professionalId: PROFESSIONAL_ID, startsAt, endsAt, timezone: TZ }),
    ).rejects.toBeInstanceOf(AppointmentConflictError);
  });
});
