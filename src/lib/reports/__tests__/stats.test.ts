import { describe, it, expect } from 'vitest';
import { computeReportStats, type ReportAppointmentInput } from '../stats';
import { recentMonthKeys } from '@/lib/booking/time';

const TZ = 'America/Sao_Paulo';

function appt(overrides: Partial<ReportAppointmentInput> = {}): ReportAppointmentInput {
  return {
    startsAt: new Date('2026-08-10T13:00:00Z'),
    status: 'CONFIRMED',
    clientId: 'client_1',
    service: { name: 'Corte', priceCents: 5000 },
    ...overrides,
  };
}

describe('computeReportStats', () => {
  const monthKeys = recentMonthKeys(new Date('2026-08-15T12:00:00Z'), TZ, 3); // jun, jul, ago/2026

  it('soma receita so de CONFIRMED/DONE, ignorando CANCELED/NO_SHOW/PENDING', () => {
    const appointments = [
      appt({ status: 'CONFIRMED' }),
      appt({ status: 'DONE' }),
      appt({ status: 'CANCELED' }),
      appt({ status: 'NO_SHOW' }),
      appt({ status: 'PENDING' }),
    ];

    const stats = computeReportStats(appointments, TZ, monthKeys);

    expect(stats.summary.totalAppointments).toBe(5);
    expect(stats.summary.revenueCents).toBe(10_000); // 2 x 5000
    expect(stats.summary.avgTicketCents).toBe(5000);
  });

  it('calcula returnRate como fracao de clientes com mais de 1 agendamento', () => {
    const appointments = [
      appt({ clientId: 'a' }),
      appt({ clientId: 'a' }),
      appt({ clientId: 'b' }),
    ];

    const stats = computeReportStats(appointments, TZ, monthKeys);
    expect(stats.summary.returnRate).toBeCloseTo(1 / 2); // "a" repete, "b" nao, de 2 clientes distintos
  });

  it('agrupa contagem e receita por mes usando os monthKeys informados', () => {
    const appointments = [
      appt({ startsAt: new Date('2026-08-05T13:00:00Z'), status: 'DONE' }),
      appt({ startsAt: new Date('2026-07-05T13:00:00Z'), status: 'DONE' }),
    ];

    const stats = computeReportStats(appointments, TZ, monthKeys);

    const august = stats.appointmentsByMonth.find((m) => m.monthKey === '2026-08');
    const july = stats.appointmentsByMonth.find((m) => m.monthKey === '2026-07');
    const june = stats.appointmentsByMonth.find((m) => m.monthKey === '2026-06');

    expect(august?.count).toBe(1);
    expect(july?.count).toBe(1);
    expect(june?.count).toBe(0);
  });

  it('agrupa por servico e ordena do mais para o menos agendado', () => {
    const appointments = [
      appt({ service: { name: 'Corte', priceCents: 5000 } }),
      appt({ service: { name: 'Corte', priceCents: 5000 } }),
      appt({ service: { name: 'Barba', priceCents: 3000 } }),
    ];

    const stats = computeReportStats(appointments, TZ, monthKeys);
    expect(stats.appointmentsByService[0]).toEqual({ service: 'Corte', count: 2 });
    expect(stats.appointmentsByService[1]).toEqual({ service: 'Barba', count: 1 });
  });

  it('retorna zeros com lista vazia de agendamentos', () => {
    const stats = computeReportStats([], TZ, monthKeys);
    expect(stats.summary).toEqual({ totalAppointments: 0, revenueCents: 0, avgTicketCents: 0, returnRate: 0 });
  });
});

describe('recentMonthKeys', () => {
  it('retorna N meses terminando no mes de referencia, em ordem crescente', () => {
    const keys = recentMonthKeys(new Date('2026-08-15T12:00:00Z'), TZ, 3);
    expect(keys).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('cruza a virada de ano corretamente', () => {
    const keys = recentMonthKeys(new Date('2026-01-15T12:00:00Z'), TZ, 3);
    expect(keys).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});
