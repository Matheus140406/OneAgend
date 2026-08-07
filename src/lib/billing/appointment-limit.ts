import type { AppointmentStatus, Plan, PrismaClient } from '@prisma/client';
import { getMonthRange } from '@/lib/booking/time';
import { PLAN_DETAILS } from '@/lib/plans';

// CANCELED nao conta contra o limite (nao gera custo de lembrete real);
// os demais status ocupam vaga/ja podem ter disparado lembrete.
const COUNTED_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'DONE', 'NO_SHOW'];

export interface AppointmentLimitCheck {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
}

/** Regra pura: dado quantos agendamentos ja existem no mes e o plano, diz se cabe mais um. */
export function evaluateAppointmentLimit(usedThisMonth: number, plan: Plan): AppointmentLimitCheck {
  const limit = PLAN_DETAILS[plan].maxAppointmentsPerMonth;

  if (limit === null) {
    return { allowed: true, used: usedThisMonth, limit: null, remaining: null };
  }

  return {
    allowed: usedThisMonth < limit,
    used: usedThisMonth,
    limit,
    remaining: Math.max(0, limit - usedThisMonth),
  };
}

/** Conta agendamentos do tenant cujo `startsAt` cai no mes (fuso do negocio) de `referenceDate`. */
export async function countAppointmentsInMonth(
  prisma: PrismaClient,
  tenantId: string,
  timezone: string,
  referenceDate: Date,
): Promise<number> {
  const { start, end } = getMonthRange(referenceDate, timezone);

  return prisma.appointment.count({
    where: {
      tenantId,
      status: { in: COUNTED_STATUSES },
      startsAt: { gte: start, lt: end },
    },
  });
}
