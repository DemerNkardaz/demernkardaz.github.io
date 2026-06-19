import { ref, type Ref } from 'vue';
import { wakatimeService } from '@/api/clients';
import { SchemaValidationError } from '@/core/schema-validation';
import { ApiError } from '@/core/http-client';
import type { WakatimeCodingActivity, WakatimeLanguages } from '@/services/wakatime.service';

export interface WakatimeLanguageSummary {
  name: string;
  percent: number;
  color: string;
  text: string;
  totalTime: number;
}

export interface WakatimeStatsSummary {
  totalTime: number;
  dailyAverage: number;
  bestDay: { date: string; text: string };
  rangeStart: string;
  rangeEnd: string;
  languages: WakatimeLanguageSummary[];
}

export interface UseWakatimeStatsOptions {
  username: string;
  codingActivityShareId: string;
  languagesShareId: string;
}

interface UseWakatimeStatsResult {
  stats: Ref<WakatimeStatsSummary | null>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  load: (options: UseWakatimeStatsOptions) => Promise<void>;
}

interface WakatimeStaticData {
  codingActivity: WakatimeCodingActivity;
  languages: WakatimeLanguages;
}

export function useWakatimeStats(): UseWakatimeStatsResult {
  const stats = ref<WakatimeStatsSummary | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function toSummary(
    codingActivity: WakatimeCodingActivity,
    languages: WakatimeLanguages
  ): WakatimeStatsSummary {
    return {
      totalTime: codingActivity.data.grand_total.total_seconds_including_other_language,
      dailyAverage: codingActivity.data.grand_total.daily_average_including_other_language,
      bestDay: {
        date: codingActivity.data.best_day.date,
        text: codingActivity.data.best_day.text,
      },
      rangeStart: codingActivity.data.range.start,
      rangeEnd: codingActivity.data.range.end,
      languages: languages.data.map((lang) => ({
        name: lang.name,
        percent: lang.percent,
        color: lang.color,
        text: lang.text,
        totalTime: lang.total_seconds,
      })),
    };
  }

  async function load(options: UseWakatimeStatsOptions): Promise<void> {
    const { username, codingActivityShareId, languagesShareId } = options;
    isLoading.value = true;
    error.value = null;

    try {
      if (!import.meta.env.PROD) {
        try {
          const [codingActivity, languages] = await Promise.all([
            wakatimeService.getCodingActivity(username, codingActivityShareId),
            wakatimeService.getLanguages(username, languagesShareId),
          ]);
          stats.value = toSummary(codingActivity, languages);
          return;
        } catch (err) {
          console.warn('WakaTime JSONP-запрос не удался, пробуем fallback...', err);
        }
      }

      const response = await fetch('/wakatime-data.json');
      if (!response.ok) throw new Error('Static data not found');

      const data = (await response.json()) as WakatimeStaticData;
      stats.value = toSummary(data.codingActivity, data.languages);
    } catch (err) {
      error.value = toUserMessage(err);
    } finally {
      isLoading.value = false;
    }
  }

  return { stats, isLoading, error, load };
}

function toUserMessage(err: unknown): string {
  if (err instanceof SchemaValidationError) {
    return 'WakaTime изменил формат ответа — обратитесь к разработчику.';
  }
  if (err instanceof ApiError) {
    if (err.isRateLimited) return 'Превышен лимит запросов к WakaTime, попробуйте позже.';
    if (err.isNotFound) return 'Виджет WakaTime не найден — возможно, ссылка отозвана.';
    return 'Не удалось загрузить статистику WakaTime.';
  }
  return 'Неизвестная ошибка.';
}
