import type { PrismaClient } from '@prisma/client';

/**
 * Rate limiting por janela fixa, com o contador persistido (Postgres via
 * Prisma) em vez de memória do processo — necessário porque a Vercel roda
 * várias instâncias serverless isoladas; um limitador em memória não
 * enxergaria requisições atendidas por outra instância.
 */

export interface RateLimitCounterStore {
  /** Incrementa o contador do bucket e retorna o valor apos o incremento. */
  incrementAndGet(bucketKey: string): Promise<number>;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

function getWindowBucket(now: Date, windowMs: number): number {
  return Math.floor(now.getTime() / windowMs);
}

export async function checkRateLimit(
  store: RateLimitCounterStore,
  identifier: string,
  config: RateLimitConfig,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const bucket = getWindowBucket(now, config.windowMs);
  const bucketKey = `${identifier}:${bucket}`;
  const count = await store.incrementAndGet(bucketKey);
  return { allowed: count <= config.limit, remaining: Math.max(0, config.limit - count) };
}

export function createPrismaRateLimitStore(prisma: PrismaClient): RateLimitCounterStore {
  return {
    async incrementAndGet(bucketKey: string): Promise<number> {
      const hit = await prisma.rateLimitHit.upsert({
        where: { key: bucketKey },
        create: { key: bucketKey, count: 1 },
        update: { count: { increment: 1 } },
        select: { count: true },
      });
      return hit.count;
    },
  };
}

/** Vercel/proxies expõem o IP real do cliente nesse header; pega o primeiro da lista. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}
