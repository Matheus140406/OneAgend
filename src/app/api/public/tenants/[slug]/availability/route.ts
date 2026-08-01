import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAvailableSlotsForService } from '@/lib/booking/availability';

/**
 * Horarios livres para um servico numa data, considerando um profissional
 * especifico ou "qualquer disponivel" (professionalId=any).
 * Query params: serviceId, professionalId ("any" ou id), date (YYYY-MM-DD)
 */
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const url = new URL(request.url);
  const serviceId = url.searchParams.get('serviceId');
  const professionalParam = url.searchParams.get('professionalId');
  const date = url.searchParams.get('date');

  if (!serviceId || !professionalParam || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Parametros invalidos.' }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug }, select: { id: true } });
  if (!tenant) {
    return NextResponse.json({ error: 'Negocio nao encontrado.' }, { status: 404 });
  }

  const slots = await getAvailableSlotsForService(prisma, {
    tenantId: tenant.id,
    serviceId,
    professionalId: professionalParam === 'any' ? null : professionalParam,
    dateKey: date,
  });

  return NextResponse.json({ slots: slots.map((slot) => slot.toISOString()) });
}
