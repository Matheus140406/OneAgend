import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { businessDateKey, addDaysToDateKey, zonedWallTimeToUtc, getBusinessMoment } from '@/lib/booking/time';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  DONE: 'Concluído',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Faltou',
};

const STATUS_VARIANTS: Record<string, 'accent' | 'warn' | 'danger' | 'neutral'> = {
  PENDING: 'warn',
  CONFIRMED: 'accent',
  DONE: 'neutral',
  CANCELED: 'danger',
  NO_SHOW: 'danger',
};

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? 'neutral'}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { view?: string; week?: string; date?: string; professionalId?: string };
}) {
  const user = await requireCurrentUser();
  const timezone = user.tenant.timezone;
  const view = searchParams.view === 'day' ? 'day' : 'week';
  const professionalFilter =
    user.role === 'STAFF' ? user.professionalId ?? undefined : searchParams.professionalId;

  const professionals =
    user.role === 'OWNER'
      ? await prisma.professional.findMany({ where: { tenantId: user.tenantId, active: true }, orderBy: { name: 'asc' } })
      : [];

  function toggleLink(nextView: 'day' | 'week') {
    const params = new URLSearchParams();
    params.set('view', nextView);
    if (professionalFilter) params.set('professionalId', professionalFilter);
    return `/dashboard/agenda?${params.toString()}`;
  }

  function professionalLink(id?: string) {
    const params = new URLSearchParams();
    params.set('view', view);
    if (view === 'day') params.set('date', searchParams.date ?? businessDateKey(new Date(), timezone));
    else params.set('week', searchParams.week ?? '0');
    if (id) params.set('professionalId', id);
    return `/dashboard/agenda?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-base-100">Agenda</h1>
        <div className="flex gap-1 rounded-full border border-base-800 p-1">
          <Link
            href={toggleLink('day')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              view === 'day' ? 'bg-accent/15 text-accent' : 'text-base-400',
            )}
          >
            Dia
          </Link>
          <Link
            href={toggleLink('week')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              view === 'week' ? 'bg-accent/15 text-accent' : 'text-base-400',
            )}
          >
            Semana
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

      {view === 'day' ? (
        <DayView searchParams={searchParams} tenantId={user.tenantId} timezone={timezone} professionalFilter={professionalFilter} />
      ) : (
        <WeekView searchParams={searchParams} tenantId={user.tenantId} timezone={timezone} professionalFilter={professionalFilter} />
      )}
    </div>
  );
}

async function DayView({
  searchParams,
  tenantId,
  timezone,
  professionalFilter,
}: {
  searchParams: { date?: string; professionalId?: string };
  tenantId: string;
  timezone: string;
  professionalFilter?: string;
}) {
  const todayKey = businessDateKey(new Date(), timezone);
  const dateKey = searchParams.date ?? todayKey;

  const dayStart = zonedWallTimeToUtc(dateKey, '00:00', timezone);
  const dayEnd = zonedWallTimeToUtc(addDaysToDateKey(dateKey, 1), '00:00', timezone);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      startsAt: { gte: dayStart, lt: dayEnd },
      ...(professionalFilter ? { professionalId: professionalFilter } : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: { client: true, service: true, professional: true },
  });

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, weekday: 'long', day: '2-digit', month: 'long' }).format(
    zonedWallTimeToUtc(dateKey, '12:00', timezone),
  );

  function dayLink(nextDateKey: string) {
    const params = new URLSearchParams({ view: 'day', date: nextDateKey });
    if (professionalFilter) params.set('professionalId', professionalFilter);
    return `/dashboard/agenda?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold capitalize text-base-100">{dateLabel}</p>
        <div className="flex items-center gap-1">
          <Link href={dayLink(addDaysToDateKey(dateKey, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-800 text-base-300 hover:bg-base-800">
            <ChevronLeft size={16} />
          </Link>
          <Link href={dayLink(addDaysToDateKey(dateKey, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-800 text-base-300 hover:bg-base-800">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <Card>
        {appointments.length === 0 ? (
          <p className="p-6 text-center text-sm text-base-500">Sem agendamentos neste dia.</p>
        ) : (
          <ul className="divide-y divide-base-800">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-sm text-base-300">{timeFormatter.format(appointment.startsAt)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-base-100">{appointment.client.name}</p>
                    <p className="truncate text-xs text-base-500">
                      {appointment.service.name} · {appointment.professional.name}
                    </p>
                  </div>
                </div>
                <StatusBadge status={appointment.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function WeekView({
  searchParams,
  tenantId,
  timezone,
  professionalFilter,
}: {
  searchParams: { week?: string; professionalId?: string };
  tenantId: string;
  timezone: string;
  professionalFilter?: string;
}) {
  const weekOffset = Number(searchParams.week ?? 0) || 0;
  const todayKey = businessDateKey(new Date(), timezone);
  const todayWeekday = getBusinessMoment(zonedWallTimeToUtc(todayKey, '12:00', timezone), timezone).weekday;
  const daysSinceMonday = (todayWeekday + 6) % 7;
  const mondayKey = addDaysToDateKey(todayKey, -daysSinceMonday + weekOffset * 7);
  const weekDateKeys = Array.from({ length: 7 }, (_, i) => addDaysToDateKey(mondayKey, i));

  const rangeStart = zonedWallTimeToUtc(mondayKey, '00:00', timezone);
  const rangeEnd = zonedWallTimeToUtc(addDaysToDateKey(mondayKey, 7), '00:00', timezone);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      startsAt: { gte: rangeStart, lt: rangeEnd },
      ...(professionalFilter ? { professionalId: professionalFilter } : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: { client: true, service: true, professional: true },
  });

  const appointmentsByDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = businessDateKey(appointment.startsAt, timezone);
    appointmentsByDay.set(key, [...(appointmentsByDay.get(key) ?? []), appointment]);
  }

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });

  function weekLink(nextOffset: number) {
    const params = new URLSearchParams({ view: 'week', week: String(nextOffset) });
    if (professionalFilter) params.set('professionalId', professionalFilter);
    return `/dashboard/agenda?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-1">
        <Link href={weekLink(weekOffset - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-800 text-base-300 hover:bg-base-800">
          <ChevronLeft size={16} />
        </Link>
        <Link href={weekLink(weekOffset + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-base-800 text-base-300 hover:bg-base-800">
          <ChevronRight size={16} />
        </Link>
      </div>

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
                  <div key={appointment.id} className="flex flex-col gap-1 rounded-lg bg-base-800/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-base-100">{timeFormatter.format(appointment.startsAt)}</p>
                      <StatusBadge status={appointment.status} />
                    </div>
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
