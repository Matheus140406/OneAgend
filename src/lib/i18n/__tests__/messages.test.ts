import { describe, it, expect } from 'vitest';
import { t, SUPPORTED_LOCALES } from '../messages';

describe('t', () => {
  it('substitui os placeholders no template', () => {
    const message = t('PT_BR', 'confirmAck', { name: 'Ana', service: 'Corte', date: '10/08', time: '13:00' });
    expect(message).toBe('Prontinho, Ana! Seu horário de Corte no dia 10/08 às 13:00 está confirmado.');
  });

  it('todos os 5 idiomas suportados tem as mesmas chaves de mensagem', () => {
    const keys = [
      'confirmAck',
      'cancelAck',
      'rescheduleOffer',
      'rescheduleNoSlots',
      'unrecognizedReply',
      'waitlistSlotOpened',
      'waitlistAlreadyTaken',
    ] as const;
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of keys) {
        expect(t(locale, key, { name: 'x', service: 'y', date: 'z', time: 'w', slots: 's' })).not.toContain('{{');
      }
    }
  });

  it('cai para pt-BR se o locale for desconhecido', () => {
    // @ts-expect-error testando robustez contra valor invalido em runtime
    const message = t('KLINGON', 'unrecognizedReply');
    expect(message).toBe(t('PT_BR', 'unrecognizedReply'));
  });
});
