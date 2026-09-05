<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="not-found">
    <h1 class="code">404</h1>
    <p class="text">页面不存在或已被移除</p>
    <RouterLink class="back" :to="{ name: 'home' }">回到首页</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  padding: 96px 12px;
  text-align: center;
}

.code {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
}

.text {
  margin-top: 8px;
  font-size: var(--font-body-md);
  color: var(--color-text-secondary);
}

.back {
  display: inline-block;
  margin-top: 24px;
  padding: 10px 24px;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-body-md);
  font-weight: 600;
}
</style>
