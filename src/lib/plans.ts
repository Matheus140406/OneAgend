import type { Plan } from '@prisma/client';

export const PLAN_DETAILS: Record<
  Plan,
  { label: string; maxProfessionals: number | null; priceCents: number; description: string }
> = {
  SOLO: {
    label: 'Solo',
    maxProfessionals: 1,
    priceCents: 4990,
    description: '1 profissional',
  },
  STUDIO: {
    label: 'Studio',
    maxProfessionals: 5,
    priceCents: 9990,
    description: 'Até 5 profissionais',
  },
  REDE: {
    label: 'Rede',
    maxProfessionals: null,
    priceCents: 19990,
    description: 'Profissionais ilimitados',
  },
};

export const PLAN_ORDER: Plan[] = ['SOLO', 'STUDIO', 'REDE'];

export function planAllowsProfessionalCount(plan: Plan, count: number): boolean {
  const max = PLAN_DETAILS[plan].maxProfessionals;
  return max === null || count <= max;
}
