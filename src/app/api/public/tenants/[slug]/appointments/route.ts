import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createAppointmentInTransaction, AppointmentConflictError } from '@/lib/booking/validateAppointment';
import { normalizeBrazilianWhatsapp, isValidBrazilianWhatsapp } from '@/lib/phone';

const bookingSchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1), // id do profissional, ou "any"
  startsAt: z.string().datetime(),
  clientName: z.string().min(2).max(120),
  clientWhatsapp: z.string().refine(isValidBrazilianWhatsapp, 'WhatsApp invalido.'),
});

/** Passo 3 do agendamento publico: confirma nome + WhatsApp e cria o Appointment. */
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const parsed = bookingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }, { status: 400 });
  }

  const { serviceId, professionalId, startsAt, clientName, clientWhatsapp } = parsed.data;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: { id: true, timezone: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Negocio nao encontrado.' }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: tenant.id, active: true },
    select: { id: true, durationMinutes: true },
  });
  if (!service) {
    return NextResponse.json({ error: 'Servico nao encontrado.' }, { status: 404 });
  }

  const start = new Date(startsAt);
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);

  const candidateProfessionalIds =
    professionalId === 'any'
      ? (
          await prisma.professional.findMany({
            where: { tenantId: tenant.id, active: true, services: { some: { serviceId } } },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [professionalId];

  if (candidateProfessionalIds.length === 0) {
    return NextResponse.json({ error: 'Nenhum profissional disponivel para esse servico.' }, { status: 409 });
  }

  const whatsapp = normalizeBrazilianWhatsapp(clientWhatsapp);
  const client = await prisma.client.upsert({
    where: { tenantId_whatsapp: { tenantId: tenant.id, whatsapp } },
    update: { name: clientName },
    create: { tenantId: tenant.id, name: clientName, whatsapp },
  });

  let lastError: AppointmentConflictError | null = null;

  for (const candidateId of candidateProfessionalIds) {
    try {
      const appointment = await createAppointmentInTransaction(prisma, {
        tenantId: tenant.id,
        professionalId: candidateId,
        serviceId: service.id,
        clientId: client.id,
        startsAt: start,
        endsAt: end,
        timezone: tenant.timezone,
      });

      return NextResponse.json({ appointment: { id: appointment.id, startsAt: appointment.startsAt } }, { status: 201 });
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        lastError = error;
        continue; // tenta o proximo profissional candidato (fluxo "qualquer disponivel")
      }
      throw error;
    }
  }

  return NextResponse.json(
    { error: lastError?.message ?? 'Esse horario nao esta mais disponivel.' },
    { status: 409 },
  );
}
