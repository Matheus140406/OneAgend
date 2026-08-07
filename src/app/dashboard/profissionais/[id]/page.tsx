import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatDurationMinutes, formatPriceFromCents } from '@/lib/utils';
import { addWorkingHour, addTimeOff, deleteWorkingHour, deleteTimeOff, setServiceForProfessional } from '../actions';

const WEEKDAY_FULL_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const dynamic = 'force-dynamic';

export default async function ProfessionalDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await requireCurrentUser();

  const professional = await prisma.professional.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      workingHours: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
      timeOffs: { orderBy: { startsAt: 'asc' } },
      services: { include: { service: true } },
    },
  });

  if (!professional) notFound();

  const allServices = await prisma.service.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: 'asc' } });
  const linkedServiceIds = new Set(professional.services.map((s) => s.serviceId));

  const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/profissionais"
          className="flex h-8 w-8 items-center justify-center rounded-full text-base-300 hover:bg-base-800"
        >
          <ChevronLeft size={18} />
        </Link>
        <h1 className="font-display text-2xl font-bold text-base-100">{professional.name}</h1>
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expediente semanal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {professional.workingHours.length === 0 && (
            <p className="text-sm text-base-500">Nenhum horário cadastrado. Sem expediente, ninguém consegue agendar.</p>
          )}
          <ul className="flex flex-col gap-2">
            {professional.workingHours.map((wh) => (
              <li
                key={wh.id}
                className="flex items-center justify-between rounded-lg border border-base-800 bg-base-900 px-3 py-2 text-sm"
              >
                <span className="text-base-200">
                  {WEEKDAY_FULL_LABELS[wh.weekday]} · {wh.startTime} às {wh.endTime}
                </span>
                <form action={deleteWorkingHour}>
                  <input type="hidden" name="workingHourId" value={wh.id} />
                  <input type="hidden" name="professionalId" value={professional.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>

          <form action={addWorkingHour} className="flex flex-wrap items-end gap-3 border-t border-base-800 pt-4">
            <input type="hidden" name="professionalId" value={professional.id} />
            <div>
              <Label htmlFor="weekday">Dia</Label>
              <Select id="weekday" name="weekday" defaultValue="1" className="w-36">
                {WEEKDAY_FULL_LABELS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="startTime">Início</Label>
              <Input id="startTime" name="startTime" type="time" required defaultValue="09:00" className="w-28" />
            </div>
            <div>
              <Label htmlFor="endTime">Fim</Label>
              <Input id="endTime" name="endTime" type="time" required defaultValue="18:00" className="w-28" />
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Folgas e bloqueios</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {professional.timeOffs.length === 0 && <p className="text-sm text-base-500">Nenhuma folga cadastrada.</p>}
          <ul className="flex flex-col gap-2">
            {professional.timeOffs.map((timeOff) => (
              <li
                key={timeOff.id}
                className="flex items-center justify-between rounded-lg border border-base-800 bg-base-900 px-3 py-2 text-sm"
              >
                <span className="text-base-200">
                  {dateTimeFormatter.format(timeOff.startsAt)} até {dateTimeFormatter.format(timeOff.endsAt)}
                  {timeOff.reason ? ` · ${timeOff.reason}` : ''}
                </span>
                <form action={deleteTimeOff}>
                  <input type="hidden" name="timeOffId" value={timeOff.id} />
                  <input type="hidden" name="professionalId" value={professional.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>

          <form action={addTimeOff} className="flex flex-wrap items-end gap-3 border-t border-base-800 pt-4">
            <input type="hidden" name="professionalId" value={professional.id} />
            <div>
              <Label htmlFor="startsAt">De</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div>
              <Label htmlFor="endsAt">Até</Label>
              <Input id="endsAt" name="endsAt" type="datetime-local" required />
            </div>
            <div className="flex-1">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input id="reason" name="reason" placeholder="Ex: férias" />
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Serviços que executa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {allServices.length === 0 && (
            <p className="text-sm text-base-500">Cadastre serviços primeiro em Serviços.</p>
          )}
          {allServices.map((service) => {
            const linked = linkedServiceIds.has(service.id);
            return (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-base-800 bg-base-900 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-base-100">{service.name}</p>
                  <p className="text-xs text-base-500">
                    {formatDurationMinutes(service.durationMinutes)} · {formatPriceFromCents(service.priceCents)}
                  </p>
                </div>
                <form action={setServiceForProfessional}>
                  <input type="hidden" name="professionalId" value={professional.id} />
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="enabled" value={(!linked).toString()} />
                  <Button type="submit" size="sm" variant={linked ? 'secondary' : 'outline'}>
                    {linked ? 'Remover' : 'Adicionar'}
                  </Button>
                </form>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
