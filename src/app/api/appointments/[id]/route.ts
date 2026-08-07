import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELED', 'NO_SHOW', 'DONE']),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Status invalido.' }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: params.id } });
  if (!appointment || appointment.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Agendamento nao encontrado.' }, { status: 404 });
  }

  if (user.role === 'STAFF' && appointment.professionalId !== user.professionalId) {
    return NextResponse.json({ error: 'Sem permissao para alterar esse agendamento.' }, { status: 403 });
  }

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ appointment: updated });
}
