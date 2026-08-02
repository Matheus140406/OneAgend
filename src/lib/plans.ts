import type { Plan } from '@prisma/client';

export const PLAN_DETAILS: Record<
  Plan,
  { label: string; maxProfessionals: number | null; priceCents: number; description: string }
> = {
  BASICO: {
    label: 'Básico',
    maxProfessionals: 1,
    priceCents: 1420,
    description: '1 profissional',
  },
  ELITE: {
    label: 'Elite',
    maxProfessionals: 5,
    priceCents: 4990,
    description: 'Até 5 profissionais',
  },
  PLATINA: {
    label: 'Platina',
    maxProfessionals: null,
    priceCents: 9990,
    description: 'Profissionais ilimitados',
  },
};

export const PLAN_ORDER: Plan[] = ['BASICO', 'ELITE', 'PLATINA'];

export function planAllowsProfessionalCount(plan: Plan, count: number): boolean {
  const max = PLAN_DETAILS[plan].maxProfessionals;
  return max === null || count <= max;
}
