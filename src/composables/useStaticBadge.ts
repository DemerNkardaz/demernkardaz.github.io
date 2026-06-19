import { computed, ref, shallowRef, watch, onBeforeUnmount, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

// Требует Vue >= 3.3 (toValue). Если у вас более старая версия —
// замените toValue(source) на unref(source) и используйте только ref/computed.

export type BadgeFormat = 'svg' | 'json';
export type BadgeStyleName = 'plastic' | 'flat' | 'flat-square' | 'for-the-badge' | 'social';

export interface StaticBadgeOptions {
  label?: string;
  message: string;
  color?: string;
  badgeStyle?: BadgeStyleName;
  logo?: string;
  logoColor?: string;
  logoSize?: string;
  labelColor?: string;
  cacheSeconds?: string | number;
  format?: BadgeFormat;
}

export interface UseStaticBadgeConfig {
  /** Запускать фетч автоматически при изменении опций. По умолчанию true. */
  immediate?: boolean;
  /** Использовать модульный кэш по URL. По умолчанию true. */
  cache?: boolean;
  /**
   * Сколько мс держать запись в локальном кэше.
   * Если не указано — берётся cacheSeconds из опций (× 1000), иначе 60000.
   */
  cacheTtl?: number;
  /** Задержка дебаунса перед запросом при смене опций, мс. По умолчанию 120. */
  debounce?: number;
}

export interface BadgeResult {
  svg: string;
  json: Record<string, unknown> | null;
}

interface CacheEntry {
  result: BadgeResult;
  expiresAt: number;
}

// Модульный кэш — общий для ВСЕХ инстансов composable на странице.
// Два бейджа с одинаковым итоговым URL (одинаковые label/message/color/...)
// возьмут результат друг у друга, в том числе если запросы выполняются
// параллельно (дедуп через `inflight`).
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<BadgeResult>>();

/** Собирает URL для https://img.shields.io/static/v1 из опций бейджа. */
export function buildStaticBadgeUrl(options: StaticBadgeOptions): string {
  const params = new URLSearchParams();
  if (options.label) params.set('label', options.label);
  params.set('message', options.message);
  params.set('color', options.color ?? 'blue');

  const badgeStyle = options.badgeStyle ?? 'flat';
  if (badgeStyle !== 'flat') params.set('style', badgeStyle);

  if (options.logo) params.set('logo', options.logo);
  if (options.logoColor) params.set('logoColor', options.logoColor);
  if (options.logoSize) params.set('logoSize', options.logoSize);
  if (options.labelColor) params.set('labelColor', options.labelColor);
  if (options.cacheSeconds !== undefined && options.cacheSeconds !== '') {
    params.set('cacheSeconds', String(options.cacheSeconds));
  }

  const ext = options.format === 'json' ? '.json' : '';
  return `https://img.shields.io/static/v1${ext}?${params.toString()}`;
}

async function requestBadge(url: string, format: BadgeFormat): Promise<BadgeResult> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`shields.io ответил ${res.status} ${res.statusText}`);
  }

  if (format === 'json') {
    const data = (await res.json()) as Record<string, unknown>;
    return { svg: '', json: data };
  }

  const text = await res.text();
  return { svg: text, json: null };
}

/** Сбросить весь локальный кэш бейджей (например, после смены темы/палитры). */
export function clearStaticBadgeCache(): void {
  cache.clear();
  inflight.clear();
}

let svgIdCounter = 0;

/**
 * Делает все `id` внутри SVG уникальными (добавляя суффикс) и поправляет
 * все ссылки на них (`url(#id)`, `href="#id"`, `xlink:href="#id"`).
 *
 * Зачем: shields.io генерирует SVG с фиксированными id (`id="s"` у
 * градиента, `id="r"` у clip-path) одинаковыми для ЛЮБОГО бейджа.
 * Если на странице несколько бейджей вставлены через v-html "как есть",
 * у всех будет один и тот же id="r"/id="s" — а ссылка `url(#r)` в SVG
 * резолвится в рамках всего документа, поэтому второй, третий и т.д.
 * бейдж может взять clip-path/градиент ПЕРВОГО бейджа на странице.
 * Внешне это выглядит так, будто бейдж "не растягивается под текст" —
 * на самом деле его обрезает чужой clipPath с чужой (меньшей) шириной.
 *
 * Вызывать нужно НЕ на этапе фетча/кэша (иначе два инстанса, которые
 * получат одну и ту же закэшированную строку, унаследуют один и тот же
 * "уникальный" id и снова столкнутся), а на этапе рендера — с суффиксом,
 * уникальным для конкретного DOM-инстанса бейджа.
 */
