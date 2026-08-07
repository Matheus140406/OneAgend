import Link from 'next/link';
import { Smartphone, Wifi, Crown, Send } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PLAN_DETAILS } from '@/lib/plans';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PremiumAvatar } from '@/components/premium/avatar';
import { cn } from '@/lib/utils';
import { sendManualMessage } from './actions';

export const dynamic = 'force-dynamic';

const MAX_THREADS_WINDOW = 200;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: { clientId?: string; error?: string };
}) {
  const user = await requireCurrentUser();
  const hasWa = PLAN_DETAILS[user.tenant.plan].hasWhatsappReminders;
  const whatsappConfigured = Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID);

  const recentMessages = hasWa
    ? await prisma.whatsappMessage.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: MAX_THREADS_WINDOW,
        include: { client: { select: { id: true, name: true, whatsapp: true } } },
      })
    : [];

  const threads = new Map<string, { client: { id: string; name: string; whatsapp: string }; body: string; createdAt: Date }>();
  for (const message of recentMessages) {
    if (!threads.has(message.clientId)) {
      threads.set(message.clientId, { client: message.client, body: message.body, createdAt: message.createdAt });
    }
  }
  const threadList = Array.from(threads.values());

  const selectedClientId = searchParams.clientId ?? threadList[0]?.client.id;
  const selectedThread = threadList.find((thread) => thread.client.id === selectedClientId);

  const messages =
    hasWa && selectedClientId
      ? await prisma.whatsappMessage.findMany({
          where: { tenantId: user.tenantId, clientId: selectedClientId },
          orderBy: { createdAt: 'asc' },
        })
      : [];

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-base-100">Mensagens</h1>
        <p className="mt-0.5 text-xs text-base-500">Central de comunicação + lembretes automáticos via WhatsApp Cloud API</p>
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}

      {/* Status bar do WhatsApp */}
      <Card accentGlow={whatsappConfigured}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15">
              <Smartphone size={17} className="text-[#25D366]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-base-100">WhatsApp Cloud API</p>
                {!hasWa && <span className="rounded-full bg-[#C49A2E] px-2 py-0.5 text-[10px] font-bold text-black">Elite+</span>}
              </div>
              <p className="mt-0.5 text-xs text-base-500">
                {!hasWa
                  ? 'Disponível nos planos Elite e Platina'
                  : whatsappConfigured
                    ? 'Conectado · enviando lembretes 24h e 1h antes'
                    : 'Token não configurado — lembretes e o bot não enviam mensagens'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasWa && whatsappConfigured && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Wifi size={11} /> Online
              </span>
            )}
            {!hasWa && (
              <Link
                href="/dashboard/cobranca"
                className="flex items-center gap-1.5 rounded-niche bg-accent px-3 py-2 text-xs font-bold text-accent-contrast"
              >
                <Crown size={12} /> Ver Planos
              </Link>
            )}
          </div>
        </div>
      </Card>

      {!hasWa ? (
        <Card>
          <div className="p-6 text-center text-sm text-base-500">
            A conversa por WhatsApp com seus clientes é um recurso dos planos <strong className="text-base-300">Elite</strong> e{' '}
            <strong className="text-base-300">Platina</strong>.
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[12rem_1fr]" style={{ minHeight: '24rem' }}>
            <div className="flex flex-col border-b border-white/[0.06] md:border-b-0 md:border-r">
              <div className="border-b border-white/[0.06] bg-white/[0.01] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-base-500">Conversas</p>
              </div>
              {threadList.length === 0 ? (
                <p className="p-4 text-xs text-base-500">
                  Nenhuma conversa ainda. As mensagens aparecem aqui assim que um lembrete for enviado ou um cliente
                  responder pelo WhatsApp.
                </p>
              ) : (
                <div className="max-h-[24rem] flex-1 overflow-y-auto">
                  {threadList.map((thread) => (
                    <Link
                      key={thread.client.id}
                      href={`/dashboard/mensagens?clientId=${thread.client.id}`}
                      className={cn(
                        'flex items-start gap-2.5 border-b border-white/[0.06] px-3 py-3 text-left transition-colors hover:bg-white/[0.025]',
                        thread.client.id === selectedClientId && 'bg-white/[0.03]',
                      )}
                    >
                      <PremiumAvatar name={thread.client.name} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-base-100">{thread.client.name.split(' ')[0]}</p>
                        <p className="mt-0.5 truncate text-[10px] text-base-500">{thread.body}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col">
              {!selectedThread ? (
                <div className="flex flex-1 items-center justify-center p-6 text-sm text-base-500">Selecione uma conversa.</div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 border-b border-white/[0.06] bg-white/[0.01] px-4 py-2.5">
                    <PremiumAvatar name={selectedThread.client.name} size={26} />
                    <p className="text-sm font-semibold text-base-100">{selectedThread.client.name}</p>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {messages.map((message) => (
                      <div key={message.id} className={cn('flex', message.direction === 'OUT' ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[72%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                            message.direction === 'OUT'
                              ? 'bg-accent text-accent-contrast'
                              : 'border border-white/[0.06] bg-base-850 text-base-100',
                          )}
                        >
                          <p className="whitespace-pre-wrap">{message.body}</p>
                          <p className="mt-1 text-right text-[9px] opacity-50">{timeFormatter.format(message.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form action={sendManualMessage} className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2.5">
                    <input type="hidden" name="clientId" value={selectedThread.client.id} />
                    <input
                      type="text"
                      name="text"
                      required
                      placeholder="Responder…"
                      className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-base-100 outline-none placeholder:text-base-500"
                    />
                    <Button type="submit" size="sm" className="h-8 w-8 p-0">
                      <Send size={13} />
                    </Button>
                  </form>
                  <p className="px-3 pb-3 text-[11px] text-base-500">
                    Só é possível enviar mensagem livre até 24h depois da última mensagem recebida do cliente (regra da Meta).
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
