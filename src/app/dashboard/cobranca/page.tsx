import Link from 'next/link';
import { Zap, Star, Crown, Check, Lock, Shield } from 'lucide-react';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatPriceFromCents } from '@/lib/utils';
import { PLAN_DETAILS, PLAN_ORDER } from '@/lib/plans';
import { isTrialExpired, trialDaysRemaining } from '@/lib/billing/subscription-status';
import { buildBookingLink } from '@/lib/whatsapp/niche-templates';
import { changePlan, startCheckout } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  TRIALING: 'Período de teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento pendente',
  CANCELED: 'Cancelada',
};

const PLAN_ICON = { BASICO: Zap, ELITE: Star, PLATINA: Crown } as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; billing?: string };
}) {
  const user = await requireCurrentUser();

  const [subscription, tenant] = await Promise.all([
    prisma.subscription.findUnique({ where: { tenantId: user.tenantId } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId }, select: { slug: true } }),
  ]);
  const currentPlan = user.tenant.plan;
  const billing = searchParams.billing === 'anual' ? 'anual' : 'mensal';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-base-100">Planos</h1>
          <p className="mt-0.5 text-xs text-base-500">Cobrança recorrente via Mercado Pago · cancele quando quiser</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-base-850 p-1">
          <Link
            href="/dashboard/cobranca?billing=mensal"
            className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-all', billing === 'mensal' ? 'bg-accent text-accent-contrast' : 'text-base-500')}
          >
            Mensal
          </Link>
          <Link
            href="/dashboard/cobranca?billing=anual"
            className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-all', billing === 'anual' ? 'bg-accent text-accent-contrast' : 'text-base-500')}
          >
            Anual <span className="font-bold text-emerald-400">−20%</span>
          </Link>
        </div>
      </div>

      {searchParams.error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{searchParams.error}</p>
      )}
      {searchParams.success && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent">{searchParams.success}</p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Assinatura atual</CardTitle>
          <Badge variant={subscription?.status === 'ACTIVE' ? 'accent' : 'neutral'}>{STATUS_LABELS[subscription?.status ?? 'TRIALING']}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-base-100">{PLAN_DETAILS[currentPlan].label}</p>
            <p className="text-sm text-base-500">
              {PLAN_DETAILS[currentPlan].description} · {formatPriceFromCents(PLAN_DETAILS[currentPlan].priceCents)}/mês
            </p>
          </div>

          {subscription?.status === 'TRIALING' &&
            (isTrialExpired(subscription) ? (
              <p className="text-sm text-danger">Seu teste grátis de 7 dias acabou. Assine para reativar a agenda pública.</p>
            ) : (
              <p className="text-sm text-base-500">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const details = PLAN_DETAILS[plan];
          const Icon = PLAN_ICON[plan];
          const isCurrent = plan === currentPlan;
          const displayPriceCents = billing === 'mensal' ? details.priceCents : Math.round(details.priceCents * 0.8);

          return (
            <div
              key={plan}
              className={cn(
                'relative flex flex-col overflow-hidden rounded-niche p-6 transition-all',
                isCurrent ? 'border border-accent/50 bg-accent/[0.08] shadow-niche' : 'border border-white/[0.06] bg-base-900 shadow-niche',
              )}
            >
              {isCurrent && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />}

              <div className="mb-2 flex items-center gap-2">
                <Icon size={16} className={isCurrent ? 'text-accent' : 'text-base-500'} />
                <h3 className="text-base font-bold text-base-100">{details.label}</h3>
                {isCurrent && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-contrast">Atual</span>}
              </div>
              <p className="mb-5 text-xs text-base-500">{details.description}</p>

              <div className="mb-1">
                <span className="font-display text-4xl font-black tracking-tight text-base-100">{formatPriceFromCents(displayPriceCents)}</span>
                <span className="ml-1 text-xs text-base-500">/mês</span>
              </div>
              <p className="mb-5 text-xs font-semibold text-accent">
                {details.maxAppointmentsPerMonth === null ? 'Agendamentos ilimitados' : `Até ${details.maxAppointmentsPerMonth} agendamentos/mês`}
              </p>

              <div className="mb-5 flex-1 space-y-2">
                {details.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                    <span className="text-xs text-base-100">{feature}</span>
                  </div>
                ))}
                {details.locked.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 opacity-35">
                    <Lock size={11} className="mt-0.5 shrink-0 text-base-500" />
                    <span className="text-xs text-base-500 line-through">{feature}</span>
                  </div>
                ))}
              </div>

              {billing === 'anual' ? (
                <Button type="button" disabled variant="outline" className="w-full">
                  Cobrança anual em breve
                </Button>
              ) : isCurrent ? (
                <Button type="button" disabled className="w-full">
                  <Check size={14} /> Plano Ativo
                </Button>
              ) : (
                <form action={changePlan}>
                  <input type="hidden" name="plan" value={plan} />
                  <Button type="submit" variant="secondary" className="w-full">
                    Assinar {details.label}
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <div className="flex items-start gap-4 px-5 py-4">
          <Shield size={16} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-semibold text-base-100">Teste grátis de 7 dias — sem cartão</p>
            <p className="mt-1 text-xs text-base-500">
              Ao vencer sem assinatura ativa, a agenda pública{' '}
              <span className="font-mono text-accent">{buildBookingLink(tenant.slug)}</span> é bloqueada automaticamente. Seus dados ficam
              íntegros e podem ser reativados a qualquer momento.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
