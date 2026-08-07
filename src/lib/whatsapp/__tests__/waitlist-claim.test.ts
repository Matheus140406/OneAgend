import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { resolveActiveWaitlistClaim, handleWaitlistClaimReply, CLAIM_KEYWORDS, type ActiveWaitlistClaim } from '../waitlist-claim';

describe('CLAIM_KEYWORDS', () => {
  it('reconhece "sim" nos 4 idiomas suportados pela palavra-chave', () => {
    expect(CLAIM_KEYWORDS.has('sim')).toBe(true);
    expect(CLAIM_KEYWORDS.has('yes')).toBe(true);
    expect(CLAIM_KEYWORDS.has('oui')).toBe(true);
    expect(CLAIM_KEYWORDS.has('si')).toBe(true);
  });
});

describe('resolveActiveWaitlistClaim', () => {
  it('retorna null quando nao ha entrada NOTIFIED valida', async () => {
    const prisma = { waitlistEntry: { findFirst: vi.fn().mockResolvedValue(null) } } as unknown as PrismaClient;
    expect(await resolveActiveWaitlistClaim(prisma, '+5511999999999')).toBeNull();
  });

  it('retorna null se a entrada nao tem o horario ofertado preenchido', async () => {
    const prisma = {
      waitlistEntry: {
        findFirst: vi.fn().mockResolvedValue({ id: 'w1', offeredStartsAt: null, offeredEndsAt: null, offeredProfessionalId: null }),
      },
    } as unknown as PrismaClient;
    expect(await resolveActiveWaitlistClaim(prisma, '+5511999999999')).toBeNull();
  });
});

function claim(overrides: Partial<ActiveWaitlistClaim> = {}): ActiveWaitlistClaim {
  return {
    id: 'wait_1',
    tenantId: 'tenant_1',
    serviceId: 'service_1',
    clientId: 'client_2',
    offeredProfessionalId: 'prof_1',
    offeredStartsAt: new Date('2026-08-10T13:00:00Z'),
    offeredEndsAt: new Date('2026-08-10T13:30:00Z'),
    tenant: { timezone: 'America/Sao_Paulo', locale: 'PT_BR' },
    client: { name: 'Bruno', whatsapp: '+5511988888888' },
    service: { name: 'Corte' },
    ...overrides,
  };
}

function fakePrisma(opts: { alreadyTaken?: boolean; conflict?: boolean } = {}): PrismaClient {
  const tx = {
    workingHour: { findMany: vi.fn().mockResolvedValue([{ startTime: '00:00', endTime: '23:59' }]) },
    timeOff: { findMany: vi.fn().mockResolvedValue([]) },
    appointment: {
      findMany: vi.fn().mockResolvedValue(opts.conflict ? [{ id: 'outro' }] : []),
      create: vi.fn().mockResolvedValue({ id: 'new_appt' }),
    },
  };
  return {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(tx),
    waitlistEntry: {
      findFirst: vi.fn().mockResolvedValue(opts.alreadyTaken ? { id: 'outra_entrada' } : null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    __tx: tx,
  } as unknown as PrismaClient;
}

describe('handleWaitlistClaimReply', () => {
  it('reserva o horario e marca a entrada como BOOKED', async () => {
    const prisma = fakePrisma();
    const message = await handleWaitlistClaimReply(prisma, claim());

    expect(message).toContain('Bruno');
    expect(prisma.waitlistEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'wait_1', status: 'NOTIFIED' },
      data: { status: 'BOOKED' },
    });
  });

  it('avisa que a vaga ja foi preenchida quando outra entrada ja reservou o mesmo horario', async () => {
    const prisma = fakePrisma({ alreadyTaken: true });
    const message = await handleWaitlistClaimReply(prisma, claim());

    expect(message).toContain('essa vaga acabou de ser preenchida');
    expect(prisma.waitlistEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'wait_1', status: 'NOTIFIED' },
      data: { status: 'EXPIRED' },
    });
    const tx = (prisma as unknown as { __tx: { appointment: { create: ReturnType<typeof vi.fn> } } }).__tx;
    expect(tx.appointment.create).not.toHaveBeenCalled();
  });

  it('avisa e expira a entrada quando a criacao do agendamento conflita (corrida entre dois SIM)', async () => {
    const prisma = fakePrisma({ conflict: true });
    const message = await handleWaitlistClaimReply(prisma, claim());

    expect(message).toContain('essa vaga acabou de ser preenchida');
    expect(prisma.waitlistEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'wait_1', status: 'NOTIFIED' },
      data: { status: 'EXPIRED' },
    });
  });
});
