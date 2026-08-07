import type { PrismaClient, WhatsappMessageDirection } from '@prisma/client';

/**
 * Grava uma mensagem de WhatsApp (enviada ou recebida) no historico da
 * conversa com o cliente, usado pela tela de Mensagens do painel.
 *
 * Nunca lanca: logar o historico e um efeito colateral auxiliar — uma falha
 * aqui (ex: banco fora do ar por um instante) nao pode impedir o envio real
 * da mensagem nem derrubar o fluxo do bot/cron que chamou isso.
 */
export async function logWhatsappMessage(
  prisma: PrismaClient,
  params: { tenantId: string; clientId: string; direction: WhatsappMessageDirection; body: string },
): Promise<void> {
  try {
    await prisma.whatsappMessage.create({ data: params });
  } catch (error) {
    console.error('Falha ao gravar historico de mensagem de WhatsApp:', error);
  }
}
