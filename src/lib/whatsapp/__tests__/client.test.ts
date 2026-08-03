import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWhatsappTemplateMessage } from '../client';

function withEnv() {
  process.env.WHATSAPP_CLOUD_API_TOKEN = 'test-token';
  process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID = '123456';
}

describe('sendWhatsappTemplateMessage', () => {
  beforeEach(() => {
    withEnv();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WHATSAPP_CLOUD_API_TOKEN;
    delete process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID;
  });

  it('limpa numero formatado (espacos, parenteses, hifen) antes de enviar', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }));

    await sendWhatsappTemplateMessage({
      to: '+55 (11) 99999-9999',
      templateName: 'lembrete_agendamento',
      bodyParameters: ['Ana', 'Corte', '10:00'],
    });

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.to).toBe('5511999999999');
  });

  it('nao inclui o componente body quando nao ha parametros', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }));

    await sendWhatsappTemplateMessage({
      to: '+5511999999999',
      templateName: 'sem_variaveis',
      bodyParameters: [],
    });

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.template.components).toBeUndefined();
  });

  it('inclui o componente body quando ha parametros', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }));

    await sendWhatsappTemplateMessage({
      to: '+5511999999999',
      templateName: 'lembrete_agendamento',
      bodyParameters: ['Ana'],
    });

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.template.components).toEqual([{ type: 'body', parameters: [{ type: 'text', text: 'Ana' }] }]);
  });

  it('extrai a mensagem de erro do JSON da Meta em vez do corpo cru', async () => {
    const metaError = JSON.stringify({ error: { message: 'Unsupported phone number', code: 100 } });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(metaError, { status: 400 }));

    const result = await sendWhatsappTemplateMessage({
      to: '+5511999999999',
      templateName: 'lembrete_agendamento',
      bodyParameters: ['Ana'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported phone number');
  });

  it('cai para o corpo cru quando a resposta de erro nao e JSON valido', async () => {
    // status 400 (nao retryable) para nao envolver a logica de retry deste teste
    vi.mocked(fetch).mockResolvedValueOnce(new Response('bad request', { status: 400 }));

    const result = await sendWhatsappTemplateMessage({
      to: '+5511999999999',
      templateName: 'lembrete_agendamento',
      bodyParameters: ['Ana'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('bad request');
  });

  it('numero sem nenhum digito e rejeitado sem chamar a API', async () => {
    const result = await sendWhatsappTemplateMessage({
      to: '+++',
      templateName: 'lembrete_agendamento',
      bodyParameters: ['Ana'],
    });

    expect(result.success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
