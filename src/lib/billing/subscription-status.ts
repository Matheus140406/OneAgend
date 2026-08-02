import type { SubscriptionStatus } from '@prisma/client';

export const TRIAL_DAYS = 7;

export function computeTrialEndsAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export interface SubscriptionLike {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
}

/**
 * Se falso, o negocio nao deve conseguir receber novos agendamentos nem usar
 * o painel normalmente: assinatura paga inativa e o teste gratis (se houver)
 * ja venceu.
 */
export function isSubscriptionUsable(subscription: SubscriptionLike, now: Date = new Date()): boolean {
  if (subscription.status === 'ACTIVE') return true;
  if (subscription.status === 'TRIALING') {
    return !subscription.trialEndsAt || subscription.trialEndsAt.getTime() > now.getTime();
  }
  return false; // PAST_DUE ou CANCELED
}

export function isTrialExpired(subscription: SubscriptionLike, now: Date = new Date()): boolean {
  return subscription.status === 'TRIALING' && !!subscription.trialEndsAt && subscription.trialEndsAt.getTime() <= now.getTime();
}

export function trialDaysRemaining(subscription: SubscriptionLike, now: Date = new Date()): number {
  if (subscription.status !== 'TRIALING' || !subscription.trialEndsAt) return 0;
  const msRemaining = subscription.trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
}
