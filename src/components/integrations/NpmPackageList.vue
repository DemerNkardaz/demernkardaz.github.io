<script setup lang="ts">
import { onMounted } from 'vue';
import { useNpmPackages } from '@/composables/useNpmPackages';

const props = defineProps<{ maintainer: string }>();

const { packages, isLoading, error, load } = useNpmPackages();

onMounted(() => load(props.maintainer));
</script>

<template>
  <div class="npm-package-list">
    <p v-if="isLoading">Загрузка...</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <ul v-else>
      <li v-for="pkg in packages" :key="pkg.name">
        <a :href="pkg.link" target="_blank" rel="noopener">{{ pkg.name }}</a>
        <p>{{ pkg.description }}</p>
      </li>
    </ul>
  </div>
</template>
