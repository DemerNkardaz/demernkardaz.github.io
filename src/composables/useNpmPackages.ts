import { ref, type Ref } from 'vue';
import { npmService } from '@/api/clients';
import { SchemaValidationError } from '@/core/schema-validation';
import { ApiError } from '@/core/http-client';
import type { NpmSearchResult } from '@/services/npm.service';

export interface NpmPackageSummary {
  name: string;
  description: string;
  version: string;
  downloads: number;
  updated: string;
  keywords: string[];
  link: string;
}

interface UseNpmPackagesResult {
  packages: Ref<NpmPackageSummary[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  load: (maintainer: string) => Promise<void>;
}

/**
 * Composable вокруг NpmService.searchPackages — извлекает только то,
 * что нужно для отображения (имя, ссылка, описание), и переводит
 * состояние запроса в реактивные ref'ы, которые компонент просто рендерит.
 */
export function useNpmPackages(): UseNpmPackagesResult {
  const packages = ref<NpmPackageSummary[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function load(maintainer: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    const setPackagesFromData = (data: NpmSearchResult) => {
      packages.value = data.objects.map((item) => {
        console.log('Package data:', item.package);
        const pkg = item.package;
        const downloads = item.downloads?.monthly ?? 0;

        return {
          name: pkg.name ?? '',
          description: pkg.description ?? 'Без описания',
          version: pkg.version ?? '0.0.0',
          downloads: downloads,
          updated: pkg.date ? new Date(pkg.date).toISOString() : '',
          keywords: Array.isArray(pkg.keywords) ? pkg.keywords : [],
          link: `https://www.npmjs.com/package/${pkg.name}`,
        };
      });
    };

    try {
      if (!import.meta.env.PROD) {
        try {
          const result = await npmService.searchPackages(maintainer);
          setPackagesFromData(result);
          return; // Успешно
        } catch (err) {
          console.warn('API запрос не удался, пробуем fallback...', err);
        }
      }

      const response = await fetch('/npm-data.json');
      if (!response.ok) throw new Error('Static data not found');

      const data = (await response.json()) as NpmSearchResult;
      setPackagesFromData(data);
    } catch (err) {
      error.value = toUserMessage(err);
    } finally {
      isLoading.value = false;
    }
  }

  return { packages, isLoading, error, load };
}

function toUserMessage(err: unknown): string {
  if (err instanceof SchemaValidationError) {
    return 'npm изменил формат ответа — обратитесь к разработчику.';
  }
  if (err instanceof ApiError) {
    if (err.isRateLimited) return 'Превышен лимит запросов к npm, попробуйте позже.';
    if (err.isNotFound) return 'Мейнтейнер не найден.';
    return 'Не удалось загрузить список пакетов.';
  }
  return 'Неизвестная ошибка.';
}
