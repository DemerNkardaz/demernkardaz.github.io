export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | undefined,
    public readonly url: string,
    public readonly body?: unknown,
    public readonly headers?: Headers
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Ошибка сети/таймаута — нет ответа от сервера вообще. */
  static isNetworkError(error: unknown): error is ApiError {
    return error instanceof ApiError && error.status === undefined;
  }

  /** Превышен rate limit — стоит retry с задержкой. */
  get isRateLimited(): boolean {
    return this.status === 429 || this.status === 403;
  }

  /** Временная проблема на сервере или сети — стоит retry. */
  get isRetryable(): boolean {
    return this.status === undefined || this.status === 429 || this.status >= 500;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export interface HttpClientOptions {
  headers?: Record<string, string>;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

export class HttpClient {
  private readonly headers: Record<string, string>;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(options: HttpClientOptions = {}) {
    this.headers = options.headers ?? {};
    this.maxRetries = options.maxRetries ?? 3;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 500;
  }

  async getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    let lastError: ApiError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.doFetch<T>(url, init);
      } catch (error) {
        if (!(error instanceof ApiError) || !error.isRetryable || attempt === this.maxRetries) {
          throw error;
        }
        lastError = error;
        await this.delay(this.computeBackoffMs(error, attempt));
      }
    }

    // Сюда не дойдём (последняя итерация либо вернёт, либо бросит), но TS требует return.
    throw lastError;
  }

  private async doFetch<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        headers: { ...this.headers, ...init.headers },
      });
    } catch (cause) {
      // Сетевая ошибка: DNS, обрыв соединения, таймаут — status undefined.
      throw new ApiError(
        `Network error while requesting ${url}: ${(cause as Error).message}`,
        undefined,
        url
      );
    }

    if (!response.ok) {
      const body = await this.safeParseBody(response);
      throw new ApiError(
        `Request failed (${response.status} ${response.statusText})`,
        response.status,
        url,
        body,
        response.headers
      );
    }

    return response.json() as Promise<T>;
  }

  private async safeParseBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  /**
   * Учитывает Retry-After (стандартный для 429) и X-RateLimit-Reset
   * (GitHub-style, unix timestamp в секундах). Если заголовков нет —
   * экспоненциальный backoff с джиттером.
   */
  private computeBackoffMs(error: ApiError, attempt: number): number {
    const exponential = this.retryBaseDelayMs * 2 ** attempt + Math.random() * 100;

    const retryAfter = error.headers?.get('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds)) return Math.max(seconds * 1000, exponential);
    }

    const rateLimitReset = error.headers?.get('x-ratelimit-reset');
    if (rateLimitReset && error.isRateLimited) {
      const resetAtMs = Number(rateLimitReset) * 1000;
      const waitMs = resetAtMs - Date.now();
      if (waitMs > 0) return Math.max(waitMs, exponential);
    }

    return exponential;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheStore {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 60 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) });
  }

  clearNamespace(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export class NamespacedCache {
  constructor(
    private readonly store: CacheStore,
    private readonly namespace: string
  ) {}

  private prefixed(key: string): string {
    return `${this.namespace}:${key}`;
  }

  get<T>(key: string): T | undefined {
    return this.store.get<T>(this.prefixed(key));
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.store.set(this.prefixed(key), value, ttlMs);
  }

  clear(): void {
    this.store.clearNamespace(`${this.namespace}:`);
  }
}
