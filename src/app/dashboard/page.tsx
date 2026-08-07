import Link from 'next/link';
import { Calendar, Users, TrendingUp, Activity, Lock, Plus, Globe } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { businessDateKey, addDaysToDateKey, zonedWallTimeToUtc, recentMonthKeys } from '@/lib/booking/time';
import { computeReportStats } from '@/lib/reports/stats';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/premium/stat-card';
import { AppointmentsByMonthChart } from '@/components/reports/report-charts';
import { AppointmentStatusSelect } from '@/components/dashboard/appointment-status-select';
import { formatPriceFromCents } from '@/lib/utils';
import { buildBookingLink } from '@/lib/whatsapp/niche-templates';
import { NICHE_META } from '@/lib/niche-labels';

export const dynamic = 'force-dynamic';

const HOME_CHART_MONTHS = 6;

export default async function DashboardHomePage() {
  const user = await requireCurrentUser();
  const timezone = user.tenant.timezone;
  const canViewFinancial = await checkPermission(prisma, user.id, 'canViewFinancial');

  const todayKey = businessDateKey(new Date(), timezone);
  const dayStart = zonedWallTimeToUtc(todayKey, '00:00', timezone);
  const dayEnd = zonedWallTimeToUtc(addDaysToDateKey(todayKey, 1), '00:00', timezone);

  const [appointments, activeClients, tenant] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId: user.tenantId,
        startsAt: { gte: dayStart, lt: dayEnd },
        ...(user.role === 'STAFF' ? { professionalId: user.professionalId ?? undefined } : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: { client: true, service: true, professional: true },
    }),
    prisma.client.count({ where: { tenantId: user.tenantId, appointments: { some: {} } } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId }, select: { slug: true } }),
  ]);

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  const revenueCents = appointments
    .filter((a) => a.status === 'CONFIRMED' || a.status === 'DONE')
    .reduce((sum, a) => sum + a.service.priceCents, 0);
  const revenueAppointmentCount = appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'DONE').length;
  const avgTicketCents = revenueAppointmentCount > 0 ? Math.round(revenueCents / revenueAppointmentCount) : 0;

  let monthlyChart = null;
  if (canViewFinancial) {
    const now = new Date();
    const monthKeys = recentMonthKeys(now, timezone, HOME_CHART_MONTHS);
    const rangeStart = new Date(now.getTime() - HOME_CHART_MONTHS * 31 * 24 * 60 * 60_000);
    const monthAppointments = await prisma.appointment.findMany({
      where: { tenantId: user.tenantId, startsAt: { gte: rangeStart, lte: now } },
      select: { startsAt: true, status: true, clientId: true, service: { select: { name: true, priceCents: true } } },
    });
    monthlyChart = computeReportStats(monthAppointments, timezone, monthKeys).appointmentsByMonth;
  }

  const niche = NICHE_META[user.tenant.niche];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">{niche.emoji}</span>
            <h1 className="font-display text-xl font-bold text-base-100">Painel</h1>
          </div>
          <p className="text-xs capitalize text-base-500">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-white/[0.06] bg-base-850 px-3 py-1.5 font-mono text-xs text-base-500 sm:flex">
            <Globe size={11} /> {buildBookingLink(tenant.slug).replace(/^https?:\/\//, '')}
          </span>
          <Link
            href="/dashboard/agenda"
            className="flex items-center gap-1.5 rounded-niche bg-accent px-3 py-1.5 text-xs font-bold text-accent-contrast"
          >
            <Plus size={13} /> Agendar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Agendamentos Hoje" value={String(appointments.length)} icon={<Calendar size={15} />} />
        <StatCard label="Clientes Ativos" value={String(activeClients)} icon={<Users size={15} />} />
        <StatCard label="Ticket Médio" value={formatPriceFromCents(avgTicketCents)} icon={<TrendingUp size={15} />} />
        {canViewFinancial ? (
          <StatCard label="Receita Estimada" value={formatPriceFromCents(revenueCents)} icon={<Activity size={15} />} />
        ) : (
          <StatCard label="Receita Estimada" value="—" icon={<Lock size={15} />} />
        )}
      </div>

      {!canViewFinancial && (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-base-500">
          <Lock size={12} /> Relatórios financeiros ocultos — sua função não tem acesso a dados de faturamento.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {monthlyChart && (
          <Card accentGlow className="lg:col-span-2">
            <CardContent>
              <h3 className="mb-4 text-sm font-bold text-base-100">Agendamentos por mês</h3>
              <AppointmentsByMonthChart data={monthlyChart} />
            </CardContent>
          </Card>
        )}

        <Card className={monthlyChart ? '' : 'lg:col-span-3'}>
          <CardContent>
            <h3 className="mb-3 text-sm font-bold text-base-100">Agenda de Hoje</h3>
            {appointments.length === 0 && <p className="py-6 text-center text-sm text-base-500">Nenhum agendamento para hoje.</p>}
            <ul className="divide-y divide-white/[0.06]">
              {appointments.map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-14 shrink-0 font-mono text-xs text-base-500">{timeFormatter.format(appointment.startsAt)}</span>
                  <div className="h-6 w-1 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-base-100">{appointment.client.name}</p>
                    <p className="truncate text-xs text-base-500">
                      {appointment.service.name} · {appointment.professional.name}
                    </p>
                  </div>
                  <AppointmentStatusSelect appointmentId={appointment.id} status={appointment.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
