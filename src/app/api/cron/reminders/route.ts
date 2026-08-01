import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchDueReminders } from '@/lib/whatsapp/reminder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Disparado pelo Vercel Cron (ver vercel.json). Envia lembretes de WhatsApp
 * simples (sem chatbot) 24h e 1h antes de cada agendamento PENDING/CONFIRMED.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
  }

  const results = await dispatchDueReminders(prisma);

  return NextResponse.json({ results });
}
