import { computed, ref, shallowRef, watch, onBeforeUnmount, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

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
  immediate?: boolean;
  cache?: boolean;
  cacheTtl?: number;
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

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<BadgeResult>>();

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

export function clearStaticBadgeCache(): void {
  cache.clear();
  inflight.clear();
}

let svgIdCounter = 0;

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
      fetchBadge().catch(() => {});
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
