'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { createAsaasCustomer, createAsaasSubscription, getFirstPaymentInvoiceUrl } from '@/lib/billing/asaas';
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

  let asaasCustomerId = subscription.asaasCustomerId;
  if (!asaasCustomerId) {
    const customer = await createAsaasCustomer({ name: user.tenant.name, email: user.email });
    asaasCustomerId = customer.id;
  }

  const asaasSubscription = await createAsaasSubscription({
    customerId: asaasCustomerId,
    priceCents: PLAN_DETAILS[subscription.plan].priceCents,
    description: `OneAgend — plano ${PLAN_DETAILS[subscription.plan].label}`,
  });

  await prisma.subscription.update({
    where: { tenantId: user.tenantId },
    data: { asaasCustomerId, asaasSubscriptionId: asaasSubscription.id },
  });

  const invoiceUrl = await getFirstPaymentInvoiceUrl(asaasSubscription.id);
  revalidatePath('/dashboard/cobranca');

  if (invoiceUrl) {
    redirect(invoiceUrl);
  }

  redirect('/dashboard/cobranca?error=Assinatura criada, mas não foi possível obter o link de pagamento.');
}
