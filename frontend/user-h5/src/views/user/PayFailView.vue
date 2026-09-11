<script setup lang="ts">
/**
 * 支付失败页 —— 占位骨架（批次⑩ 105a 提供可跳转路由，避免「模拟支付失败」后死链）
 * TODO(批次⑩ 105b)：按设计真源 `docs/design/exports/用户端/07-支付/04-支付失败/` 与 PRD 7.16.1
 * 支付失败页两行实现（顶部栏 + 失败内容区：失败原因/待支付金额/订单号 + 重新支付），
 * 并遵守「本期不提供联系客服入口」的口径（设计稿的联系客服按钮不实现）。
 */
</script>

<template>
  <div class="pay-result-placeholder" data-testid="pay-fail-placeholder">
    <p>支付失败（真稿随批次⑩ 105b 实现）</p>
  </div>
</template>

<style scoped>
.pay-result-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f9f9f9;
  font-size: 14px;
  color: #999999;
}
</style>
