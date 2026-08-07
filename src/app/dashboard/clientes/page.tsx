import { Search, Calendar, Edit3, Plus, Lock } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { PremiumAvatar } from '@/components/premium/avatar';
import { StatusDot } from '@/components/premium/status-dot';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function visitTag(visits: number): string {
  if (visits >= 20) return 'VIP';
  if (visits >= 5) return 'Regular';
  return 'Novo';
}

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const user = await requireCurrentUser();
  const canManageClients = await checkPermission(prisma, user.id, 'canManageClients');

  if (!canManageClients) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
        <Lock size={28} className="mb-4 text-base-600" />
        <h2 className="mb-1 text-base font-bold text-base-100">Acesso Restrito</h2>
        <p className="text-sm text-base-500">Você não tem permissão para ver a base de clientes.</p>
      </div>
    );
  }

  const query = searchParams.q?.trim() ?? '';
  const statusFilter = searchParams.status === 'active' || searchParams.status === 'inactive' ? searchParams.status : 'all';
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
      appointments: { orderBy: { startsAt: 'desc' }, take: 1, select: { startsAt: true, service: { select: { name: true } } } },
    },
  });

  const upcoming = await prisma.appointment.findMany({
    where: {
      tenantId: user.tenantId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
      clientId: { in: clients.map((c) => c.id) },
    },
    select: { clientId: true },
    distinct: ['clientId'],
  });
  const activeClientIds = new Set(upcoming.map((a) => a.clientId));

  const filtered = clients.filter((c) => {
    if (statusFilter === 'active') return activeClientIds.has(c.id);
    if (statusFilter === 'inactive') return !activeClientIds.has(c.id);
    return true;
  });

  function filterLink(status: 'all' | 'active' | 'inactive') {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    const qs = params.toString();
    return `/dashboard/clientes${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-base-100">Clientes</h1>
          <p className="mt-0.5 text-xs text-base-500">{clients.length} clientes cadastrados</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-niche bg-accent px-3 py-2 text-xs font-bold text-accent-contrast">
          <Plus size={13} /> Novo Cliente
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] p-4">
          <form method="GET" className="relative min-w-40 flex-1">
            {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar cliente…"
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-8 pr-3 text-xs text-base-100 outline-none placeholder:text-base-500"
            />
          </form>
          <div className="flex gap-1">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <a
                key={f}
                href={filterLink(f)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  statusFilter === f ? 'border border-accent/40 bg-accent/20 text-accent' : 'border border-transparent text-base-500',
                )}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
              </a>
            ))}
          </div>
        </div>

        <div
          className="hidden grid-cols-[1fr_130px_80px_90px_80px] bg-white/[0.01] px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-base-500 sm:grid"
        >
          <span>Cliente</span>
          <span>Último Serviço</span>
          <span>Visitas</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </div>

        {filtered.length === 0 && <p className="p-6 text-center text-sm text-base-500">Nenhum cliente encontrado.</p>}

        <div className="divide-y divide-white/[0.06]">
          {filtered.map((client) => {
            const visits = client._count.appointments;
            const isActive = activeClientIds.has(client.id);
            const lastService = client.appointments[0]?.service.name;
            return (
              <div key={client.id} className="group grid grid-cols-1 items-center gap-2 px-5 py-3.5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_130px_80px_90px_80px]">
                <div className="flex min-w-0 items-center gap-3">
                  <PremiumAvatar name={client.name} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-base-100">{client.name}</p>
                    <p className="truncate font-mono text-[10px] text-base-500">{client.whatsapp}</p>
                  </div>
                  <span className="ml-1 shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {visitTag(visits)}
                  </span>
                </div>
                <p className="truncate pr-2 text-xs text-base-500">{lastService ?? '—'}</p>
                <p className="text-sm font-semibold text-base-100">{visits}x</p>
                <StatusDot status={isActive ? 'active' : 'inactive'} />
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-base-500 transition-colors hover:bg-white/10">
                    <Calendar size={12} />
                  </button>
                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-base-500 transition-colors hover:bg-white/10">
                    <Edit3 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
