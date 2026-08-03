import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await requireCurrentUser();
  const query = searchParams.q?.trim() ?? '';
  const now = new Date();

  const clients = await prisma.client.findMany({
    where: {
      tenantId: user.tenantId,
      ...(query
        ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { whatsapp: { contains: query } }] }
        : {}),
    },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { appointments: true } },
      appointments: { orderBy: { startsAt: 'desc' }, take: 1, select: { startsAt: true } },
    },
  });

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
      clientId: { in: clients.map((c) => c.id) },
    },
    select: { clientId: true },
    distinct: ['clientId'],
  });
  const clientsWithUpcoming = new Set(upcomingAppointments.map((a) => a.clientId));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-base-100">Clientes</h1>

      <form method="GET" className="max-w-sm">
        <Input name="q" defaultValue={query} placeholder="Buscar por nome ou WhatsApp" />
      </form>

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 && <p className="p-6 text-center text-sm text-base-500">Nenhum cliente encontrado.</p>}
          <ul className="divide-y divide-base-800">
            {clients.map((client) => {
              const isActive = clientsWithUpcoming.has(client.id);
              return (
                <li key={client.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      title={isActive ? 'Tem agendamento futuro' : 'Sem agendamento futuro'}
                      className={cn('h-2 w-2 shrink-0 rounded-full', isActive ? 'bg-accent' : 'bg-base-700')}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-base-100">{client.name}</p>
                      <p className="text-sm text-base-400">{client.whatsapp}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-base-500">
                    <p>{client._count.appointments} agendamento(s)</p>
                    {client.appointments[0] && (
                      <p>
                        Último:{' '}
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
                          client.appointments[0].startsAt,
                        )}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
