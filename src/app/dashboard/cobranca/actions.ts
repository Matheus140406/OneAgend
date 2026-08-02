'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { createMercadoPagoSubscription } from '@/lib/billing/mercadopago';
import { PLAN_DETAILS } from '@/lib/plans';
import type { Plan } from '@prisma/client';

export async function changePlan(formData: FormData) {
  const user = await requireCurrentUser();
  if (user.role !== 'OWNER') redirect('/dashboard/cobranca?error=Apenas o dono pode alterar o plano.');

  const plan = String(formData.get('plan')) as Plan;
  if (!PLAN_DETAILS[plan]) redirect('/dashboard/cobranca?error=Plano inválido.');

  const activeProfessionals = await prisma.professional.count({ where: { tenantId: user.tenantId, active: true } });
  const maxProfessionals = PLAN_DETAILS[plan].maxProfessionals;
  if (maxProfessionals !== null && activeProfessionals > maxProfessionals) {
    redirect(
      `/dashboard/cobranca?error=Você tem ${activeProfessionals} profissionais ativos, acima do limite do plano ${PLAN_DETAILS[plan].label}.`,
    );
  }

  await prisma.$transaction([
    prisma.tenant.update({ where: { id: user.tenantId }, data: { plan } }),
    prisma.subscription.update({ where: { tenantId: user.tenantId }, data: { plan } }),
  ]);

  revalidatePath('/dashboard/cobranca');
  redirect('/dashboard/cobranca?success=Plano atualizado. Inicie a cobrança para aplicar o novo valor.');
}

export async function startCheckout() {
  const user = await requireCurrentUser();
  if (user.role !== 'OWNER') redirect('/dashboard/cobranca?error=Apenas o dono pode gerenciar a cobrança.');

  const subscription = await prisma.subscription.findUniqueOrThrow({ where: { tenantId: user.tenantId } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Nao envolve o redirect() de sucesso no try: ele lanca um sinal interno do
  // Next.js que nao pode ser capturado por engano por este catch.
  let initPoint: string;
  try {
    const mercadoPagoSubscription = await createMercadoPagoSubscription({
      payerEmail: user.email,
      reason: `OneAgend — plano ${PLAN_DETAILS[subscription.plan].label}`,
      priceCents: PLAN_DETAILS[subscription.plan].priceCents,
      externalReference: user.tenantId,
      backUrl: `${appUrl}/dashboard/cobranca`,
    });

    await prisma.subscription.update({
      where: { tenantId: user.tenantId },
      data: { mercadoPagoPreapprovalId: mercadoPagoSubscription.id },
    });

    initPoint = mercadoPagoSubscription.initPoint;
  } catch (error) {
    console.error('Falha ao iniciar checkout do Mercado Pago:', error);
    redirect('/dashboard/cobranca?error=Não foi possível iniciar a cobrança agora. Tente novamente em instantes.');
  }

  revalidatePath('/dashboard/cobranca');
  redirect(initPoint);
}
