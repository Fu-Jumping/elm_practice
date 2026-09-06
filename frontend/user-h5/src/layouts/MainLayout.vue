<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()
const mainEl = ref<HTMLElement | null>(null)

// 路由切换时内容区回到顶部（app-main 为独立滚动容器，window scrollBehavior 不生效）
watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    mainEl.value?.scrollTo({ top: 0 })
  },
)
</script>

<template>
  <div class="app-shell">
    <main ref="mainEl" class="app-main">
      <RouterView />
    </main>
    <!-- meta.tab 决定是否渲染底部导航，禁止各页自带底栏 -->
    <TabBar v-if="route.meta.tab" />
  </div>
</template>

<style scoped>
.app-shell {
  /* H5 桌面预览时居中约束；验收视口 320–430 */
  max-width: 430px;
  margin: 0 auto;
  /* 长列表+固定底栏：壳固定视口高，内容区独立滚动（首页复刻工程策略 2026-09-05） */
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* 设计稿无常驻滚动条；移动端为 overlay 滚动条，桌面预览对齐隐藏（复刻验收检查项） */
  scrollbar-width: none;
}

.app-main::-webkit-scrollbar {
  display: none;
}
</style>
