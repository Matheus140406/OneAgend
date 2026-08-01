import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Dados publicos do negocio + servicos ativos, para montar o passo 1 do agendamento. */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      services: {
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, durationMinutes: true, priceCents: true },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Negocio nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ tenant });
}
