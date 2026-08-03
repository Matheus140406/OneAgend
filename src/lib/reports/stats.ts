import type { AppointmentStatus } from '@prisma/client';
import { businessMonthKey } from '@/lib/booking/time';

/**
 * Agregacoes puras para a tela de Relatorios — recebe os agendamentos ja
 * carregados (uma unica query no Server Component) e faz as contas em
 * memoria, sem GROUP BY em SQL, para poder ser testado sem banco.
 */

// "Receita" conta CONFIRMED e DONE (o cliente vai/foi atendido); CANCELED e
// NO_SHOW nao geram receita, e PENDING ainda nao virou compromisso firme.
const REVENUE_STATUSES: AppointmentStatus[] = ['CONFIRMED', 'DONE'];

export interface ReportAppointmentInput {
  startsAt: Date;
  status: AppointmentStatus;
  clientId: string;
  service: { name: string; priceCents: number };
}

export interface ReportSummary {
  totalAppointments: number;
  revenueCents: number;
  avgTicketCents: number;
  /** % (0-1) de clientes com mais de 1 agendamento no periodo. */
  returnRate: number;
}

export interface MonthPoint {
  monthKey: string;
  label: string;
}

export interface ReportStats {
  summary: ReportSummary;
  appointmentsByMonth: (MonthPoint & { count: number })[];
  revenueByMonth: (MonthPoint & { revenueCents: number })[];
  appointmentsByService: { service: string; count: number }[];
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'short' });

function monthKeyLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const label = MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(year!, month! - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
}

export function computeReportStats(
  appointments: ReportAppointmentInput[],
  timezone: string,
  monthKeys: string[],
): ReportStats {
  const countByMonth = new Map<string, number>();
  const revenueByMonthMap = new Map<string, number>();
  const countByService = new Map<string, number>();
  const appointmentCountByClient = new Map<string, number>();

  let revenueCents = 0;

  for (const appointment of appointments) {
    const monthKey = businessMonthKey(appointment.startsAt, timezone);
    countByMonth.set(monthKey, (countByMonth.get(monthKey) ?? 0) + 1);

    countByService.set(appointment.service.name, (countByService.get(appointment.service.name) ?? 0) + 1);
    appointmentCountByClient.set(appointment.clientId, (appointmentCountByClient.get(appointment.clientId) ?? 0) + 1);

    if (REVENUE_STATUSES.includes(appointment.status)) {
      revenueCents += appointment.service.priceCents;
      revenueByMonthMap.set(monthKey, (revenueByMonthMap.get(monthKey) ?? 0) + appointment.service.priceCents);
    }
  }

  const revenueAppointmentCount = appointments.filter((a) => REVENUE_STATUSES.includes(a.status)).length;
  const returningClients = Array.from(appointmentCountByClient.values()).filter((count) => count > 1).length;
  const totalClients = appointmentCountByClient.size;

  return {
    summary: {
      totalAppointments: appointments.length,
      revenueCents,
      avgTicketCents: revenueAppointmentCount > 0 ? Math.round(revenueCents / revenueAppointmentCount) : 0,
      returnRate: totalClients > 0 ? returningClients / totalClients : 0,
    },
    appointmentsByMonth: monthKeys.map((monthKey) => ({
      monthKey,
      label: monthKeyLabel(monthKey),
      count: countByMonth.get(monthKey) ?? 0,
    })),
    revenueByMonth: monthKeys.map((monthKey) => ({
      monthKey,
      label: monthKeyLabel(monthKey),
      revenueCents: revenueByMonthMap.get(monthKey) ?? 0,
    })),
    appointmentsByService: Array.from(countByService.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}
