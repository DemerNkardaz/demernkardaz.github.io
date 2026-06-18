import { z } from 'zod';
import { HttpClient, NamespacedCache } from '../core/http-client';
import { SchemaValidationError } from '@/core/schema-validation';

const REGISTRY_BASE = 'https://registry.npmjs.org';

/**
 * Схемы покрывают только поля, которые реально используются.
 * npm registry возвращает гораздо больше данных — .loose()
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
            .loose(),
          downloads: z
            .object({
              monthly: z.number(),
              weekly: z.number(),
            })
            .optional(),
          score: z.object({ final: z.number() }).loose(),
        })
        .loose()
    ),
    total: z.number(),
  })
  .loose();

const NpmPackageSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    'dist-tags': z.object({ latest: z.string() }).loose(),
    versions: z.record(z.string(), z.unknown()),
    time: z.record(z.string(), z.string()),
    maintainers: z.array(z.object({ name: z.string(), email: z.string().optional() })).optional(),
    keywords: z.array(z.string()).optional(),
    downloads: z.object({ monthly: z.number() }).optional(),
  })
  .passthrough();

const NpmVersionsSchema = z
  .object({
    name: z.string(),
    versions: z.record(z.string(), z.unknown()),
  })
  .loose();

export type NpmSearchResult = z.infer<typeof NpmSearchResultSchema>;
export type NpmPackage = z.infer<typeof NpmPackageSchema>;
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

  clearCache(): void {
    this.cache.clear();
  }
}
