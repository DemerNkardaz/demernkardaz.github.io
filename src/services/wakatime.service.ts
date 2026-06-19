import { z } from 'zod';
import { NamespacedCache } from '../core/http-client';
import { SchemaValidationError } from '@/core/schema-validation';

const SHARE_BASE = 'https://wakatime.com/share';

function buildShareUrl(username: string, shareId: string): string {
  return `${SHARE_BASE}/@${encodeURIComponent(username)}/${encodeURIComponent(shareId)}.json`;
}

export interface WakatimeTransport {
  getJson<T>(url: string): Promise<T>;
}

const WakatimeBestDaySchema = z
  .object({
    date: z.string(),
    text: z.string(),
    total_seconds: z.number(),
  })
  .loose();

const WakatimeGrandTotalSchema = z
  .object({
    daily_average: z.number(),
    daily_average_including_other_language: z.number(),
    human_readable_daily_average: z.string(),
    human_readable_total: z.string(),
    total_seconds: z.number(),
    total_seconds_including_other_language: z.number(),
  })
  .loose();

const WakatimeRangeSchema = z
  .object({
    start: z.string(),
    end: z.string(),
    range: z.string(),
  })
  .loose();

const WakatimeCodingActivitySchema = z
  .object({
    data: z
      .object({
        best_day: WakatimeBestDaySchema,
        grand_total: WakatimeGrandTotalSchema,
        range: WakatimeRangeSchema,
      })
      .loose(),
  })
  .loose();

const WakatimeLanguageSchema = z
  .object({
    name: z.string(),
    color: z.string(),
    percent: z.number(),
    text: z.string(),
    hours: z.number(),
    minutes: z.number(),
    total_seconds: z.number(),
  })
  .loose();

const WakatimeLanguagesSchema = z
  .object({
    data: z.array(WakatimeLanguageSchema),
  })
  .loose();

export type WakatimeCodingActivity = z.infer<typeof WakatimeCodingActivitySchema>;
export type WakatimeLanguage = z.infer<typeof WakatimeLanguageSchema>;
export type WakatimeLanguages = z.infer<typeof WakatimeLanguagesSchema>;

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

export class WakatimeService {
  constructor(
    private readonly transport: WakatimeTransport,
    private readonly cache: NamespacedCache
  ) {}

  /** Coding Activity widget: суммарное время, лучший день, диапазон дат. */
  async getCodingActivity(username: string, shareId: string): Promise<WakatimeCodingActivity> {
    const key = `coding-activity:${username}/${shareId}`;
    const cached = this.cache.get<WakatimeCodingActivity>(key);
    if (cached) return cached;

    const url = buildShareUrl(username, shareId);
    const raw = await this.transport.getJson<unknown>(url);
    const data = validate(WakatimeCodingActivitySchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  async getLanguages(username: string, shareId: string): Promise<WakatimeLanguages> {
    const key = `languages:${username}/${shareId}`;
    const cached = this.cache.get<WakatimeLanguages>(key);
    if (cached) return cached;

    const url = buildShareUrl(username, shareId);
    const raw = await this.transport.getJson<unknown>(url);
    const data = validate(WakatimeLanguagesSchema, raw, url);

    this.cache.set(key, data);
    return data;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
