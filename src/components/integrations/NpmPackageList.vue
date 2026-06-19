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
      <li v-for="pkg in packages" :key="pkg.name" class="package-list__item">
        <div class="package-list__item__header">
          <a
            :href="pkg.link"
            target="_blank"
            rel="noopener noreferrer"
            class="package-list__item__name"
            >{{ pkg.name }}</a
          >
          <div class="package-list__badge__wrapper">
            <StaticBadge
              logo="npm"
              label="npm"
              label-color="cb0000"
              color="fdfdfd"
              :message="'v' + pkg.version"
            />
            <StaticBadge
              label="🡇"
              label-color="cb0000"
              color="fdfdfd"
              :message="pkg.downloads + '/' + t('month').toLowerCase()"
            />
            <StaticBadge
              label="🡅"
              label-color="cb0000"
              color="fdfdfd"
              :message="formatDate(pkg.updated)"
            />
          </div>
        </div>

        <p class="package-list__item__description">{{ pkg.description }}</p>
        <PackageTags
          :tags="pkg.keywords"
          tagSource="https://www.npmjs.com/search?q=keywords::tag"
        />
      </li>
    </ul>
  </div>
</template>
