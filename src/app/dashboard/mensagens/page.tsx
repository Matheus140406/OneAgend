import Link from 'next/link';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PLAN_DETAILS } from '@/lib/plans';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  if (!PLAN_DETAILS[user.tenant.plan].hasWhatsappReminders) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold text-base-100">Mensagens</h1>
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm text-base-400">
              A conversa por WhatsApp com seus clientes é um recurso dos planos <strong>Elite</strong> e{' '}
              <strong>Platina</strong>.
            </p>
            <Link href="/dashboard/cobranca">
              <Button size="sm">Ver planos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentMessages = await prisma.whatsappMessage.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: MAX_THREADS_WINDOW,
    include: { client: { select: { id: true, name: true, whatsapp: true } } },
  });

  const threads = new Map<string, { client: { id: string; name: string; whatsapp: string }; body: string; createdAt: Date }>();
  for (const message of recentMessages) {
    if (!threads.has(message.clientId)) {
      threads.set(message.clientId, { client: message.client, body: message.body, createdAt: message.createdAt });
    }
  }
  const threadList = Array.from(threads.values());

  const selectedClientId = searchParams.clientId ?? threadList[0]?.client.id;
  const selectedThread = threadList.find((thread) => thread.client.id === selectedClientId);

  const messages = selectedClientId
    ? await prisma.whatsappMessage.findMany({
        where: { tenantId: user.tenantId, clientId: selectedClientId },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-base-100">Mensagens</h1>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr]" style={{ minHeight: '28rem' }}>
          <div className="border-b border-base-800 md:border-b-0 md:border-r">
            {threadList.length === 0 ? (
              <p className="p-4 text-sm text-base-500">
                Nenhuma conversa ainda. As mensagens aparecem aqui assim que um lembrete for enviado ou um cliente
                responder pelo WhatsApp.
              </p>
            ) : (
              <ul className="divide-y divide-base-800 max-h-[28rem] overflow-y-auto">
                {threadList.map((thread) => (
                  <li key={thread.client.id}>
                    <Link
                      href={`/dashboard/mensagens?clientId=${thread.client.id}`}
                      className={cn(
                        'block px-4 py-3 hover:bg-base-800/60',
                        thread.client.id === selectedClientId && 'bg-accent/10',
                      )}
                    >
                      <p className="truncate text-sm font-medium text-base-100">{thread.client.name}</p>
                      <p className="truncate text-xs text-base-500">{thread.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col">
            {!selectedThread ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-base-500">
                Selecione uma conversa.
              </div>
            ) : (
              <>
                <div className="border-b border-base-800 p-4">
                  <p className="font-medium text-base-100">{selectedThread.client.name}</p>
                  <p className="text-xs text-base-500">{selectedThread.client.whatsapp}</p>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {messages.map((message) => (
                    <div key={message.id} className={cn('flex', message.direction === 'OUT' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                          message.direction === 'OUT' ? 'bg-accent/20 text-base-100' : 'bg-base-800 text-base-200',
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <p className="mt-1 text-[10px] text-base-500">{timeFormatter.format(message.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form action={sendManualMessage} className="flex gap-2 border-t border-base-800 p-3">
                  <input type="hidden" name="clientId" value={selectedThread.client.id} />
                  <input
                    type="text"
                    name="text"
                    required
                    placeholder="Escreva uma mensagem…"
                    className="flex h-11 w-full rounded-xl border border-base-700 bg-base-900 px-4 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-accent"
                  />
                  <Button type="submit" size="sm">
                    Enviar
                  </Button>
                </form>
                <p className="px-3 pb-3 text-[11px] text-base-500">
                  Só é possível enviar mensagem livre até 24h depois da última mensagem recebida do cliente
                  (regra da Meta).
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
