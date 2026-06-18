<script setup lang="ts">
import { onMounted } from 'vue';
import { useNpmPackages } from '@/composables/useNpmPackages';
import { formatDate } from '@/util/intl';

const { t } = useI18n();

const props = defineProps<{ maintainer: string }>();

const { packages, isLoading, error, load } = useNpmPackages();

onMounted(() => load(props.maintainer));
</script>

<template>
  <div class="package-list__wrapper">
    <p v-if="isLoading">{{ t('loading') }}</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <ul v-else class="package-list">
      <li v-for="pkg in packages" :key="pkg.name">
        <a :href="pkg.link" target="_blank" rel="noopener noreferrer">{{ pkg.name }}</a>
        <p>{{ pkg.description }}</p>
        <p>{{ pkg.version }}</p>
        <p>{{ t('updated') }}: {{ formatDate(pkg.updated) }}</p>
        <p>{{ pkg.downloads }}</p>
        <PackageTags
          :tags="pkg.keywords"
          tagSource="https://www.npmjs.com/search?q=keywords::tag"
        />
      </li>
    </ul>
  </div>
</template>
