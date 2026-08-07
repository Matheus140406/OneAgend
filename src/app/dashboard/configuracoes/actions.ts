'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { assertPermission, ForbiddenError } from '@/lib/auth/rbac';
import { updateTenantWhatsappConfig } from '@/lib/whatsapp/update-tenant-config';
import type { Locale, NicheType } from '@prisma/client';

const NICHE_VALUES = [
  'BEAUTY_SALON',
  'HEALTH_CLINIC',
  'BARBERSHOP',
  'PETSHOP',
  'PERSONAL_TRAINER',
  'TATTOO_STUDIO',
  'THERAPY_CONSULTING',
  'SPORTS_COURT',
] as const;

const LOCALE_VALUES = ['PT_BR', 'PT_PT', 'EN', 'ES', 'FR'] as const;

export async function updateBusinessSettings(formData: FormData) {
  const user = await requireCurrentUser();

  try {
    await assertPermission(prisma, user.id, 'canManageSettings');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect('/dashboard/configuracoes?error=Você não tem permissão para editar as configurações.');
    }
    throw error;
  }

  const name = String(formData.get('name') ?? '').trim();
  const niche = String(formData.get('niche') ?? '');
  const locale = String(formData.get('locale') ?? '');
  const whatsappPhone = String(formData.get('whatsappPhone') ?? '').trim();
  const whatsappTemplate = String(formData.get('whatsappTemplate') ?? '').trim();
  const useDefaultTemplate = formData.get('useDefaultTemplate') === 'on';

  if (name.length < 2 || !(NICHE_VALUES as readonly string[]).includes(niche) || !(LOCALE_VALUES as readonly string[]).includes(locale)) {
    redirect('/dashboard/configuracoes?error=Preencha os campos corretamente.');
  }

  try {
    await prisma.tenant.update({ where: { id: user.tenantId }, data: { name } });

    await updateTenantWhatsappConfig(prisma, user.tenantId, {
      niche: niche as NicheType,
      locale: locale as Locale,
      whatsappPhone: whatsappPhone || null,
      whatsappTemplate: whatsappTemplate || null,
      useDefaultTemplate,
    });
  } catch (error) {
    console.error('Falha ao salvar configurações do negócio:', error);
    redirect('/dashboard/configuracoes?error=Erro ao salvar. Tente novamente.');
  }

  revalidatePath('/dashboard/configuracoes');
  revalidatePath('/dashboard');
  redirect('/dashboard/configuracoes?success=Configurações salvas.');
}
