import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { businessDateKey, addDaysToDateKey, zonedWallTimeToUtc } from '@/lib/booking/time';
import { Card, CardContent } from '@/components/ui/card';
import { AppointmentStatusSelect } from '@/components/dashboard/appointment-status-select';
import { formatPriceFromCents } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardHomePage() {
  const user = await requireCurrentUser();
  const timezone = user.tenant.timezone;

  const todayKey = businessDateKey(new Date(), timezone);
  const dayStart = zonedWallTimeToUtc(todayKey, '00:00', timezone);
  const dayEnd = zonedWallTimeToUtc(addDaysToDateKey(todayKey, 1), '00:00', timezone);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: user.tenantId,
      startsAt: { gte: dayStart, lt: dayEnd },
      ...(user.role === 'PROFESSIONAL' ? { professionalId: user.professionalId ?? undefined } : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: { client: true, service: true, professional: true },
  });

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const revenueCents = appointments
    .filter((a) => a.status === 'CONFIRMED' || a.status === 'DONE')
    .reduce((sum, a) => sum + a.service.priceCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-base-100">Hoje</h1>
        <p className="text-sm text-base-400 capitalize">{dateLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Agendamentos" value={String(appointments.length)} />
        <StatCard label="Confirmados" value={String(confirmedCount)} accent />
        <StatCard label="Pendentes" value={String(pendingCount)} />
        <StatCard label="Receita prevista" value={formatPriceFromCents(revenueCents)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {appointments.length === 0 && (
            <p className="p-6 text-center text-sm text-base-500">Nenhum agendamento para hoje.</p>
          )}
          <ul className="divide-y divide-base-800">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center gap-4 p-4">
                <div className="w-14 shrink-0 font-display text-sm font-semibold text-base-100">
                  {timeFormatter.format(appointment.startsAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-base-100">{appointment.client.name}</p>
                  <p className="truncate text-sm text-base-400">
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
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-base-500">{label}</p>
        <p className={`mt-1 font-display text-xl font-bold ${accent ? 'text-accent' : 'text-base-100'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
