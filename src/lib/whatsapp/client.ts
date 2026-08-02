/**
 * Cliente isolado para envio de mensagens via WhatsApp Cloud API (Meta).
 * Mantido como uma unica funcao de fronteira para que trocar de provedor
 * (ex: outra BSP de WhatsApp) no futuro exija mudar apenas este arquivo.
 */

import { fetchWithRetry } from '@/lib/http/fetch-with-retry';

export interface SendWhatsappTemplateParams {
  to: string; // E.164, ex: +5511999999999
  templateName: string;
  languageCode?: string;
  bodyParameters: string[];
}

export interface SendWhatsappResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
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
        to: params.to.replace('+', ''),
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.languageCode ?? 'pt_BR' },
          components: [
            {
              type: 'body',
              parameters: params.bodyParameters.map((text) => ({ type: 'text', text })),
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, error: `WhatsApp API respondeu ${response.status}: ${body}` };
    }

    const data = (await response.json()) as { messages?: { id: string }[] };
    return { success: true, providerMessageId: data.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Falha de rede desconhecida.' };
  }
}
