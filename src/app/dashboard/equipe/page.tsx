import { Search, UserPlus, Users, SlidersHorizontal, Edit3, Trash2, Lock } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PremiumAvatar } from '@/components/premium/avatar';
import { RoleBadge, ROLE_META } from '@/components/premium/role-badge';
import { StatCard } from '@/components/premium/stat-card';
import { cn } from '@/lib/utils';
import type { UserRole } from '@prisma/client';
import { inviteTeamMember, updateTeamMember, removeTeamMember } from './actions';

export const dynamic = 'force-dynamic';

const PERMISSION_FIELDS: { key: string; label: string }[] = [
  { key: 'canViewFinancial', label: 'Ver financeiro/relatórios' },
  { key: 'canManageScheduleAll', label: 'Gerenciar agenda de todos' },
  { key: 'canManageClients', label: 'Gerenciar clientes' },
  { key: 'canManageSettings', label: 'Editar configurações' },
  { key: 'canTriggerBroadcast', label: 'Enviar mensagens em massa' },
];

const ROLE_FILTERS: ('ALL' | UserRole)[] = ['ALL', 'OWNER', 'ADMIN', 'STAFF', 'CUSTOM'];

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; q?: string; role?: string };
}) {
  const user = await requireCurrentUser();
  const isOwner = user.role === 'OWNER';

  const members = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'asc' },
  });

  const query = searchParams.q?.trim().toLowerCase() ?? '';
  const roleFilter = (ROLE_FILTERS as readonly string[]).includes(searchParams.role ?? '') ? (searchParams.role as UserRole | 'ALL') : 'ALL';

  const filtered = members.filter(
    (m) =>
      (roleFilter === 'ALL' || m.role === roleFilter) &&
      (m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)),
  );

  const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  function filterLink(overrides: { q?: string; role?: string }) {
    const params = new URLSearchParams();
    const q = overrides.q ?? searchParams.q;
    const role = overrides.role ?? searchParams.role;
    if (q) params.set('q', q);
    if (role && role !== 'ALL') params.set('role', role);
    const qs = params.toString();
    return `/dashboard/equipe${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-base-100">Equipe</h1>
          <p className="mt-0.5 text-xs text-base-500">Gerencie membros, funções e permissões do seu estabelecimento</p>
        </div>
        {isOwner && (
          <a
            href="#convidar"
            className="flex items-center gap-1.5 rounded-niche bg-accent px-4 py-2 text-sm font-bold text-accent-contrast"
          >
            <UserPlus size={14} /> Convidar Usuário
          </a>
        )}
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      {searchParams.success && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent">{searchParams.success}</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total de Membros" value={String(members.length)} icon={<Users size={15} />} />
        <StatCard label="Donos & Admins" value={String((roleCounts.OWNER ?? 0) + (roleCounts.ADMIN ?? 0))} icon={<UserPlus size={15} />} />
        <StatCard label="Equipe (Staff)" value={String(roleCounts.STAFF ?? 0)} icon={<Users size={15} />} />
        <StatCard label="Papéis Custom" value={String(roleCounts.CUSTOM ?? 0)} icon={<SlidersHorizontal size={15} />} />
      </div>

      {!isOwner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3">
          <Lock size={14} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-400">Você tem acesso de visualização apenas. Ações de gestão de equipe requerem permissão de dono.</p>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] p-4">
          <form method="GET" className="relative min-w-40 flex-1">
            {roleFilter !== 'ALL' && <input type="hidden" name="role" value={roleFilter} />}
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-500" />
            <input
              name="q"
              defaultValue={searchParams.q}
              placeholder="Buscar por nome ou e-mail…"
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-8 pr-3 text-xs text-base-100 outline-none placeholder:text-base-500"
            />
          </form>
          <div className="flex flex-wrap items-center gap-1">
            {ROLE_FILTERS.map((r) => (
              <a
                key={r}
                href={filterLink({ role: r })}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  roleFilter === r ? 'border border-accent/40 bg-accent/20 text-accent' : 'border border-transparent text-base-500',
                )}
              >
                {r === 'ALL' ? 'Todos' : r}
              </a>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-base-500">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((member) => {
              const roleMeta = ROLE_META[member.role];
              return (
                <div key={member.id} className="flex flex-col gap-3 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <PremiumAvatar name={member.name} colorClassName={cn(roleMeta.bgClassName, roleMeta.colorClassName)} size={32} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-base-100">{member.name}</p>
                          {member.id === user.id && (
                            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">Você</span>
                          )}
                        </div>
                        <p className="truncate font-mono text-[10px] text-base-500">{member.email}</p>
                      </div>
                    </div>
                    <RoleBadge role={member.role} />
                  </div>

                  {isOwner && member.role !== 'OWNER' && (
                    <form action={updateTeamMember} className="flex flex-col gap-3 rounded-xl bg-white/[0.02] p-3">
                      <input type="hidden" name="memberId" value={member.id} />
                      <div className="max-w-xs">
                        <Label htmlFor={`role-${member.id}`}>Papel</Label>
                        <Select id={`role-${member.id}`} name="role" defaultValue={member.role}>
                          <option value="ADMIN">Admin</option>
                          <option value="STAFF">Equipe</option>
                          <option value="CUSTOM">Personalizado</option>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {PERMISSION_FIELDS.map((field) => (
                          <label key={field.key} className="flex items-center gap-2 text-sm text-base-400">
                            <input
                              type="checkbox"
                              name={field.key}
                              defaultChecked={Boolean(member[field.key as keyof typeof member])}
                              className="h-4 w-4 rounded border-base-600 bg-base-900 accent-accent"
                            />
                            {field.label}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" variant="secondary">
                          <Edit3 size={12} /> Salvar
                        </Button>
                        {member.id !== user.id && (
                          <Button
                            type="submit"
                            formAction={removeTeamMember}
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-danger/10"
                          >
                            <Trash2 size={12} /> Remover acesso
                          </Button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {isOwner && (
        <Card id="convidar">
          <CardContent>
            <h2 className="mb-4 font-display text-lg font-semibold text-base-100">Convidar para a equipe</h2>
            <form action={inviteTeamMember} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required placeholder="Ex: João Silva" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" required placeholder="joao@exemplo.com" />
                </div>
                <div className="w-full sm:w-40">
                  <Label htmlFor="role">Papel</Label>
                  <Select id="role" name="role" defaultValue="STAFF">
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Equipe</option>
                    <option value="CUSTOM">Personalizado</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PERMISSION_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 text-sm text-base-400">
                    <input
                      type="checkbox"
                      name={field.key}
                      defaultChecked={field.key === 'canManageClients'}
                      className="h-4 w-4 rounded border-base-600 bg-base-900 accent-accent"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
              <div>
                <Button type="submit">Enviar convite</Button>
                <p className="mt-2 text-xs text-base-500">A pessoa recebe um e-mail para criar a senha e acessar o painel.</p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
