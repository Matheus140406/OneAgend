import type { Plan } from '@prisma/client';

interface PlanDetails {
  label: string;
  maxProfessionals: number | null;
  priceCents: number;
  description: string;
  /** null = sem teto de agendamentos por mes */
  maxAppointmentsPerMonth: number | null;
  hasWhatsappReminders: boolean;
  features: string[];
}

export const PLAN_DETAILS: Record<Plan, PlanDetails> = {
  BASICO: {
    label: 'Básico',
    maxProfessionals: 1,
    priceCents: 1420,
    description: '1 profissional',
    maxAppointmentsPerMonth: 100,
    hasWhatsappReminders: false,
    features: ['1 profissional', 'Até 100 agendamentos/mês', 'Agenda pública e painel'],
  },
  ELITE: {
    label: 'Elite',
    maxProfessionals: 5,
    priceCents: 4990,
    description: 'Até 5 profissionais',
    maxAppointmentsPerMonth: 500,
    hasWhatsappReminders: true,
    features: ['Até 5 profissionais', 'Até 500 agendamentos/mês', 'Lembrete automático por WhatsApp'],
  },
  PLATINA: {
    label: 'Platina',
    maxProfessionals: null,
    priceCents: 9990,
    description: 'Profissionais ilimitados',
    maxAppointmentsPerMonth: null,
    hasWhatsappReminders: true,
    features: ['Profissionais ilimitados', 'Agendamentos ilimitados', 'Lembrete automático por WhatsApp'],
  },
};

export const PLAN_ORDER: Plan[] = ['BASICO', 'ELITE', 'PLATINA'];

export function planAllowsProfessionalCount(plan: Plan, count: number): boolean {
  const max = PLAN_DETAILS[plan].maxProfessionals;
  return max === null || count <= max;
}
