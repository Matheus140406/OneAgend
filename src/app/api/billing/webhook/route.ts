import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    subscription?: string;
    status?: string;
    dueDate?: string;
  };
}

const ACTIVE_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);
const PAST_DUE_EVENTS = new Set(['PAYMENT_OVERDUE']);
const CANCELED_EVENTS = new Set(['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_DELETED']);

/** Webhook do Asaas: atualiza o status da Subscription conforme o pagamento recorrente. */
export async function POST(request: Request) {
  const configuredToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (configuredToken) {
    const receivedToken = request.headers.get('asaas-access-token');
    if (receivedToken !== configuredToken) {
      return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
    }
  }

  const payload = (await request.json()) as AsaasWebhookPayload;
  const asaasSubscriptionId = payload.payment?.subscription;

  if (!asaasSubscriptionId) {
    return NextResponse.json({ received: true });
  }

  const subscription = await prisma.subscription.findFirst({ where: { asaasSubscriptionId } });
  if (!subscription) {
    return NextResponse.json({ received: true });
  }

  let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | undefined;
  if (ACTIVE_EVENTS.has(payload.event)) status = 'ACTIVE';
  else if (PAST_DUE_EVENTS.has(payload.event)) status = 'PAST_DUE';
  else if (CANCELED_EVENTS.has(payload.event)) status = 'CANCELED';

  if (status) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status,
        currentPeriodEnd: payload.payment?.dueDate ? new Date(payload.payment.dueDate) : subscription.currentPeriodEnd,
      },
    });
  }

  return NextResponse.json({ received: true });
}
