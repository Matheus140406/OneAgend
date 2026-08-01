/**
 * Cliente isolado para a API do Asaas (cobrança recorrente). Mantido como
 * fronteira unica de integracao para facilitar trocar de gateway no futuro.
 */

interface AsaasCustomer {
  id: string;
}

interface AsaasSubscription {
  id: string;
  status: string;
}

interface AsaasPayment {
  id: string;
  invoiceUrl: string;
  status: string;
}

function getBaseUrl() {
  return process.env.ASAAS_API_BASE_URL ?? 'https://api.asaas.com/v3';
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new Error('ASAAS_API_KEY nao configurada.');
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Asaas API respondeu ${response.status} em ${path}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function createAsaasCustomer(params: { name: string; email: string }): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: params.name, email: params.email }),
  });
}

export async function createAsaasSubscription(params: {
  customerId: string;
  priceCents: number;
  description: string;
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.customerId,
      billingType: 'UNDEFINED', // cliente escolhe cartao, pix ou boleto no checkout
      cycle: 'MONTHLY',
      value: params.priceCents / 100,
      description: params.description,
      nextDueDate: new Date().toISOString().slice(0, 10),
    }),
  });
}

export async function getFirstPaymentInvoiceUrl(subscriptionId: string): Promise<string | null> {
  const payments = await asaasFetch<{ data: AsaasPayment[] }>(
    `/payments?subscription=${subscriptionId}&limit=1`,
  );
  return payments.data[0]?.invoiceUrl ?? null;
}
