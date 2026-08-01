import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getMercadoPagoSubscription,
  verifyMercadoPagoSignature,
  type MercadoPagoPreapprovalStatus,
} from '@/lib/billing/mercadopago';
import type { SubscriptionStatus } from '@prisma/client';

interface MercadoPagoWebhookPayload {
  type?: string;
  topic?: string;
  data?: { id?: string };
}

const STATUS_MAP: Record<MercadoPagoPreapprovalStatus, SubscriptionStatus> = {
  pending: 'TRIALING',
  authorized: 'ACTIVE',
  paused: 'PAST_DUE',
  cancelled: 'CANCELED',
};

// A doc atual do Mercado Pago usa `type: "subscription_preapproval"` no corpo
// da notificação, mas integrações mais antigas/outras paginas de doc citam
// `topic`/`type` como só "subscription" ou "preapproval". Aceitamos as
// variantes conhecidas para não perder notificações reais por causa de
// divergência de nomenclatura entre versões da API.
const SUBSCRIPTION_EVENT_TYPES = new Set(['subscription_preapproval', 'subscription', 'preapproval']);

/**
 * Webhook do Mercado Pago: atualiza o status da Subscription conforme a
 * assinatura recorrente (Preapproval) muda de estado (autorizada, pausada
 * por falha de pagamento, ou cancelada).
 *
 * Não tratamos "subscription_authorized_payment" (cobrança recorrente
 * individual bem sucedida) porque cada cobrança também atualiza o status da
 * própria preapproval, disparando o evento acima — suficiente para manter
 * `Subscription.status` em dia sem duplicar lógica.
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as MercadoPagoWebhookPayload | null;
  if (!payload) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const url = new URL(request.url);
  const dataId = payload.data?.id ?? url.searchParams.get('data.id');
  const eventType = payload.type ?? payload.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic');

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const valid = verifyMercadoPagoSignature({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId: dataId ?? null,
      secret,
    });
    if (!valid) {
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }
  }

  if (!dataId || !eventType || !SUBSCRIPTION_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ received: true });
  }

  const subscriptionRecord = await prisma.subscription.findFirst({
    where: { mercadoPagoPreapprovalId: dataId },
  });
  if (!subscriptionRecord) {
    return NextResponse.json({ received: true });
  }

  const preapproval = await getMercadoPagoSubscription(dataId);
  const status = STATUS_MAP[preapproval.status];

  await prisma.subscription.update({
    where: { id: subscriptionRecord.id },
    data: {
      status,
      currentPeriodEnd: preapproval.auto_recurring?.next_payment_date
        ? new Date(preapproval.auto_recurring.next_payment_date)
        : subscriptionRecord.currentPeriodEnd,
    },
  });

  return NextResponse.json({ received: true });
}
