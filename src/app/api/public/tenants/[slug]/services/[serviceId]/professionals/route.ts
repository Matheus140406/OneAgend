import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Profissionais ativos que executam o servico escolhido no passo 2. */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string; serviceId: string } },
) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug }, select: { id: true } });
  if (!tenant) {
    return NextResponse.json({ error: 'Negocio nao encontrado.' }, { status: 404 });
  }

  const professionals = await prisma.professional.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
      services: { some: { serviceId: params.serviceId } },
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return NextResponse.json({ professionals });
}
