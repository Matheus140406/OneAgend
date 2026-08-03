import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyMetaSignature, verifyWebhookHandshake } from '../webhook-security';

describe('verifyWebhookHandshake', () => {
  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'meu-token-secreto';
  });
  afterEach(() => {
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  });

  it('aceita mode=subscribe com o token correto', () => {
    expect(verifyWebhookHandshake('subscribe', 'meu-token-secreto')).toBe(true);
  });

  it('rejeita token incorreto', () => {
    expect(verifyWebhookHandshake('subscribe', 'token-errado')).toBe(false);
  });

  it('rejeita mode diferente de subscribe', () => {
    expect(verifyWebhookHandshake('unsubscribe', 'meu-token-secreto')).toBe(false);
  });

  it('rejeita quando a variavel de ambiente nao esta configurada', () => {
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    expect(verifyWebhookHandshake('subscribe', 'qualquer-coisa')).toBe(false);
  });
});

describe('verifyMetaSignature', () => {
  const secret = 'app-secret-de-teste';

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = secret;
  });
  afterEach(() => {
    delete process.env.WHATSAPP_APP_SECRET;
  });

  function sign(body: string): string {
    return `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;
  }

  it('aceita uma assinatura valida', () => {
    const body = JSON.stringify({ hello: 'world' });
    expect(verifyMetaSignature(body, sign(body))).toBe(true);
  });

  it('rejeita quando o corpo foi alterado apos assinar', () => {
    const body = JSON.stringify({ hello: 'world' });
    const signature = sign(body);
    expect(verifyMetaSignature(JSON.stringify({ hello: 'mundo' }), signature)).toBe(false);
  });

  it('rejeita header ausente', () => {
    expect(verifyMetaSignature('{}', null)).toBe(false);
  });

  it('rejeita header sem o prefixo sha256=', () => {
    expect(verifyMetaSignature('{}', 'abcdef')).toBe(false);
  });

  it('rejeita quando o app secret nao esta configurado', () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const body = '{}';
    expect(verifyMetaSignature(body, sign(body))).toBe(false);
  });
});
