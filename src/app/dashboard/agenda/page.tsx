import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { businessDateKey, addDaysToDateKey, zonedWallTimeToUtc, getBusinessMoment } from '@/lib/booking/time';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default async function WeeklyAgendaPage({
  searchParams,
}: {
  searchParams: { week?: string; professionalId?: string };
}) {
  const user = await requireCurrentUser();
  const timezone = user.tenant.timezone;
  const weekOffset = Number(searchParams.week ?? 0) || 0;
  const professionalFilter =
    user.role === 'PROFESSIONAL' ? user.professionalId ?? undefined : searchParams.professionalId;

  const todayKey = businessDateKey(new Date(), timezone);
  const todayWeekday = getBusinessMoment(zonedWallTimeToUtc(todayKey, '12:00', timezone), timezone).weekday;
  const daysSinceMonday = (todayWeekday + 6) % 7;
  const mondayKey = addDaysToDateKey(todayKey, -daysSinceMonday + weekOffset * 7);
  const weekDateKeys = Array.from({ length: 7 }, (_, i) => addDaysToDateKey(mondayKey, i));

  const rangeStart = zonedWallTimeToUtc(mondayKey, '00:00', timezone);
  const rangeEnd = zonedWallTimeToUtc(addDaysToDateKey(mondayKey, 7), '00:00', timezone);

  const [appointments, professionals] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId: user.tenantId,
        startsAt: { gte: rangeStart, lt: rangeEnd },
        ...(professionalFilter ? { professionalId: professionalFilter } : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: { client: true, service: true, professional: true },
    }),
    user.role === 'OWNER'
      ? prisma.professional.findMany({ where: { tenantId: user.tenantId, active: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
  ]);

  const appointmentsByDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = businessDateKey(appointment.startsAt, timezone);
    appointmentsByDay.set(key, [...(appointmentsByDay.get(key) ?? []), appointment]);
  }

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });

  function weekLink(nextOffset: number) {
    const params = new URLSearchParams();
    params.set('week', String(nextOffset));
    if (professionalFilter) params.set('professionalId', professionalFilter);
    return `/dashboard/agenda?${params.toString()}`;
  }

  function professionalLink(id?: string) {
    const params = new URLSearchParams();
    params.set('week', String(weekOffset));
    if (id) params.set('professionalId', id);
    return `/dashboard/agenda?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-base-100">Agenda semanal</h1>
        <div className="flex items-center gap-1">
          <Link
            href={weekLink(weekOffset - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-800 text-base-300 hover:bg-base-800"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={weekLink(weekOffset + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-800 text-base-300 hover:bg-base-800"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {professionals.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Link
            href={professionalLink()}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
              !professionalFilter ? 'border-accent bg-accent/10 text-accent' : 'border-base-800 text-base-300',
            )}
          >
            Todos
          </Link>
          {professionals.map((professional) => (
            <Link
              key={professional.id}
              href={professionalLink(professional.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
                professionalFilter === professional.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-base-800 text-base-300',
              )}
            >
              {professional.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-7">
        {weekDateKeys.map((dateKey, index) => {
          const dayAppointments = appointmentsByDay.get(dateKey) ?? [];
          const isToday = dateKey === todayKey;
          return (
            <Card key={dateKey} className={cn('flex flex-col', isToday && 'border-accent/60')}>
              <div className="border-b border-base-800 p-3">
                <p className="text-xs uppercase text-base-500">{WEEKDAY_LABELS[index === 6 ? 0 : index + 1]}</p>
                <p className={cn('font-display text-sm font-semibold', isToday ? 'text-accent' : 'text-base-100')}>
                  {dateKey.split('-').slice(1).reverse().join('/')}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                {dayAppointments.length === 0 && <p className="text-xs text-base-600">Sem agendamentos</p>}
                {dayAppointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg bg-base-800/60 p-2">
                    <p className="text-xs font-semibold text-base-100">{timeFormatter.format(appointment.startsAt)}</p>
                    <p className="truncate text-xs text-base-300">{appointment.client.name}</p>
                    <p className="truncate text-[11px] text-base-500">
                      {appointment.service.name}
                      {!professionalFilter ? ` · ${appointment.professional.name}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
