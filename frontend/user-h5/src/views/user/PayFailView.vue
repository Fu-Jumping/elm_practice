<script setup lang="ts">
/**
 * 支付失败页 —— 批次⑩ TODO-USER-105b（2026-09-11）
 * 设计真源：`docs/design/exports/用户端/07-支付/04-支付失败/`；口径出处：PRD 7.5 + 7.16.1 支付失败页两行
 * 关键口径：
 * - 失败原因、待支付金额、订单号来自支付结果或订单查询；原因缺失显示通用提示
 * - 「重新支付」先查询订单当前支付状态：仍待支付才回支付页；已成功则进入成功结果；查询失败提供重试
 * - **本期不提供联系客服入口**（设计稿「联系客服」不实现）；次按钮位按 PRD 7.5 改为「返回订单列表」
 * - 订单编号缺失返回订单列表；订单已支付时不再显示失败页（进入时直接转成功结果）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '@/services/api'
import { formatMoney, normalizeOrderDetail } from '@/services/normalizers'
import type { OrderDetail } from '@/services/api/types'

const route = useRoute()
const router = useRouter()

const orderId = typeof route.params.orderId === 'string' ? route.params.orderId : ''
const order = ref<OrderDetail | null>(null)
const missing = ref(false)
const queryError = ref('')
const retrying = ref(false)

const PAID_STATUSES = ['PENDING', 'COOKING', 'DELIVERING', 'COMPLETED', 'PROCESSING']
const GENERIC_REASON = '支付超时或余额不足，请尝试重新支付'

/** 失败原因来自支付结果（路由 query）；缺失时显示通用提示（PRD 检查列） */
const reasonText = computed(() => {
  const reason = typeof route.query.reason === 'string' ? route.query.reason : ''
  return reason || GENERIC_REASON
})

/** 待支付金额：缺失显示「暂无金额」，不用 ¥0.00 冒充 */
const amountText = computed(() => {
  const amount = order.value?.amounts.payableAmount ?? 0
  return amount > 0 ? `¥${formatMoney(amount)}` : '暂无金额'
})

async function loadOrder(): Promise<void> {
  if (!orderId) {
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
    return
  }
  try {
    order.value = normalizeOrderDetail(await orderApi.getOrder(orderId))
    // 已支付订单不再显示失败页（PRD 异常列）：直接进入成功结果
    if (PAID_STATUSES.includes(order.value.status)) {
      void router.replace({ name: 'pay-success', params: { orderId } })
    }
  } catch {
    // 订单不存在等：返回订单列表并提示（PRD 异常列）
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
  }
}

onMounted(loadOrder)

/** 重新支付：先查当前支付状态，仍待支付才回支付页；已成功进成功结果；查询失败给出重试提示 */
async function onRetry(): Promise<void> {
  if (retrying.value) return
  retrying.value = true
  queryError.value = ''
  try {
    const latest = normalizeOrderDetail(await orderApi.getOrder(orderId))
    order.value = latest
    if (PAID_STATUSES.includes(latest.status)) {
      void router.replace({ name: 'pay-success', params: { orderId } })
      return
    }
    void router.replace({ name: 'order-pay', params: { orderId } })
  } catch {
    queryError.value = '订单状态查询失败，请重试'
  } finally {
    retrying.value = false
  }
}

function goBack(): void {
  // 返回订单详情（PRD 顶部栏行：点击返回订单详情或确认页）
  void router.push({ name: 'order-detail', params: { orderId } })
}

function backToOrders(): void {
  void router.push({ name: 'orders' })
}
</script>

<template>
  <div class="pay-fail-page">
    <div v-if="missing" class="pf-tip-page" data-testid="pay-fail-missing">订单不存在，即将返回列表…</div>

    <template v-else>
      <header class="pf-appbar">
        <button class="pf-back" type="button" aria-label="返回" data-testid="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <p class="pf-appbar-title">支付失败</p>
      </header>

      <main v-if="order" class="pf-main" data-testid="pay-fail">
        <!-- 状态区：语义红浅底圆形徽标 + 标题 + 原因 -->
        <section class="pf-status">
          <span class="pf-badge" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="15" fill="none" stroke="#ba1a1a" stroke-width="2" />
              <path d="M20 12.5v10" fill="none" stroke="#ba1a1a" stroke-width="2.4" stroke-linecap="round" />
              <circle cx="20" cy="27.5" r="1.6" fill="#ba1a1a" />
            </svg>
          </span>
          <p class="pf-title">支付失败</p>
          <p class="pf-reason">{{ reasonText }}</p>
        </section>

        <!-- 订单明细卡：待支付金额 + 订单号 -->
        <section class="pf-card" data-testid="fail-order-card">
          <div class="pf-amount-row">
            <span class="pf-amount-label">待支付金额</span>
            <span class="pf-amount-value">{{ amountText }}</span>
          </div>
          <div class="pf-order-row">
            <span class="pf-order-label">订单号</span>
            <span class="pf-order-id">{{ order?.orderId || '—' }}</span>
          </div>
        </section>

        <!-- 操作区：重新支付（主）+ 返回订单列表（次，取代设计稿的联系客服） -->
        <section class="pf-actions">
          <button class="pf-primary" type="button" data-testid="retry-pay-btn" :disabled="retrying" @click="onRetry">
            {{ retrying ? '查询中…' : '重新支付' }}
          </button>
          <button class="pf-secondary" type="button" data-testid="back-to-orders-btn" @click="backToOrders">
            返回订单列表
          </button>
          <p v-if="queryError" class="pf-error" role="alert">{{ queryError }}</p>
        </section>
      </main>
      <p v-else class="pf-tip-page">支付信息加载中…</p>
    </template>
  </div>
</template>

<style scoped>
.pay-fail-page {
  min-height: 100vh;
  background: #ffffff;
}

.pf-appbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  border-bottom: 1px solid #e5e5e5;
  background: #ffffff;
}

.pf-back {
  position: absolute;
  left: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  padding: 0;
  color: #1a1c1c;
}

.pf-back svg {
  width: 10px;
  height: 16px;
}

.pf-appbar-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1c1c;
}

.pf-main {
  display: flex;
  flex-direction: column;
  padding: 40px 12px 24px;
}

.pf-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 32px;
  margin: 0 64px;
}

.pf-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
  border-radius: 12px;
  /* 语义红浅底（设计稿 #ffdad6）：失败/错误语义可用 */
  background: #ffdad6;
}

.pf-badge svg {
  width: 40px;
  height: 40px;
}

.pf-title {
  margin: 0;
  padding-bottom: 8px;
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  color: #1a1c1c;
}

.pf-reason {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #666666;
  text-align: center;
}

.pf-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 40px;
  padding: 15px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
}

.pf-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 11px;
  border-bottom: 1px solid #e5e5e5;
}

.pf-amount-label {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #666666;
}

.pf-amount-value {
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: #1a1c1c;
}

.pf-order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pf-order-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #999999;
}

.pf-order-id {
  font-size: 12px;
  line-height: 16px;
  color: #666666;
}

.pf-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pf-primary {
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  color: #ffffff;
}

.pf-primary:disabled {
  opacity: 0.6;
}

.pf-secondary {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
  padding: 11px 15px;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  color: #1a1c1c;
}

.pf-error {
  margin: 0;
  font-size: 12px;
  color: var(--color-error);
}

.pf-tip-page {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999999;
}
</style>
