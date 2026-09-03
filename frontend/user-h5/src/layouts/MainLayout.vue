<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()

// 底部导航固定四项（PRD 口径）；图标资产 9/4 后按设计稿 exports 接入
const tabs = [
  { name: 'home', label: '首页' },
  { name: 'messages', label: '消息' },
  { name: 'orders', label: '订单' },
  { name: 'mine', label: '我的' },
] as const
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <RouterView />
    </main>
    <!-- meta.tab 决定是否渲染底部导航，禁止各页自带底栏 -->
    <nav v-if="route.meta.tab" class="tab-bar">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="{ name: tab.name }"
        class="tab-item"
        :class="{ 'tab-item--active': route.name === tab.name }"
      >
        <span class="tab-label">{{ tab.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  /* H5 桌面预览时居中约束；验收视口 320–430 */
  max-width: 430px;
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--color-surface);
}

.app-main {
  min-height: 100dvh;
}

/* 底部导航：白底 + 1px 顶部细边框 + 安全区（设计系统 Z-Index Level 2） */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  display: flex;
  background: var(--color-surface-white);
  border-top: 1px solid var(--color-border-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
}

.tab-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.tab-item--active .tab-label {
  color: var(--color-primary);
  font-weight: 600;
}
</style>
