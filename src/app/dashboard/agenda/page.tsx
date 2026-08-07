import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { businessDateKey, addDaysToDateKey, zonedWallTimeToUtc, getBusinessMoment } from '@/lib/booking/time';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_META: Record<string, { label: string; textClass: string; bgClass: string }> = {
  PENDING: { label: 'Pendente', textClass: 'text-[#C49A2E]', bgClass: 'bg-[#C49A2E]/20' },
  CONFIRMED: { label: 'Confirmado', textClass: 'text-[#2DA876]', bgClass: 'bg-[#2DA876]/20' },
  DONE: { label: 'Concluído', textClass: 'text-base-500', bgClass: 'bg-white/10' },
  CANCELED: { label: 'Cancelado', textClass: 'text-danger', bgClass: 'bg-danger/20' },
  NO_SHOW: { label: 'Faltou', textClass: 'text-danger', bgClass: 'bg-danger/20' },
};

function StatusChip({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING!;
  return <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', meta.textClass, meta.bgClass)}>{meta.label}</span>;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { view?: string; week?: string; date?: string; professionalId?: string };
}) {
  const user = await requireCurrentUser();
  const timezone = user.tenant.timezone;
  const view = searchParams.view === 'week' ? 'week' : 'day';
  const canManageAll = await checkPermission(prisma, user.id, 'canManageScheduleAll');
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-base-100">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-base-850 p-1">
            <Link
              href={toggleLink('day')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-all', view === 'day' ? 'bg-accent text-accent-contrast' : 'text-base-500')}
            >
              Dia
            </Link>
            <Link
              href={toggleLink('week')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-all', view === 'week' ? 'bg-accent text-accent-contrast' : 'text-base-500')}
            >
              Semana
            </Link>
          </div>
          {canManageAll && (
            <button className="flex items-center gap-1.5 rounded-niche bg-accent px-3 py-2 text-xs font-bold text-accent-contrast">
              <Plus size={13} /> Agendar
            </button>
          )}
        </div>
      </div>

      {professionals.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <Link
            href={professionalLink()}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium',
              !professionalFilter ? 'border-accent bg-accent/10 text-accent' : 'border-white/[0.06] text-base-400',
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
                professionalFilter === professional.id ? 'border-accent bg-accent/10 text-accent' : 'border-white/[0.06] text-base-400',
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

  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold capitalize text-base-100">{dateLabel}</p>
          <p className="text-xs text-base-500">
            {confirmedCount} confirmado{confirmedCount === 1 ? '' : 's'} · {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={dayLink(addDaysToDateKey(dateKey, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-base-400 hover:bg-white/5">
            <ChevronLeft size={16} />
          </Link>
          <Link href={dayLink(addDaysToDateKey(dateKey, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-base-400 hover:bg-white/5">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <Card>
        {appointments.length === 0 ? (
          <p className="p-6 text-center text-sm text-base-500">Sem agendamentos neste dia.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                <span className="w-12 shrink-0 text-right font-mono text-xs text-base-500">{timeFormatter.format(appointment.startsAt)}</span>
                <div className="h-10 w-px shrink-0 bg-white/[0.06]" />
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.08] px-4 py-2.5">
                  <div className="h-8 w-1 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-base-100">{appointment.client.name}</p>
                    <p className="truncate text-xs text-base-500">
                      {appointment.service.name}
                      {!professionalFilter ? ` · ${appointment.professional.name}` : ''}
                    </p>
                  </div>
                  <StatusChip status={appointment.status} />
                </div>
              </div>
            ))}
          </div>
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
        <Link href={weekLink(weekOffset - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-base-400 hover:bg-white/5">
          <ChevronLeft size={16} />
        </Link>
        <Link href={weekLink(weekOffset + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-base-400 hover:bg-white/5">
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-7">
        {weekDateKeys.map((dateKey, index) => {
          const dayAppointments = appointmentsByDay.get(dateKey) ?? [];
          const isToday = dateKey === todayKey;
          return (
            <Card key={dateKey} className={cn('flex flex-col', isToday && 'border-accent/60')}>
              <div className="border-b border-white/[0.06] p-3">
                <p className="text-xs uppercase text-base-500">{WEEKDAY_LABELS[index === 6 ? 0 : index + 1]}</p>
                <p className={cn('font-display text-sm font-semibold', isToday ? 'text-accent' : 'text-base-100')}>
                  {dateKey.split('-').slice(1).reverse().join('/')}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                {dayAppointments.length === 0 && <p className="text-xs text-base-600">Sem agendamentos</p>}
                {dayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col gap-1 rounded-lg border-l-2 border-accent bg-accent/[0.12] px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-base-100">{timeFormatter.format(appointment.startsAt)}</p>
                      <StatusChip status={appointment.status} />
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
