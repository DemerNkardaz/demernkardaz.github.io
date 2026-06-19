import { ApiError } from './http-client';

export interface JsonpClientOptions {
  paramName?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

let callbackSeq = 0;

export class JsonpClient {
  private readonly paramName: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(options: JsonpClientOptions = {}) {
    this.paramName = options.paramName ?? 'callback';
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 500;
  }

  async getJson<T>(url: string): Promise<T> {
    let lastError: ApiError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.requestOnce<T>(url);
      } catch (error) {
        if (!(error instanceof ApiError) || !error.isRetryable || attempt === this.maxRetries) {
          throw error;
        }
        lastError = error;
        await this.delay(this.retryBaseDelayMs * 2 ** attempt + Math.random() * 100);
      }
    }

    throw lastError;
  }

  private requestOnce<T>(url: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const callbackName = `__jsonp_cb_${Date.now()}_${callbackSeq++}`;
      const script = document.createElement('script');
      let timer: ReturnType<typeof setTimeout> | undefined;
      let settled = false;

      const cleanup = () => {
        delete (window as unknown as Record<string, unknown>)[callbackName];
        script.remove();
        if (timer !== undefined) clearTimeout(timer);
      };

      const settle = (action: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        action();
      };

      (window as unknown as Record<string, unknown>)[callbackName] = (data: T) => {
        settle(() => resolve(data));
      };

      timer = setTimeout(() => {
        settle(() =>
          reject(
            new ApiError(
              `JSONP-запрос к ${url} не дождался ответа за ${this.timeoutMs}мс`,
              undefined,
              url
            )
          )
        );
      }, this.timeoutMs);

      script.onerror = () => {
        settle(() =>
          reject(new ApiError(`Не удалось загрузить JSONP-скрипт: ${url}`, undefined, url))
        );
      };

      const separator = url.includes('?') ? '&' : '?';
      script.src = `${url}${separator}${this.paramName}=${encodeURIComponent(callbackName)}`;
      document.head.appendChild(script);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
