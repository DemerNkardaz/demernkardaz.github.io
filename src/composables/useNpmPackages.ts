import { ref, type Ref } from 'vue';
import { npmService } from '@/api/clients';
import { SchemaValidationError } from '@/core/schema-validation';
import { ApiError } from '@/core/http-client';

export interface NpmPackageSummary {
  name: string;
  description: string;
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

    try {
      const result = await npmService.searchPackages(maintainer);

      packages.value = result.objects.map(({ package: pkg }) => ({
        name: pkg.name,
        description: pkg.description ?? 'Без описания',
        link: `https://www.npmjs.com/package/${pkg.name}`,
      }));
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
