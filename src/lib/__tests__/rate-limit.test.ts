import { describe, it, expect } from 'vitest';
import { checkRateLimit, type RateLimitCounterStore } from '../rate-limit';

function createFakeStore(): RateLimitCounterStore {
  const counts = new Map<string, number>();
  return {
    async incrementAndGet(bucketKey) {
      const next = (counts.get(bucketKey) ?? 0) + 1;
      counts.set(bucketKey, next);
      return next;
    },
  };
}

describe('checkRateLimit', () => {
  it('permite requisicoes ate o limite', async () => {
    const store = createFakeStore();
    const config = { limit: 3, windowMs: 60_000 };
    const now = new Date('2026-01-01T00:00:00Z');

    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(store, 'ip:1.2.3.4', config, now);
      expect(result.allowed).toBe(true);
    }
  });

  it('bloqueia a partir da requisicao que excede o limite', async () => {
    const store = createFakeStore();
    const config = { limit: 3, windowMs: 60_000 };
    const now = new Date('2026-01-01T00:00:00Z');

    for (let i = 0; i < 3; i++) await checkRateLimit(store, 'ip:1.2.3.4', config, now);
    const fourth = await checkRateLimit(store, 'ip:1.2.3.4', config, now);

    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it('identificadores diferentes tem contadores independentes', async () => {
    const store = createFakeStore();
    const config = { limit: 1, windowMs: 60_000 };
    const now = new Date('2026-01-01T00:00:00Z');

    const a = await checkRateLimit(store, 'ip:1.1.1.1', config, now);
    const b = await checkRateLimit(store, 'ip:2.2.2.2', config, now);

    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it('janela seguinte reseta o contador', async () => {
    const store = createFakeStore();
    const config = { limit: 1, windowMs: 60_000 };
    const t0 = new Date('2026-01-01T00:00:00Z');
    const t1 = new Date(t0.getTime() + config.windowMs); // proxima janela

    const first = await checkRateLimit(store, 'ip:1.2.3.4', config, t0);
    const second = await checkRateLimit(store, 'ip:1.2.3.4', config, t0); // ainda na mesma janela
    const third = await checkRateLimit(store, 'ip:1.2.3.4', config, t1); // nova janela

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(third.allowed).toBe(true);
  });
});
