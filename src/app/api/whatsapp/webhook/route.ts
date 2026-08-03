import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMetaSignature, verifyWebhookHandshake } from '@/lib/whatsapp/webhook-security';
import { sendWhatsappTextMessage } from '@/lib/whatsapp/client';
import {
  parseInboundIntent,
  resolveAppointmentForReply,
  handleConfirmReply,
  handleRescheduleReply,
  handleCancelReply,
} from '@/lib/whatsapp/interactive';
import { t } from '@/lib/i18n/messages';
import { checkRateLimit, createPrismaRateLimitStore } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface MetaInboundMessage {
  id: string;
  from: string; // digitos, sem "+" (ex: "5511999999999")
  type: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
}

interface MetaWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: MetaInboundMessage[];
      };
    }[];
  }[];
}

/** Handshake de verificacao do webhook, feito uma vez ao configurar a URL no painel da Meta. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (challenge && verifyWebhookHandshake(mode, token)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Verificacao invalida.' }, { status: 403 });
}

function extractMessageText(message: MetaInboundMessage): string | null {
  return (
    message.text?.body ??
    message.button?.text ??
    message.interactive?.button_reply?.title ??
    message.interactive?.list_reply?.title ??
    null
  );
}

const REPLY_RATE_LIMIT = { limit: 10, windowMs: 10 * 60_000 }; // 10 respostas / 10 min por numero

/**
 * Recebe as respostas dos clientes ao lembrete de WhatsApp (1 confirmar,
 * 2 reagendar, 3 cancelar). Sempre responde 200 rapido (a Meta reenvia
 * agressivamente em caso contrario) — falhas de processamento sao isoladas
 * por mensagem e só logadas no servidor, nunca vazadas na resposta.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // Assinatura HMAC obrigatoria: sem ela, qualquer pessoa que descobrisse
  // essa URL poderia forjar um "3" (cancelar) em nome de qualquer cliente.
  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Assinatura invalida.' }, { status: 403 });
  }

  const payload = safeParseJson<MetaWebhookPayload>(rawBody);
  if (!payload) {
    return NextResponse.json({ received: true });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id ?? null;

      for (const message of change.value?.messages ?? []) {
        try {
          await processInboundMessage(message, phoneNumberId);
        } catch (error) {
          console.error(`Falha ao processar mensagem de WhatsApp ${message.id}:`, error);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function processInboundMessage(message: MetaInboundMessage, phoneNumberId: string | null): Promise<void> {
  // Deduplica pelo id da mensagem (wamid.*) — a Meta pode reenviar o mesmo
  // webhook se nao receber 200 a tempo; sem isso um "3" reprocessado
  // disparasse a recuperacao de no-show em duplicidade.
  const alreadyProcessed = await markMessageProcessed(message.id);
  if (alreadyProcessed) return;

  const fromPhone = `+${message.from.replace(/\D/g, '')}`;
  if (fromPhone === '+') return;

  const rateLimit = await checkRateLimit(createPrismaRateLimitStore(prisma), `whatsapp-webhook:${fromPhone}`, REPLY_RATE_LIMIT);
  if (!rateLimit.allowed) return;

  const text = extractMessageText(message);
  if (!text) return;

  const appointment = await resolveAppointmentForReply(prisma, fromPhone, phoneNumberId);
  if (!appointment) return; // mensagem nao corresponde a nenhum agendamento ativo conhecido

  const intent = parseInboundIntent(text);

  switch (intent) {
    case 'CONFIRM': {
      const ack = await handleConfirmReply(prisma, appointment);
      await sendWhatsappTextMessage({ to: appointment.client.whatsapp, body: ack });
      return;
    }
    case 'RESCHEDULE': {
      const offer = await handleRescheduleReply(prisma, appointment);
      await sendWhatsappTextMessage({ to: appointment.client.whatsapp, body: offer });
      return;
    }
    case 'CANCEL': {
      const { ackMessage } = await handleCancelReply(prisma, appointment);
      await sendWhatsappTextMessage({ to: appointment.client.whatsapp, body: ackMessage });
      return;
    }
    default: {
      await sendWhatsappTextMessage({
        to: appointment.client.whatsapp,
        body: t(appointment.tenant.locale, 'unrecognizedReply'),
      });
    }
  }
}

/** Retorna true se a mensagem ja tinha sido processada antes (id duplicado). */
async function markMessageProcessed(messageId: string): Promise<boolean> {
  try {
    await prisma.whatsappInboundMessage.create({ data: { id: messageId } });
    return false;
  } catch (error) {
    // P2002 = violacao de unique constraint (id ja existe) -> duplicata legitima.
    if (isUniqueConstraintError(error)) return true;
    throw error;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
