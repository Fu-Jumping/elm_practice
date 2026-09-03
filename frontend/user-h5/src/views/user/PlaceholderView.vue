<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="placeholder-page">
    <h1>{{ route.meta.title }}</h1>
    <p class="placeholder">
      页面骨架已就位（P{{ route.meta.priority ?? '?' }}），9/4 起按 PRD 与设计稿 exports
      逐个实现
    </p>
  </div>
</template>

<style scoped>
.placeholder-page {
  padding: 64px 12px;
  text-align: center;
}

h1 {
  font-size: var(--font-headline-lg);
  color: var(--color-text-primary);
}

.placeholder {
  margin-top: 8px;
  font-size: var(--font-label-md);
  color: var(--color-text-tertiary);
}
</style>
