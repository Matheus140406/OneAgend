import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BookingFlow } from '@/components/booking/booking-flow';
import { isSubscriptionUsable } from '@/lib/billing/subscription-status';

export const dynamic = 'force-dynamic';

export default async function AgendarPage({ params }: { params: { slug: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      subscription: { select: { status: true, trialEndsAt: true } },
      services: {
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, durationMinutes: true, priceCents: true },
      },
    },
  });

  if (!tenant) notFound();

  if (!tenant.subscription || !isSubscriptionUsable(tenant.subscription)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-base-950 px-6 text-center">
        <p className="font-display text-lg font-semibold text-base-100">Agenda indisponível</p>
        <p className="text-sm text-base-400">
          {tenant.name} não está com o agendamento online ativo no momento.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-base-950">
      <BookingFlow tenant={tenant} />
    </main>
  );
}
