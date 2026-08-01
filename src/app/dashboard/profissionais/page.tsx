import Link from 'next/link';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PLAN_DETAILS } from '@/lib/plans';
import { createProfessional, toggleProfessionalActive } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProfessionalsPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await requireCurrentUser();
  const isOwner = user.role === 'OWNER';

  const professionals = await prisma.professional.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { workingHours: true, services: true } } },
  });

  const activeCount = professionals.filter((p) => p.active).length;
  const planLimit = PLAN_DETAILS[user.tenant.plan].maxProfessionals;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-base-100">Profissionais</h1>
          <p className="text-sm text-base-400">
            {activeCount} ativo(s){planLimit ? ` de ${planLimit} no plano ${PLAN_DETAILS[user.tenant.plan].label}` : ''}
          </p>
        </div>
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {professionals.length === 0 && (
            <p className="p-6 text-center text-sm text-base-500">Nenhum profissional cadastrado ainda.</p>
          )}
          <ul className="divide-y divide-base-800">
            {professionals.map((professional) => (
              <li key={professional.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/dashboard/profissionais/${professional.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-base-100">{professional.name}</p>
                  <p className="text-xs text-base-500">
                    {professional._count.workingHours} horário(s) de expediente · {professional._count.services}{' '}
                    serviço(s)
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={professional.active ? 'accent' : 'neutral'}>
                    {professional.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {isOwner && (
                    <form action={toggleProfessionalActive}>
                      <input type="hidden" name="professionalId" value={professional.id} />
                      <input type="hidden" name="active" value={(!professional.active).toString()} />
                      <Button type="submit" size="sm" variant="ghost">
                        {professional.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardContent>
            <h2 className="mb-4 font-display text-lg font-semibold text-base-100">Novo profissional</h2>
            <form action={createProfessional} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required placeholder="Ex: Ana Souza" />
              </div>
              <Button type="submit">Adicionar</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