export function scopeSvgIds(svgMarkup: string, suffix?: string): string {
  if (!svgMarkup || typeof DOMParser === 'undefined') return svgMarkup;

  const scope = suffix ?? `sb${(svgIdCounter++).toString(36)}`;
  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  const root = doc.documentElement;

  if (!root || doc.querySelector('parsererror')) return svgMarkup;

  const idMap = new Map<string, string>();
  root.querySelectorAll('[id]').forEach((el) => {
    const oldId = el.getAttribute('id');
    if (!oldId) return;
    const newId = `${oldId}-${scope}`;
    idMap.set(oldId, newId);
    el.setAttribute('id', newId);
  });

  if (idMap.size === 0) return svgMarkup;

  const urlRefRe = /url\(#([^)\s'"]+)\)/g;
  root.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      let value = attr.value;
      let changed = false;

      value = value.replace(urlRefRe, (match, id) => {
        const mapped = idMap.get(id);
        if (mapped) {
          changed = true;
          return `url(#${mapped})`;
        }
        return match;
      });

      if ((attr.name === 'href' || attr.name === 'xlink:href') && value.startsWith('#')) {
        const mapped = idMap.get(value.slice(1));
        if (mapped) {
          value = `#${mapped}`;
          changed = true;
        }
      }

      if (changed) el.setAttribute(attr.name, value);
    });
  });

  return new XMLSerializer().serializeToString(root);
}

export function useStaticBadge(
  source: MaybeRefOrGetter<StaticBadgeOptions>,
  config: UseStaticBadgeConfig = {}
) {
  const { immediate = true, cache: useCache = true, debounce = 120 } = config;

  const loading = ref(false);
  const error = shallowRef<Error | null>(null);
  const svg = ref('');
  const json = shallowRef<Record<string, unknown> | null>(null);

  const options = computed(() => toValue(source));
  const badgeUrl = computed(() => buildStaticBadgeUrl(options.value));

  function ttlFor(opts: StaticBadgeOptions): number {
    if (config.cacheTtl !== undefined) return config.cacheTtl;
    if (opts.cacheSeconds !== undefined && opts.cacheSeconds !== '') {
      return Number(opts.cacheSeconds) * 1000;
    }
    return 60_000;
  }

  function applyResult(result: BadgeResult) {
    svg.value = result.svg;
    json.value = result.json;
  }

  async function fetchBadge(): Promise<BadgeResult> {
    const url = badgeUrl.value;
    const format: BadgeFormat = options.value.format === 'json' ? 'json' : 'svg';

    loading.value = true;
    error.value = null;

    try {
      if (!useCache) {
        const result = await requestBadge(url, format);
        applyResult(result);
        return result;
      }

      const cached = cache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        applyResult(cached.result);
        return cached.result;
      }

      let pending = inflight.get(url);
      if (!pending) {
        pending = requestBadge(url, format);
        inflight.set(url, pending);
        pending.finally(() => inflight.delete(url));
      }

      const result = await pending;
      cache.set(url, { result, expiresAt: Date.now() + ttlFor(options.value) });
      applyResult(result);
      return result;
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  function scheduleFetch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchBadge().catch(() => {
        // ошибка уже отражена в error.value — здесь просто гасим unhandled rejection
      });
    }, debounce);
  }

  watch(badgeUrl, () => {
    if (immediate) scheduleFetch();
  });

  if (immediate) scheduleFetch();

  onBeforeUnmount(() => {
    clearTimeout(debounceTimer);
  });

  return {
    badgeUrl,
    svg,
    json,
    loading,
    error,
    fetchBadge,
  };
}
