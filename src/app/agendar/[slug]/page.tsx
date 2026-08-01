import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BookingFlow } from '@/components/booking/booking-flow';

export const dynamic = 'force-dynamic';

export default async function AgendarPage({ params }: { params: { slug: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      services: {
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, durationMinutes: true, priceCents: true },
      },
    },
  });

  if (!tenant) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-base-950">
      <BookingFlow tenant={tenant} />
    </main>
  );
}
