import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

/**
 * Cliente isolado para a API de Assinaturas (Preapproval) do Mercado Pago.
 * Mantido como fronteira única de integração para facilitar trocar de
 * gateway no futuro sem tocar no restante da aplicação.
 */

function getBaseUrl() {
  return process.env.MERCADOPAGO_API_BASE_URL ?? 'https://api.mercadopago.com';
}

async function mercadoPagoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN nao configurado.');
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Mercado Pago API respondeu ${response.status} em ${path}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export type MercadoPagoPreapprovalStatus = 'pending' | 'authorized' | 'paused' | 'cancelled';

interface MercadoPagoPreapproval {
  id: string;
  status: MercadoPagoPreapprovalStatus;
  init_point: string;
  external_reference: string;
  auto_recurring?: { next_payment_date?: string };
}

export interface CreateSubscriptionParams {
  /** e-mail do dono do negocio, que sera o pagador da assinatura */
  payerEmail: string;
  reason: string;
  priceCents: number;
  /** usado para religar o webhook a um Tenant/Subscription (guardamos o tenantId) */
  externalReference: string;
  backUrl: string;
}

/** Cria uma assinatura recorrente (Preapproval) e retorna o link de checkout para o pagador autorizar. */
export async function createMercadoPagoSubscription(
  params: CreateSubscriptionParams,
): Promise<{ id: string; initPoint: string }> {
  const preapproval = await mercadoPagoFetch<MercadoPagoPreapproval>('/preapproval', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      reason: params.reason,
      external_reference: params.externalReference,
      payer_email: params.payerEmail,
      back_url: params.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.priceCents / 100,
        currency_id: 'BRL',
      },
      status: 'pending',
    }),
  });

  return { id: preapproval.id, initPoint: preapproval.init_point };
}

export async function getMercadoPagoSubscription(preapprovalId: string): Promise<MercadoPagoPreapproval> {
  return mercadoPagoFetch<MercadoPagoPreapproval>(`/preapproval/${preapprovalId}`, { method: 'GET' });
}

/**
 * Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago.
 * Formato do header `x-signature`: "ts=<timestamp>,v1=<hash>"
 * Manifesto assinado: "id:{dataId};request-id:{requestId};ts:{ts};"
 * (partes com valor ausente sao removidas do manifesto, conforme doc oficial)
 */
export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((chunk) => {
      const [key, value] = chunk.split('=').map((s) => s.trim());
      return [key, value];
    }),
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifestParts: string[] = [];
  if (dataId) manifestParts.push(`id:${dataId};`);
  if (xRequestId) manifestParts.push(`request-id:${xRequestId};`);
  manifestParts.push(`ts:${ts};`);
  const manifest = manifestParts.join('');

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(v1, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
