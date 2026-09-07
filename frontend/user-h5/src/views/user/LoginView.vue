<script setup lang="ts">
// 登录页 P0：9/4 起按 TDD 推进（页面 exact 复刻参照 design exports）
// 演示账号：13800000001 / 123456（docs/backend/后端接口契约.md 固定演示数据）
</script>

<template>
  <div class="login-page">
    <h1 class="login-title">登录</h1>
    <p class="placeholder">
      登录页开发中（9/4 起实现）<br />
      演示账号：13800000001 / 123456
    </p>
  </div>
</template>

<style scoped>
.login-page {
  padding: 64px 12px;
  text-align: center;
}

.login-title {
  font-size: var(--font-headline-lg);
  color: var(--color-primary);
}

.placeholder {
  margin-top: 8px;
  font-size: var(--font-label-md);
  color: var(--color-text-tertiary);
}
</style>
