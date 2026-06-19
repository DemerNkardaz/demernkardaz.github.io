<script setup lang="ts">
import { useWakatimeStats } from '@/composables/useWakatimeStats';
import { formatDuration } from '@/util/intl';

const { stats, isLoading, error, load } = useWakatimeStats();

onMounted(() => {
  load({
    username: 'Nkardaz',
    codingActivityShareId: '00fc0562-a231-4035-92cd-e56b0c92e5c5',
    languagesShareId: '9aeaa1dc-e2fb-449b-bfe1-56d7cdec1c2a',
  });
});
</script>

<template>
  <div>
    <div>Статистика Wakatime</div>
    <div v-if="isLoading">Загрузка...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="stats">
      <p>Всего времени: {{ formatDuration(stats.totalTime) }}</p>
      <p>Среднее в день: {{ formatDuration(stats.dailyAverage) }}</p>
      <div>
        <p>Языки:</p>
        <ul>
          <li v-for="language in stats.languages" :key="language.name">
            {{ language.name }}: {{ formatDuration(language.totalTime) }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
