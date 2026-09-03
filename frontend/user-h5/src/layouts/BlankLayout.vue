<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- 空白布局：登录/注册等无底栏页的容器 -->
  <div class="blank-shell">
    <RouterView />
  </div>
</template>

<style scoped>
.blank-shell {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--color-surface);
}
</style>
