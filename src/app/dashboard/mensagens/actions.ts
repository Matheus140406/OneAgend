'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { assertPermission, ForbiddenError } from '@/lib/auth/rbac';
import { PLAN_DETAILS } from '@/lib/plans';
import { sendWhatsappTextMessage } from '@/lib/whatsapp/client';
import { logWhatsappMessage } from '@/lib/whatsapp/message-log';

export async function sendManualMessage(formData: FormData) {
  const user = await requireCurrentUser();
  const clientId = String(formData.get('clientId') ?? '');
  const text = String(formData.get('text') ?? '').trim();

  const backTo = `/dashboard/mensagens?clientId=${encodeURIComponent(clientId)}`;

  if (!PLAN_DETAILS[user.tenant.plan].hasWhatsappReminders) {
    redirect(`${backTo}&error=Mensagens de WhatsApp são um recurso dos planos Elite e Platina.`);
  }

  try {
    await assertPermission(prisma, user.id, 'canManageClients');
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect(`${backTo}&error=Você não tem permissão para enviar mensagens.`);
    }
    throw error;
  }

  if (!clientId || text.length === 0 || text.length > 1000) {
    redirect(`${backTo}&error=Escreva uma mensagem válida.`);
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.tenantId !== user.tenantId) {
    redirect('/dashboard/mensagens?error=Cliente não encontrado.');
  }

  const result = await sendWhatsappTextMessage({ to: client!.whatsapp, body: text });
  if (!result.success) {
    redirect(`${backTo}&error=${encodeURIComponent(result.error ?? 'Falha ao enviar a mensagem.')}`);
  }

  await logWhatsappMessage(prisma, { tenantId: user.tenantId, clientId: client!.id, direction: 'OUT', body: text });

  revalidatePath('/dashboard/mensagens');
  redirect(backTo);
}
