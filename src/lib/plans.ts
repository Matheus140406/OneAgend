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
  /** Recursos de planos superiores, mostrados riscados como incentivo de upgrade. */
  locked: string[];
}

export const PLAN_DETAILS: Record<Plan, PlanDetails> = {
  BASICO: {
    label: 'Básico',
    maxProfessionals: 1,
    priceCents: 1420,
    description: 'Para profissionais autônomos',
    maxAppointmentsPerMonth: 100,
    hasWhatsappReminders: false,
    features: [
      'Agenda pública (oneagend.com/agendar/slug)',
      'Anti-conflito de horário automático',
      'Login Google + e-mail',
      'Painel com agenda e clientes',
      '1 profissional',
      'Até 100 agendamentos/mês',
      'Teste grátis de 7 dias',
    ],
    locked: ['Lembretes via WhatsApp', 'Relatórios avançados'],
  },
  ELITE: {
    label: 'Elite',
    maxProfessionals: 5,
    priceCents: 4990,
    description: 'Para negócios em crescimento',
    maxAppointmentsPerMonth: 500,
    hasWhatsappReminders: true,
    features: [
      'Tudo do Básico',
      'Até 5 profissionais',
      'Até 500 agendamentos/mês',
      'Lembretes WhatsApp 24h e 1h antes',
      'Bot de confirmar/reagendar/cancelar',
      'Relatórios de agendamentos e receita',
    ],
    locked: [],
  },
  PLATINA: {
    label: 'Platina',
    maxProfessionals: null,
    priceCents: 9990,
    description: 'Para operações sem limite',
    maxAppointmentsPerMonth: null,
    hasWhatsappReminders: true,
    features: [
      'Tudo do Elite',
      'Profissionais ilimitados',
      'Agendamentos ilimitados',
      'Fila de espera com recuperação de no-show',
      'Mensagens manuais por WhatsApp',
      'Suporte prioritário',
    ],
    locked: [],
  },
};

export const PLAN_ORDER: Plan[] = ['BASICO', 'ELITE', 'PLATINA'];

export function planAllowsProfessionalCount(plan: Plan, count: number): boolean {
  const max = PLAN_DETAILS[plan].maxProfessionals;
  return max === null || count <= max;
}
