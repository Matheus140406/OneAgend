import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../fetch-with-retry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retorna direto quando a primeira tentativa da certo', async () => {
    const ok = new Response('ok', { status: 200 });
    vi.mocked(fetch).mockResolvedValueOnce(ok);

    const response = await fetchWithRetry('https://example.com', {}, { baseDelayMs: 1 });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('tenta de novo em 429 e da certo na segunda vez', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await fetchWithRetry('https://example.com', {}, { baseDelayMs: 1 });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('nao tenta de novo em erro 4xx que nao seja 429', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('bad request', { status: 400 }));

    const response = await fetchWithRetry('https://example.com', {}, { baseDelayMs: 1 });

    expect(response.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('desiste apos maxAttempts em falhas 5xx repetidas', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('boom', { status: 503 }));

    const response = await fetchWithRetry('https://example.com', {}, { baseDelayMs: 1, maxAttempts: 3 });

    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('relanca o erro de rede apos esgotar as tentativas', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));

    await expect(
      fetchWithRetry('https://example.com', {}, { baseDelayMs: 1, maxAttempts: 2 }),
    ).rejects.toThrow('network down');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
