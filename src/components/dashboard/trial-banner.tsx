import Link from 'next/link';
import type { Subscription } from '@prisma/client';
import { isTrialExpired, trialDaysRemaining } from '@/lib/billing/subscription-status';
import { cn } from '@/lib/utils';

export function TrialBanner({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) return null;

  if (subscription.status === 'TRIALING') {
    const expired = isTrialExpired(subscription);
    const daysLeft = trialDaysRemaining(subscription);

    return (
      <Banner tone={expired ? 'danger' : 'accent'}>
        {expired
          ? 'Seu teste grátis de 7 dias acabou. Assine um plano para continuar recebendo agendamentos.'
          : `Teste grátis: ${daysLeft} dia${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}.`}{' '}
        <Link href="/dashboard/cobranca" className="font-medium underline underline-offset-2">
          {expired ? 'Assinar agora' : 'Assinar'}
        </Link>
      </Banner>
    );
  }

  if (subscription.status === 'PAST_DUE') {
    return (
      <Banner tone="warn">
        Pagamento da assinatura pendente.{' '}
        <Link href="/dashboard/cobranca" className="font-medium underline underline-offset-2">
          Verificar cobrança
        </Link>
      </Banner>
    );
  }

  if (subscription.status === 'CANCELED') {
    return (
      <Banner tone="danger">
        Sua assinatura foi cancelada e a agenda pública está indisponível para novos clientes.{' '}
        <Link href="/dashboard/cobranca" className="font-medium underline underline-offset-2">
          Reativar
        </Link>
      </Banner>
    );
  }

  return null;
}

function Banner({ tone, children }: { tone: 'accent' | 'warn' | 'danger'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'px-4 py-2 text-center text-sm md:px-6',
        tone === 'accent' && 'bg-accent/10 text-accent',
        tone === 'warn' && 'bg-warn/10 text-warn',
        tone === 'danger' && 'bg-danger/10 text-danger',
      )}
    >
      {children}
    </div>
  );
}
