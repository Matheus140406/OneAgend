import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Validacao do webhook da WhatsApp Cloud API (Meta), duas camadas:
 *
 * 1. Handshake de verificacao (GET, feito uma vez ao configurar o webhook no
 *    painel da Meta): confere hub.verify_token contra WHATSAPP_WEBHOOK_VERIFY_TOKEN.
 * 2. Assinatura de cada notificacao (POST): header `X-Hub-Signature-256`,
 *    HMAC-SHA256 do corpo cru com o App Secret. Sem isso, qualquer um que
 *    descobrisse a URL do webhook poderia forjar mensagens (ex: mandar "3"
 *    fingindo ser um cliente para cancelar agendamentos de terceiros).
 */

export function verifyWebhookHandshake(mode: string | null, token: string | null): boolean {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken) return false;
  return mode === 'subscribe' && token === expectedToken;
}

/**
 * Recebe o corpo CRU (string, antes de qualquer JSON.parse) — a assinatura e
 * calculada sobre os bytes exatos enviados pela Meta, entao reserializar o
 * JSON antes de comparar quebraria a validacao.
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const receivedHex = signatureHeader.slice('sha256='.length);
  const expectedHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const receivedBuffer = Buffer.from(receivedHex, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
