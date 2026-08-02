import { describe, it, expect } from 'vitest';
import { isSubscriptionUsable, isTrialExpired, trialDaysRemaining, computeTrialEndsAt } from '../subscription-status';

const NOW = new Date('2026-08-10T12:00:00Z');

describe('subscription-status', () => {
  it('assinatura ACTIVE e sempre utilizavel, mesmo sem trialEndsAt', () => {
    expect(isSubscriptionUsable({ status: 'ACTIVE', trialEndsAt: null }, NOW)).toBe(true);
  });

  it('TRIALING com prazo no futuro e utilizavel', () => {
    const trialEndsAt = new Date(NOW.getTime() + 60_000);
    expect(isSubscriptionUsable({ status: 'TRIALING', trialEndsAt }, NOW)).toBe(true);
    expect(isTrialExpired({ status: 'TRIALING', trialEndsAt }, NOW)).toBe(false);
  });

  it('TRIALING com prazo vencido nao e utilizavel', () => {
    const trialEndsAt = new Date(NOW.getTime() - 60_000);
    expect(isSubscriptionUsable({ status: 'TRIALING', trialEndsAt }, NOW)).toBe(false);
    expect(isTrialExpired({ status: 'TRIALING', trialEndsAt }, NOW)).toBe(true);
  });

  it('PAST_DUE e CANCELED nunca sao utilizaveis', () => {
    expect(isSubscriptionUsable({ status: 'PAST_DUE', trialEndsAt: null }, NOW)).toBe(false);
    expect(isSubscriptionUsable({ status: 'CANCELED', trialEndsAt: null }, NOW)).toBe(false);
  });

  it('trialDaysRemaining arredonda para cima e nunca fica negativo', () => {
    const trialEndsAt = new Date(NOW.getTime() + 25 * 60 * 60 * 1000); // 25h a frente
    expect(trialDaysRemaining({ status: 'TRIALING', trialEndsAt }, NOW)).toBe(2);

    const expired = new Date(NOW.getTime() - 60_000);
    expect(trialDaysRemaining({ status: 'TRIALING', trialEndsAt: expired }, NOW)).toBe(0);
  });

  it('computeTrialEndsAt soma 7 dias', () => {
    const end = computeTrialEndsAt(NOW);
    expect(end.getTime() - NOW.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
