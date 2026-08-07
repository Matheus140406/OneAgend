'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { planAllowsProfessionalCount } from '@/lib/plans';

export async function createProfessional(formData: FormData) {
  const user = await requireCurrentUser();
  if (user.role !== 'OWNER') {
    redirect('/dashboard/profissionais?error=Apenas o dono pode gerenciar profissionais.');
  }

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) {
    redirect('/dashboard/profissionais?error=Informe um nome válido.');
  }

  const activeCount = await prisma.professional.count({ where: { tenantId: user.tenantId, active: true } });
  if (!planAllowsProfessionalCount(user.tenant.plan, activeCount + 1)) {
    redirect(
      '/dashboard/profissionais?error=Limite de profissionais do plano atual atingido. Faça upgrade em Cobrança.',
    );
  }

  await prisma.professional.create({ data: { tenantId: user.tenantId, name } });
  revalidatePath('/dashboard/profissionais');
  redirect('/dashboard/profissionais');
}

export async function toggleProfessionalActive(formData: FormData) {
  const user = await requireCurrentUser();
  const professionalId = String(formData.get('professionalId'));
  const active = formData.get('active') === 'true';

  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional || professional.tenantId !== user.tenantId) return;

  if (active) {
    const activeCount = await prisma.professional.count({ where: { tenantId: user.tenantId, active: true } });
    if (!planAllowsProfessionalCount(user.tenant.plan, activeCount + 1)) {
      redirect('/dashboard/profissionais?error=Limite de profissionais do plano atual atingido.');
    }
  }

  await prisma.professional.update({ where: { id: professionalId }, data: { active } });
  revalidatePath('/dashboard/profissionais');
}

export async function addWorkingHour(formData: FormData) {
  const user = await requireCurrentUser();
  const professionalId = String(formData.get('professionalId'));
  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional || professional.tenantId !== user.tenantId) return;

  const weekday = Number(formData.get('weekday'));
  const startTime = String(formData.get('startTime'));
  const endTime = String(formData.get('endTime'));

  const valid =
    weekday >= 0 &&
    weekday <= 6 &&
    /^\d{2}:\d{2}$/.test(startTime) &&
    /^\d{2}:\d{2}$/.test(endTime) &&
    startTime < endTime;

  if (!valid) {
    redirect(`/dashboard/profissionais/${professionalId}?error=Horário inválido.`);
  }

  await prisma.workingHour.create({ data: { professionalId, weekday, startTime, endTime } });
  revalidatePath(`/dashboard/profissionais/${professionalId}`);
  redirect(`/dashboard/profissionais/${professionalId}`);
}

export async function deleteWorkingHour(formData: FormData) {
  const user = await requireCurrentUser();
  const workingHourId = String(formData.get('workingHourId'));
  const professionalId = String(formData.get('professionalId'));

  const workingHour = await prisma.workingHour.findUnique({
    where: { id: workingHourId },
    include: { professional: true },
  });
  if (!workingHour || workingHour.professional.tenantId !== user.tenantId) return;

  await prisma.workingHour.delete({ where: { id: workingHourId } });
  revalidatePath(`/dashboard/profissionais/${professionalId}`);
}

export async function addTimeOff(formData: FormData) {
  const user = await requireCurrentUser();
  const professionalId = String(formData.get('professionalId'));
  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional || professional.tenantId !== user.tenantId) return;

  const startsAt = new Date(String(formData.get('startsAt')));
  const endsAt = new Date(String(formData.get('endsAt')));
  const reason = String(formData.get('reason') ?? '').trim() || null;

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    redirect(`/dashboard/profissionais/${professionalId}?error=Período de folga inválido.`);
  }

  await prisma.timeOff.create({ data: { professionalId, startsAt, endsAt, reason } });
  revalidatePath(`/dashboard/profissionais/${professionalId}`);
  redirect(`/dashboard/profissionais/${professionalId}`);
}

export async function deleteTimeOff(formData: FormData) {
  const user = await requireCurrentUser();
  const timeOffId = String(formData.get('timeOffId'));
  const professionalId = String(formData.get('professionalId'));

  const timeOff = await prisma.timeOff.findUnique({ where: { id: timeOffId }, include: { professional: true } });
  if (!timeOff || timeOff.professional.tenantId !== user.tenantId) return;

  await prisma.timeOff.delete({ where: { id: timeOffId } });
  revalidatePath(`/dashboard/profissionais/${professionalId}`);
}

export async function setServiceForProfessional(formData: FormData) {
  const user = await requireCurrentUser();
  const professionalId = String(formData.get('professionalId'));
  const serviceId = String(formData.get('serviceId'));
  const enabled = formData.get('enabled') === 'true';

  const [professional, service] = await Promise.all([
    prisma.professional.findUnique({ where: { id: professionalId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!professional || !service || professional.tenantId !== user.tenantId || service.tenantId !== user.tenantId) {
    return;
  }

  if (enabled) {
    await prisma.serviceOnProfessional.upsert({
      where: { serviceId_professionalId: { serviceId, professionalId } },
      update: {},
      create: { serviceId, professionalId },
    });
  } else {
    await prisma.serviceOnProfessional.deleteMany({ where: { serviceId, professionalId } });
  }

  revalidatePath(`/dashboard/profissionais/${professionalId}`);
}
