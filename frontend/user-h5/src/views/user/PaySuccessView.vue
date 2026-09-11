<script setup lang="ts">
/**
 * 支付成功页 —— 占位骨架（批次⑩ 105a 提供可跳转路由，避免「立即支付」后死链）
 * TODO(批次⑩ 105b)：按设计真源 `docs/design/exports/用户端/07-支付/03-支付成功/` 与 PRD 7.16.1
 * 支付成功页四行实现（成功横幅 + 订单摘要卡 + 会员提示固定课程文案 + 查看订单/回到首页），
 * 并遵守「本期不建积分体系、不展示积分余额或兑换入口」的口径（设计稿的积分提示需替换为课程文案）。
 */
</script>

<template>
  <div class="pay-result-placeholder" data-testid="pay-success-placeholder">
    <p>支付成功（真稿随批次⑩ 105b 实现）</p>
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
