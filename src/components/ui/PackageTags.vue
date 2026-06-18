<script setup lang="ts">
defineProps<{ tags: string[]; tagSource: string }>();
// https://www.npmjs.com/search?q=keywords::tag
</script>

<template>
  <div class="package-tag__wrapper">
    <a
      class="package-tag"
      v-for="tag in tags"
      :key="tag"
      :href="tagSource.replace(':tag', tag)"
      target="_blank"
      rel="noopener noreferrer"
      >{{ tag }}</a
    >
  </div>
</template>
