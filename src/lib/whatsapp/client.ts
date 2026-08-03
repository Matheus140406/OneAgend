/**
 * Cliente isolado para envio de mensagens via WhatsApp Cloud API (Meta).
 * Mantido como uma unica funcao de fronteira para que trocar de provedor
 * (ex: outra BSP de WhatsApp) no futuro exija mudar apenas este arquivo.
 */

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

export interface SendWhatsappTemplateParams {
  to: string; // aceita E.164 ou formatado, ex: +55 (11) 99999-9999
  templateName: string;
  languageCode?: string;
  bodyParameters: string[];
}

export interface SendWhatsappResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

interface TemplateComponent {
  type: 'body';
  parameters: { type: 'text'; text: string }[];
}

interface MetaErrorResponse {
  error?: { message?: string };
}

/**
 * Nunca lanca excecao: qualquer falha (config ausente, rede, resposta de
 * erro da API) vira um SendWhatsappResult com success=false. Isso importa
 * porque o cron de lembretes chama isso em loop para varios agendamentos —
 * uma excecao aqui nao pode derrubar o envio dos demais.
 */
export async function sendWhatsappTemplateMessage(
  params: SendWhatsappTemplateParams,
): Promise<SendWhatsappResult> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION ?? 'v20.0';

  if (!token || !phoneNumberId) {
    return { success: false, error: 'WhatsApp Cloud API nao esta configurada.' };
  }

  // Remove tudo que nao for digito (espacos, parenteses, hifen, "+"), nao so o "+" —
  // aceita numeros formatados em vez de exigir E.164 estrito do chamador.
  const cleanPhone = params.to.replace(/\D/g, '');
  if (!cleanPhone) {
    return { success: false, error: 'Numero de destino invalido.' };
  }

  // Alguns templates nao tem variaveis; enviar `parameters: []` nesse caso e
  // rejeitado pela Graph API em certas versoes/templates, entao so incluimos
  // o componente "body" quando ha parametros de verdade.
  const components: TemplateComponent[] =
    params.bodyParameters.length > 0
      ? [{ type: 'body', parameters: params.bodyParameters.map((text) => ({ type: 'text', text })) }]
      : [];

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.languageCode ?? 'pt_BR' },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    });

    if (!response.ok) {
      const rawBody = await response.text().catch(() => '');
      const parsed = safeParseJson<MetaErrorResponse>(rawBody);
      const message = parsed?.error?.message ?? rawBody;
      return { success: false, error: `WhatsApp API respondeu ${response.status}: ${message}` };
    }

    const data = (await response.json()) as { messages?: { id: string }[] };
    return { success: true, providerMessageId: data.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Falha de rede desconhecida.' };
  }
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
