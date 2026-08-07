import { Calendar, TrendingUp, Activity, Users, Info, Lock } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { recentMonthKeys } from '@/lib/booking/time';
import { computeReportStats } from '@/lib/reports/stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/premium/stat-card';
import { formatPriceFromCents } from '@/lib/utils';
import { AppointmentsByMonthChart, RevenueByMonthChart, AppointmentsByServiceChart } from '@/components/reports/report-charts';

export const dynamic = 'force-dynamic';

const MONTHS_WINDOW = 6;

export default async function ReportsPage() {
  const user = await requireCurrentUser();
  const canView = await checkPermission(prisma, user.id, 'canViewFinancial');

  if (!canView) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
        <Lock size={28} className="mb-4 text-base-600" />
        <h2 className="mb-1 text-base font-bold text-base-100">Acesso Restrito</h2>
        <p className="text-sm text-base-500">Você não tem permissão para ver relatórios financeiros.</p>
      </div>
    );
  }

  const timezone = user.tenant.timezone;
  const now = new Date();
  const monthKeys = recentMonthKeys(now, timezone, MONTHS_WINDOW);

  const rangeStart = new Date(now.getTime() - MONTHS_WINDOW * 31 * 24 * 60 * 60_000);

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: user.tenantId, startsAt: { gte: rangeStart, lte: now } },
    select: { startsAt: true, status: true, clientId: true, service: { select: { name: true, priceCents: true } } },
  });

  const stats = computeReportStats(appointments, timezone, monthKeys);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-base-100">Relatórios</h1>
        <p className="mt-0.5 text-xs text-base-500">Agendamentos e faturamento — últimos {MONTHS_WINDOW} meses</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total de Agendamentos" value={String(stats.summary.totalAppointments)} icon={<Calendar size={15} />} />
        <StatCard label="Receita Estimada" value={formatPriceFromCents(stats.summary.revenueCents)} icon={<TrendingUp size={15} />} />
        <StatCard label="Ticket Médio" value={formatPriceFromCents(stats.summary.avgTicketCents)} icon={<Activity size={15} />} />
        <StatCard label="Taxa de Retorno" value={`${Math.round(stats.summary.returnRate * 100)}%`} icon={<Users size={15} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card accentGlow>
          <CardHeader>
            <CardTitle className="text-sm">Agendamentos por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentsByMonthChart data={stats.appointmentsByMonth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Receita estimada (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueByMonthChart data={stats.revenueByMonth} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Agendamentos por serviço</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.appointmentsByService.length === 0 ? (
            <p className="text-sm text-base-500">Sem agendamentos no período.</p>
          ) : (
            <AppointmentsByServiceChart data={stats.appointmentsByService} />
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <Info size={13} className="mt-0.5 shrink-0 text-base-500" />
        <p className="text-[11px] text-base-500">
          Receita estimada calculada com base nos agendamentos confirmados e concluídos × preço de cada serviço.
        </p>
      </div>
    </div>
  );
}
