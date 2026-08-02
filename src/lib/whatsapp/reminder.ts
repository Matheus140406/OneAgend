import { AppointmentStatus, type PrismaClient } from '@prisma/client';
import { sendWhatsappTemplateMessage } from './client';

const ACTIVE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

// Janelas de busca alinhadas ao disparo 24h/1h antes do horario, com
// tolerancia suficiente para cobrir o intervalo entre execucoes do cron.
const WINDOW_TOLERANCE_MINUTES = 30;

interface ReminderKindConfig {
  kind: '24h' | '1h';
  targetMinutesBefore: number;
  sentAtField: 'reminder24hSentAt' | 'reminder1hSentAt';
}

const REMINDER_KINDS: ReminderKindConfig[] = [
  { kind: '24h', targetMinutesBefore: 24 * 60, sentAtField: 'reminder24hSentAt' },
  { kind: '1h', targetMinutesBefore: 60, sentAtField: 'reminder1hSentAt' },
];

export interface DispatchRemindersResult {
  kind: '24h' | '1h';
  sent: number;
  failed: number;
}

/** Busca agendamentos na janela de cada tipo de lembrete e dispara as mensagens pendentes. */
export async function dispatchDueReminders(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<DispatchRemindersResult[]> {
  const results: DispatchRemindersResult[] = [];

  for (const config of REMINDER_KINDS) {
    const windowCenter = new Date(now.getTime() + config.targetMinutesBefore * 60_000);
    const windowStart = new Date(windowCenter.getTime() - WINDOW_TOLERANCE_MINUTES * 60_000);
    const windowEnd = new Date(windowCenter.getTime() + WINDOW_TOLERANCE_MINUTES * 60_000);

    const dueAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        startsAt: { gte: windowStart, lte: windowEnd },
        [config.sentAtField]: null,
      },
      include: { client: true, service: true, professional: true },
    });

    let sent = 0;
    let failed = 0;

    for (const appointment of dueAppointments) {
      // Cada agendamento e isolado: uma falha aqui (rede, banco) nunca deve
      // impedir o envio do lembrete para os demais agendamentos do lote.
      try {
        const timeLabel = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(appointment.startsAt);

        const result = await sendWhatsappTemplateMessage({
          to: appointment.client.whatsapp,
          templateName: process.env.WHATSAPP_TEMPLATE_LEMBRETE ?? 'lembrete_agendamento',
          bodyParameters: [appointment.client.name, appointment.service.name, timeLabel],
        });

        if (result.success) {
          sent += 1;
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { [config.sentAtField]: now },
          });
        } else {
          failed += 1;
          console.error(`Falha ao enviar lembrete ${config.kind} do agendamento ${appointment.id}:`, result.error);
        }
      } catch (error) {
        failed += 1;
        console.error(`Erro inesperado ao processar lembrete ${config.kind} do agendamento ${appointment.id}:`, error);
      }
    }

    results.push({ kind: config.kind, sent, failed });
  }

  return results;
}
