import { requireCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { recentMonthKeys } from '@/lib/booking/time';
import { computeReportStats } from '@/lib/reports/stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPriceFromCents } from '@/lib/utils';
import { AppointmentsByMonthChart, RevenueByMonthChart, AppointmentsByServiceChart } from '@/components/reports/report-charts';

export const dynamic = 'force-dynamic';

const MONTHS_WINDOW = 6;

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs uppercase tracking-wide text-base-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold text-base-100">{value}</p>
        {hint && <p className="mt-1 text-xs text-base-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage() {
  const user = await requireCurrentUser();
  const canView = await checkPermission(prisma, user.id, 'canViewFinancial');

  if (!canView) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold text-base-100">Relatórios</h1>
        <Card>
          <CardContent className="text-sm text-base-400">
            Você não tem permissão para ver os relatórios financeiros. Fale com o dono da conta.
          </CardContent>
        </Card>
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-base-100">Relatórios</h1>
        <p className="text-sm text-base-400">Últimos {MONTHS_WINDOW} meses.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Agendamentos" value={String(stats.summary.totalAppointments)} />
        <StatCard label="Receita estimada" value={formatPriceFromCents(stats.summary.revenueCents)} hint="Confirmados + concluídos" />
        <StatCard label="Ticket médio" value={formatPriceFromCents(stats.summary.avgTicketCents)} />
        <StatCard label="Taxa de retorno" value={`${Math.round(stats.summary.returnRate * 100)}%`} hint="Clientes com +1 agendamento" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentsByMonthChart data={stats.appointmentsByMonth} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receita estimada por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueByMonthChart data={stats.revenueByMonth} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por serviço</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.appointmentsByService.length === 0 ? (
            <p className="text-sm text-base-500">Sem agendamentos no período.</p>
          ) : (
            <AppointmentsByServiceChart data={stats.appointmentsByService} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
