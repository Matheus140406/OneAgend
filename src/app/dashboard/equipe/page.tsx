import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { inviteTeamMember, updateTeamMember, removeTeamMember } from './actions';

export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Dono',
  ADMIN: 'Admin',
  STAFF: 'Equipe',
  CUSTOM: 'Personalizado',
};

const PERMISSION_FIELDS: { key: string; label: string }[] = [
  { key: 'canViewFinancial', label: 'Ver financeiro/relatórios' },
  { key: 'canManageScheduleAll', label: 'Gerenciar agenda de todos' },
  { key: 'canManageClients', label: 'Gerenciar clientes' },
  { key: 'canManageSettings', label: 'Editar configurações' },
  { key: 'canTriggerBroadcast', label: 'Enviar mensagens em massa' },
];

export default async function TeamPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  const user = await requireCurrentUser();
  const isOwner = user.role === 'OWNER';

  const members = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-base-100">Equipe</h1>
        <p className="text-sm text-base-400">Quem tem acesso ao painel e o que cada pessoa pode fazer.</p>
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      {searchParams.success && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent">{searchParams.success}</p>
      )}

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-base-800">
            {members.map((member) => (
              <li key={member.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-base-100">
                      {member.name} {member.id === user.id && <span className="text-xs text-base-500">(você)</span>}
                    </p>
                    <p className="truncate text-sm text-base-400">{member.email}</p>
                  </div>
                  <Badge variant={member.role === 'OWNER' ? 'accent' : 'neutral'}>{ROLE_LABELS[member.role]}</Badge>
                </div>

                {isOwner && member.role !== 'OWNER' && (
                  <form action={updateTeamMember} className="flex flex-col gap-3 rounded-xl bg-base-800/40 p-3">
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
                        <label key={field.key} className="flex items-center gap-2 text-sm text-base-300">
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
                        Salvar
                      </Button>
                    </div>
                  </form>
                )}

                {isOwner && member.role !== 'OWNER' && member.id !== user.id && (
                  <form action={removeTeamMember}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-danger hover:bg-danger/10">
                      Remover acesso
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
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
                  <label key={field.key} className="flex items-center gap-2 text-sm text-base-300">
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
                <p className="mt-2 text-xs text-base-500">
                  A pessoa recebe um e-mail para criar a senha e acessar o painel.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
