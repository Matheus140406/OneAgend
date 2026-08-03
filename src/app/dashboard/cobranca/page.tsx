import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatPriceFromCents } from '@/lib/utils';
import { PLAN_DETAILS, PLAN_ORDER } from '@/lib/plans';
import { isTrialExpired, trialDaysRemaining } from '@/lib/billing/subscription-status';
import { changePlan, startCheckout } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  TRIALING: 'Período de teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento pendente',
  CANCELED: 'Cancelada',
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const user = await requireCurrentUser();

  const subscription = await prisma.subscription.findUnique({ where: { tenantId: user.tenantId } });
  const currentPlan = user.tenant.plan;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-base-100">Cobrança</h1>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}
      {searchParams.success && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          {searchParams.success}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assinatura atual</CardTitle>
          <Badge variant={subscription?.status === 'ACTIVE' ? 'accent' : 'neutral'}>
            {STATUS_LABELS[subscription?.status ?? 'TRIALING']}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-base-100">{PLAN_DETAILS[currentPlan].label}</p>
            <p className="text-sm text-base-400">
              {PLAN_DETAILS[currentPlan].description} · {formatPriceFromCents(PLAN_DETAILS[currentPlan].priceCents)}/mês
            </p>
          </div>

          {subscription?.status === 'TRIALING' &&
            (isTrialExpired(subscription) ? (
              <p className="text-sm text-danger">
                Seu teste grátis de 7 dias acabou. Assine para reativar a agenda pública.
              </p>
            ) : (
              <p className="text-sm text-base-400">
                Você está no teste grátis de 7 dias —{' '}
                <span className="font-medium text-base-200">
                  {trialDaysRemaining(subscription)} dia{trialDaysRemaining(subscription) === 1 ? '' : 's'} restante
                  {trialDaysRemaining(subscription) === 1 ? '' : 's'}
                </span>
                . Assine quando quiser para não perder o acesso depois.
              </p>
            ))}

          <form action={startCheckout}>
            <Button type="submit" size="lg">
              {subscription?.mercadoPagoPreapprovalId ? 'Atualizar pagamento' : 'Iniciar cobrança'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar de plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PLAN_ORDER.map((plan) => (
              <form key={plan} action={changePlan}>
                <input type="hidden" name="plan" value={plan} />
                <button
                  type="submit"
                  className={cn(
                    'flex w-full flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors',
                    plan === currentPlan ? 'border-accent bg-accent/10' : 'border-base-800 bg-base-900 hover:border-base-700',
                  )}
                >
                  <span className="font-display text-sm font-semibold text-base-100">{PLAN_DETAILS[plan].label}</span>
                  <span className="text-xs font-medium text-accent">
                    {formatPriceFromCents(PLAN_DETAILS[plan].priceCents)}/mês
                  </span>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {PLAN_DETAILS[plan].features.map((feature) => (
                      <li key={feature} className="text-xs text-base-400">
                        · {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              </form>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
