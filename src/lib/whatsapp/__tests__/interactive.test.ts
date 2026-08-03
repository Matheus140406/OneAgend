import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { parseInboundIntent, handleConfirmReply, handleCancelReply, type ResolvedAppointment } from '../interactive';

describe('parseInboundIntent', () => {
  it.each([
    ['1', 'CONFIRM'],
    ['confirmar', 'CONFIRM'],
    ['Confirm', 'CONFIRM'],
    ['confirmer', 'CONFIRM'],
    ['2', 'RESCHEDULE'],
    ['reagendar', 'RESCHEDULE'],
    ['Remarcar', 'RESCHEDULE'],
    ['reschedule', 'RESCHEDULE'],
    ['3', 'CANCEL'],
    ['cancelar', 'CANCEL'],
    ['Cancel', 'CANCEL'],
    ['annuler', 'CANCEL'],
  ])('reconhece "%s" como %s', (input, expected) => {
    expect(parseInboundIntent(input)).toBe(expected);
  });

  it('acentos e espacos extras nao atrapalham o reconhecimento', () => {
    expect(parseInboundIntent('  Confirmé  ')).toBe('CONFIRM');
  });

  it('texto nao reconhecido vira UNKNOWN', () => {
    expect(parseInboundIntent('oi tudo bem?')).toBe('UNKNOWN');
  });
});

function baseAppointment(overrides: Partial<ResolvedAppointment> = {}): ResolvedAppointment {
  return {
    id: 'appt_1',
    tenantId: 'tenant_1',
    professionalId: 'prof_1',
    serviceId: 'service_1',
    startsAt: new Date('2026-08-10T13:00:00Z'),
    status: 'PENDING',
    tenant: { timezone: 'America/Sao_Paulo', locale: 'PT_BR' },
    client: { id: 'client_1', name: 'Ana', whatsapp: '+5511999999999', whatsappOptOut: false },
    service: { name: 'Corte', durationMinutes: 30 },
    ...overrides,
  };
}

describe('handleConfirmReply', () => {
  it('confirma um agendamento PENDING e retorna a mensagem de confirmacao', async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = { appointment: { update } } as unknown as PrismaClient;

    const message = await handleConfirmReply(prisma, baseAppointment());

    expect(update).toHaveBeenCalledWith({ where: { id: 'appt_1' }, data: { status: 'CONFIRMED' } });
    expect(message).toContain('Ana');
    expect(message).toContain('Corte');
  });

  it('e idempotente: nao regrava status se ja estiver CONFIRMED', async () => {
    const update = vi.fn();
    const prisma = { appointment: { update } } as unknown as PrismaClient;

    await handleConfirmReply(prisma, baseAppointment({ status: 'CONFIRMED' }));

    expect(update).not.toHaveBeenCalled();
  });
});

describe('handleCancelReply', () => {
  beforeEach(() => {
    process.env.WHATSAPP_CLOUD_API_TOKEN = 'test-token';
    process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID = '123456';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WHATSAPP_CLOUD_API_TOKEN;
    delete process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID;
  });

  it('cancela o agendamento e notifica clientes elegiveis da fila de espera', async () => {
    const appointmentUpdate = vi.fn().mockResolvedValue({});
    const waitlistFindMany = vi.fn().mockResolvedValue([
      {
        id: 'wait_1',
        client: { id: 'c2', name: 'Bruno', whatsapp: '+5511988888888', whatsappOptOut: false },
      },
    ]);
    const waitlistUpdate = vi.fn().mockResolvedValue({});

    const prisma = {
      appointment: { update: appointmentUpdate },
      waitlistEntry: { findMany: waitlistFindMany, update: waitlistUpdate },
    } as unknown as PrismaClient;

    const result = await handleCancelReply(prisma, baseAppointment());

    expect(appointmentUpdate).toHaveBeenCalledWith({ where: { id: 'appt_1' }, data: { status: 'CANCELED' } });
    expect(result.ackMessage).toContain('Ana');
    expect(result.waitlistNotified).toBe(1);
    expect(waitlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'wait_1' }, data: expect.objectContaining({ status: 'NOTIFIED' }) }),
    );
  });

  it('pula clientes da fila que fizeram opt-out de mensagens automaticas', async () => {
    const waitlistFindMany = vi.fn().mockResolvedValue([
      { id: 'wait_1', client: { id: 'c2', name: 'Bruno', whatsapp: '+5511988888888', whatsappOptOut: true } },
    ]);
    const prisma = {
      appointment: { update: vi.fn().mockResolvedValue({}) },
      waitlistEntry: { findMany: waitlistFindMany, update: vi.fn() },
    } as unknown as PrismaClient;

    const result = await handleCancelReply(prisma, baseAppointment());

    expect(result.waitlistNotified).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});
