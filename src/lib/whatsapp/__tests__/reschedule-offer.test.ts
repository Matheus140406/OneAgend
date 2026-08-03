import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { parseSlotSelection, handleRescheduleSelection, type ActiveRescheduleOffer } from '../reschedule-offer';
import type { ResolvedAppointment } from '../interactive';

describe('parseSlotSelection', () => {
  it('aceita numeros dentro do intervalo ofertado (1-based -> indice 0-based)', () => {
    expect(parseSlotSelection('1', 3)).toBe(0);
    expect(parseSlotSelection('3', 3)).toBe(2);
  });

  it('rejeita numero fora do intervalo', () => {
    expect(parseSlotSelection('4', 3)).toBeNull();
    expect(parseSlotSelection('0', 3)).toBeNull();
  });

  it('rejeita texto que nao e um numero', () => {
    expect(parseSlotSelection('confirmar', 3)).toBeNull();
  });
});

function appointment(overrides: Partial<ResolvedAppointment> = {}): ResolvedAppointment {
  return {
    id: 'appt_1',
    tenantId: 'tenant_1',
    professionalId: 'prof_1',
    serviceId: 'service_1',
    startsAt: new Date('2026-08-10T13:00:00Z'),
    endsAt: new Date('2026-08-10T13:30:00Z'),
    status: 'PENDING',
    tenant: { timezone: 'America/Sao_Paulo', locale: 'PT_BR' },
    client: { id: 'client_1', name: 'Ana', whatsapp: '+5511999999999', whatsappOptOut: false },
    service: { name: 'Corte', durationMinutes: 30 },
    ...overrides,
  };
}

function fakePrisma(overrides: { appointmentFindMany?: unknown[]; appointmentUpdate?: unknown } = {}): PrismaClient {
  const tx = {
    workingHour: { findMany: vi.fn().mockResolvedValue([{ startTime: '00:00', endTime: '23:59' }]) },
    timeOff: { findMany: vi.fn().mockResolvedValue([]) },
    appointment: {
      findMany: vi.fn().mockResolvedValue(overrides.appointmentFindMany ?? []),
      update: vi.fn().mockResolvedValue(overrides.appointmentUpdate ?? {}),
    },
  };
  return {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
    rescheduleOffer: { deleteMany: vi.fn().mockResolvedValue({}) },
    __tx: tx, // exposto so para inspecionar chamadas nos testes
  } as unknown as PrismaClient;
}

describe('handleRescheduleSelection', () => {
  it('reagenda para o horario escolhido e confirma', async () => {
    const prisma = fakePrisma();
    const offer: ActiveRescheduleOffer = {
      appointment: appointment(),
      slotsOffered: [new Date('2026-08-11T13:00:00Z'), new Date('2026-08-11T14:00:00Z')],
    };

    const message = await handleRescheduleSelection(prisma, offer, 0);

    expect(message).toContain('Ana');
    const tx = (prisma as unknown as { __tx: { appointment: { update: ReturnType<typeof vi.fn> } } }).__tx;
    expect(tx.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'appt_1' },
        data: expect.objectContaining({
          startsAt: new Date('2026-08-11T13:00:00Z'),
          endsAt: new Date('2026-08-11T13:30:00Z'),
          status: 'PENDING',
          reminder24hSentAt: null,
          reminder1hSentAt: null,
        }),
      }),
    );
  });

  it('avisa e limpa a oferta quando o horario escolhido nao esta mais livre', async () => {
    const prisma = fakePrisma({ appointmentFindMany: [{ id: 'outro_appt' }] });
    const offer: ActiveRescheduleOffer = {
      appointment: appointment(),
      slotsOffered: [new Date('2026-08-11T13:00:00Z')],
    };

    const message = await handleRescheduleSelection(prisma, offer, 0);

    expect(message).toBe(
      'No momento não há horários disponíveis nos próximos dias. Vamos avisar assim que abrir um novo horário.',
    );
    expect(prisma.rescheduleOffer.deleteMany).toHaveBeenCalledWith({ where: { appointmentId: 'appt_1' } });
  });
});
