import { z } from 'zod';
import { HttpClient, NamespacedCache } from '../core/http-client';
import { SchemaValidationError } from '@/core/schema-validation';

const REGISTRY_BASE = 'https://registry.npmjs.org';
const API_BASE = 'https://api.npmjs.org';

/**
 * Схемы покрывают только поля, которые реально используются.
 * npm registry возвращает гораздо больше данных — .passthrough()
 * пропускает остальное без ошибок валидации.
 */

const NpmSearchResultSchema = z
  .object({
    objects: z.array(
      z
        .object({
          package: z
            .object({
              name: z.string(),
              version: z.string(),
              description: z.string().optional(),
              date: z.string(),
            })
            .passthrough(),
          score: z.object({ final: z.number() }).passthrough(),
        })
        .passthrough()
    ),
    total: z.number(),
  })
  .passthrough();

const NpmPackageSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    'dist-tags': z.object({ latest: z.string() }).passthrough(),
    versions: z.record(z.string(), z.unknown()),
    time: z.record(z.string(), z.string()),
    maintainers: z.array(z.object({ name: z.string(), email: z.string().optional() })).optional(),
  })
  .passthrough();

const NpmDownloadsSchema = z
  .object({
    downloads: z.number(),
    start: z.string(),
    end: z.string(),
    package: z.string(),
  })
  .passthrough();

const NpmVersionsSchema = z
  .object({
    name: z.string(),
    versions: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export type NpmSearchResult = z.infer<typeof NpmSearchResultSchema>;
export type NpmPackage = z.infer<typeof NpmPackageSchema>;
export type NpmDownloads = z.infer<typeof NpmDownloadsSchema>;
export type NpmVersions = z.infer<typeof NpmVersionsSchema>;

function validate<T>(schema: z.ZodType<T>, data: unknown, url: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new SchemaValidationError(
      `Response from ${url} does not match expected schema: ${issues}`,
      url
    );
  }
  return result.data;
}

/**
 * Сервис для npm registry и npm download-stats API.
 * Зависимости (http, cache) приходят через конструктор — сервис не
 * наследует HTTP-логику, а использует переданный клиент. Это позволяет
 * в тестах подставить мок HttpClient без реальных сетевых вызовов.
 */
export class NpmService {
  constructor(
    private readonly http: HttpClient,
    private readonly cache: NamespacedCache
  ) {}

  async searchPackages(maintainer: string): Promise<NpmSearchResult> {
    const key = `search:maintainer:${maintainer}`;
    const cached = this.cache.get<NpmSearchResult>(key);
    if (cached) return cached;

    const url = `${REGISTRY_BASE}/-/v1/search?text=${encodeURIComponent(`maintainer:${maintainer}`)}&size=250`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(NpmSearchResultSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  async getPackage(name: string): Promise<NpmPackage> {
    const key = `package:${name}`;
    const cached = this.cache.get<NpmPackage>(key);
    if (cached) return cached;

    const url = `${REGISTRY_BASE}/${encodeURIComponent(name)}`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(NpmPackageSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  async getDownloads(name: string): Promise<NpmDownloads> {
    const key = `downloads:last-month:${name}`;
    const cached = this.cache.get<NpmDownloads>(key);
    if (cached) return cached;

    const url = `${API_BASE}/downloads/point/last-month/${encodeURIComponent(name)}`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(NpmDownloadsSchema, raw, url);

    // Загрузки за месяц меняются чаще метаданных пакета — короче TTL.
    this.cache.set(key, data, 15 * 60 * 1000);
    return data;
  }

  async getDownloadsRange(name: string, from: string, to: string): Promise<NpmDownloads> {
    const key = `downloads:${from}:${to}:${name}`;
    const cached = this.cache.get<NpmDownloads>(key);
    if (cached) return cached;

    const url = `${API_BASE}/downloads/point/${from}:${to}/${encodeURIComponent(name)}`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(NpmDownloadsSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  async getVersions(name: string): Promise<NpmVersions> {
    const key = `versions:${name}`;
    const cached = this.cache.get<NpmVersions>(key);
    if (cached) return cached;

    const url = `${REGISTRY_BASE}/${encodeURIComponent(name)}/versions`;
    const raw = await this.http.getJson<unknown>(url);
    const data = validate(NpmVersionsSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
