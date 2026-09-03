<script setup lang="ts">
// 9/3 初始化验收页（Hello 页面）：工程跑通即达成本日目标
// 首页正式 UI 自 9/4 起按 docs/design/exports/用户端/02-首页/02-首页-精细 exact 复刻
</script>

<template>
  <div class="home-page">
    <h1 class="hello-title">Hello 👋</h1>
    <p class="sub">轻量外卖 · 用户端工程初始化完成</p>
    <p class="hint">
      技术栈：Vue 3 + Vite + TS + Pinia + Vue Router + Axios<br />
      演示数据与页面开发将于 9/4 起按 TDD 推进（mock 先行，不等后端）
    </p>
  </div>
</template>

<style scoped>
.home-page {
  padding: 64px 12px;
  text-align: center;
}

.hello-title {
  font-size: var(--font-headline-lg);
  font-weight: 700;
  color: var(--color-primary);
}

.sub {
  margin-top: 8px;
  font-size: var(--font-body-lg);
  font-weight: 500;
  color: var(--color-text-primary);
}

.hint {
  margin-top: 16px;
  font-size: var(--font-label-md);
  color: var(--color-text-tertiary);
  line-height: 1.8;
}
</style>
