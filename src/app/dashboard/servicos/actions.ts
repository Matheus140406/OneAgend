'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';

function parsePriceToCents(raw: string): number | null {
  const normalized = raw.replace(/\./g, '').replace(',', '.').trim();
  const value = Number(normalized);
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}

export async function createService(formData: FormData) {
  const user = await requireCurrentUser();
  if (user.role !== 'OWNER') {
    redirect('/dashboard/servicos?error=Apenas o dono pode gerenciar serviços.');
  }

  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim() || null;
  const durationMinutes = Number(formData.get('durationMinutes'));
  const priceCents = parsePriceToCents(String(formData.get('price') ?? ''));

  if (name.length < 2 || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || priceCents === null) {
    redirect('/dashboard/servicos?error=Preencha nome, duração e preço válidos.');
  }

  await prisma.service.create({
    data: { tenantId: user.tenantId, name, category, durationMinutes, priceCents: priceCents! },
  });

  revalidatePath('/dashboard/servicos');
  redirect('/dashboard/servicos');
}

export async function updateService(formData: FormData) {
  const user = await requireCurrentUser();
  const serviceId = String(formData.get('serviceId'));
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.tenantId !== user.tenantId) return;

  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim() || null;
  const durationMinutes = Number(formData.get('durationMinutes'));
  const priceCents = parsePriceToCents(String(formData.get('price') ?? ''));

  if (name.length < 2 || !Number.isFinite(durationMinutes) || durationMinutes <= 0 || priceCents === null) {
    redirect('/dashboard/servicos?error=Preencha nome, duração e preço válidos.');
  }

  await prisma.service.update({
    where: { id: serviceId },
    data: { name, category, durationMinutes, priceCents: priceCents! },
  });

  revalidatePath('/dashboard/servicos');
}

export async function toggleServiceActive(formData: FormData) {
  const user = await requireCurrentUser();
  const serviceId = String(formData.get('serviceId'));
  const active = formData.get('active') === 'true';

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.tenantId !== user.tenantId) return;

  await prisma.service.update({ where: { id: serviceId }, data: { active } });
  revalidatePath('/dashboard/servicos');
}
