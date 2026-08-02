/**
 * Wrapper de `fetch` com retry e backoff exponencial, para chamadas a APIs
 * externas oficiais (Mercado Pago, WhatsApp Cloud API). So reexecuta falhas
 * transitorias: erro de rede, 429 (rate limit) e 5xx. Erros de 4xx que nao
 * sejam 429 (ex: 401, 400, 404) sao definitivos e nao adianta repetir.
 */

export interface FetchWithRetryOptions {
  maxAttempts?: number;
  /** Base do backoff exponencial, em ms. Tentativa N espera baseDelayMs * 2^(N-1), com jitter. */
  baseDelayMs?: number;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 300;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(input, init);

      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw error;
    }

    const jitter = Math.random() * 100;
    const delay = baseDelayMs * 2 ** (attempt - 1) + jitter;
    await sleep(delay);
  }

  // Inalcancavel na pratica (o loop sempre retorna ou lanca antes), mas
  // mantem o TypeScript feliz e cobre o caso de maxAttempts <= 0.
  throw lastError ?? new Error('fetchWithRetry: numero de tentativas invalido.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
