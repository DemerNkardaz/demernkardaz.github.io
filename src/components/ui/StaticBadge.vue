<template>
  <div class="badge-static" :class="{ 'is-loading': loading, 'is-error': !!error }">
    <slot v-if="loading" name="loading">
      <span class="badge-static__placeholder">…</span>
    </slot>

    <slot v-else-if="error" name="error" :error="error" :retry="fetchBadge">
      <span class="badge-static__error" :title="error?.message"> badge error</span>
    </slot>

    <slot v-else name="default" :svg="scopedSvg" :json="json" :url="badgeUrl">
      <span class="badge-static__svg" v-html="scopedSvg"></span>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import {
  useStaticBadge,
  scopeSvgIds,
  type StaticBadgeOptions,
  type BadgeFormat,
  type BadgeStyleName,
} from '@/composables/useStaticBadge';

interface Props {
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
  autoFetch?: boolean;
  cache?: boolean;
  cacheTtl?: number;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  color: 'blue',
  badgeStyle: 'flat',
  logo: '',
  logoColor: '',
  logoSize: '',
  labelColor: '',
  cacheSeconds: '',
  format: 'svg',
  autoFetch: true,
  cache: true,
});

const emit = defineEmits<{
  loaded: [payload: { svg: string; json: Record<string, unknown> | null; url: string }];
  error: [error: Error];
}>();

const options = (): StaticBadgeOptions => ({
  label: props.label,
  message: props.message,
  color: props.color,
  badgeStyle: props.badgeStyle,
  logo: props.logo,
  logoColor: props.logoColor,
  logoSize: props.logoSize,
  labelColor: props.labelColor,
  cacheSeconds: props.cacheSeconds,
  format: props.format,
});

const { badgeUrl, svg, json, loading, error, fetchBadge } = useStaticBadge(options, {
  immediate: props.autoFetch,
  cache: props.cache,
  cacheTtl: props.cacheTtl,
});

// Обработка SVG для уникализации ID перед рендерингом
const scopedSvg = computed(() => {
  if (!svg.value) return '';
  return scopeSvgIds(svg.value);
});

watch([svg, json], () => {
  if (!loading.value && !error.value) {
    emit('loaded', { svg: svg.value, json: json.value, url: badgeUrl.value });
  }
});

watch(error, (err) => {
  if (err) emit('error', err);
});

defineExpose({ fetchBadge, badgeUrl, svg, json, loading, error });
</script>

<style scoped>
.badge-static {
  display: inline-flex;
  align-items: center;
  line-height: 0;
}
.badge-static__svg :deep(svg) {
  display: block;
}
.badge-static__placeholder {
  font-size: 12px;
  color: #888;
  font-family: ui-monospace, monospace;
}
.badge-static__error {
  font-size: 12px;
  color: #c0392b;
  font-family: ui-monospace, monospace;
}
</style>
