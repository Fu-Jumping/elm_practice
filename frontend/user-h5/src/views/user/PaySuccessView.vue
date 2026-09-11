<script setup lang="ts">
/**
 * 支付成功页 —— 批次⑩ TODO-USER-105b（2026-09-11）
 * 设计真源：`docs/design/exports/用户端/07-支付/03-支付成功/`；口径出处：PRD 7.5 + 7.16.1 支付成功页四行
 * 关键口径：
 * - 成功状态、金额、订单编号、支付时间一律来自订单查询接口，不使用写死金额；进入本页不再次发起支付
 * - 支付方式显示「模拟支付」（设计稿「支付宝」为真实渠道，按 PRD 不实现）
 * - 会员提示为**固定课程文案**（会员红包已同步 / 下次下单可使用），纯展示不触发请求；
 *   **本期不建积分体系**——设计稿的「获得 10 积分 / 查看积分」按钮不实现
 * - 状态未知（仍为待支付）时显示「支付结果待确认」，不显示成功；金额缺失显示「暂无金额」、时间缺失显示「暂无时间」
 * - 接口失败保留结果并提供重新查询（PRD 异常列）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '@/services/api'
import { formatMoney, formatTime, normalizeOrderDetail } from '@/services/normalizers'
import type { OrderDetail } from '@/services/api/types'

const route = useRoute()
const router = useRouter()

const orderId = typeof route.params.orderId === 'string' ? route.params.orderId : ''
const order = ref<OrderDetail | null>(null)
const missing = ref(false)
const loadError = ref('')
const querying = ref(false)

/** 已支付（含 P0 遗留 PROCESSING）状态集合；待支付/已取消不视为成功 */
const PAID_STATUSES = ['PENDING', 'COOKING', 'DELIVERING', 'COMPLETED', 'PROCESSING']
const isPaid = computed(() => !!order.value && PAID_STATUSES.includes(order.value.status))

/** 金额缺失显示「暂无金额」（PRD 检查列），不使用 ¥0.00 冒充 */
const amountText = computed(() => {
  const amount = order.value?.amounts.payableAmount ?? 0
  return amount > 0 ? `¥ ${formatMoney(amount)}` : '暂无金额'
})
const paidTimeText = computed(() =>
  order.value?.paidAt ? formatTime(order.value.paidAt) : '暂无时间',
)

async function loadOrder(): Promise<void> {
  if (!orderId) {
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
    return
  }
  querying.value = true
  loadError.value = ''
  try {
    order.value = normalizeOrderDetail(await orderApi.getOrder(orderId))
  } catch {
    // 接口失败：保留已展示结果并提供重新查询（PRD 异常列）
    loadError.value = '支付结果查询失败，请重试'
  } finally {
    querying.value = false
  }
}

onMounted(loadOrder)

function goOrder(): void {
  // 订单编号缺失时查看订单改为返回订单列表（PRD 异常列）
  if (!order?.value?.orderId) {
    void router.replace({ name: 'orders' })
    return
  }
  void router.push({ name: 'order-detail', params: { orderId: order.value.orderId } })
}

function goHome(): void {
  void router.push({ name: 'home' })
}
</script>

<template>
  <div class="pay-success-page">
    <div v-if="missing" class="ps-tip-page" data-testid="pay-success-missing">订单编号缺失，即将返回列表…</div>

    <div v-else-if="order" data-testid="pay-success" class="ps-body">
      <!-- 成功横幅（设计稿 .headerSuccessBannerF：白色通栏 + 64px 品牌橙圆角徽标） -->
      <section class="ps-banner">
        <span class="ps-badge" aria-hidden="true">
          <svg viewBox="0 0 30 30">
            <circle cx="15" cy="15" r="12" fill="none" stroke="#ffffff" stroke-width="2" />
            <path d="M9.5 15.4l3.8 3.8L21 11.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <p class="ps-banner-title">{{ isPaid ? '支付成功' : '支付结果待确认' }}</p>
        <p v-if="isPaid" class="ps-banner-amount">{{ amountText }}</p>
      </section>

      <!-- 订单摘要卡（订单编号 / 支付方式 / 支付时间，均来自订单详情接口） -->
      <section class="ps-card" data-testid="pay-summary-card">
        <div class="ps-row">
          <span class="ps-label">订单编号</span>
          <span class="ps-value ps-value--mono">{{ order?.orderId || '—' }}</span>
        </div>
        <div class="ps-row">
          <span class="ps-label">支付方式</span>
          <span class="ps-value">模拟支付</span>
        </div>
        <div class="ps-row">
          <span class="ps-label">支付时间</span>
          <span class="ps-value ps-value--mono">{{ paidTimeText }}</span>
        </div>
      </section>

      <!-- 会员提示：固定课程文案，纯展示不触发请求、不含积分入口 -->
      <section class="ps-member" data-testid="member-tip">
        <span class="ps-member-icon" aria-hidden="true">
          <svg viewBox="0 0 36 36">
            <path
              d="M9 13.5h18l-1.6 12.2a2 2 0 0 1-2 1.8H12.6a2 2 0 0 1-2-1.8z"
              fill="none"
              stroke="#ff5a1f"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
            <path d="M13.5 13.5V11a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="#ff5a1f" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </span>
        <div class="ps-member-text">
          <p class="ps-member-title">会员红包已同步</p>
          <p class="ps-member-sub">下次下单可使用</p>
        </div>
      </section>

      <p v-if="loadError" class="ps-error" role="alert">
        {{ loadError }}
        <button class="ps-retry" type="button" data-testid="retry-query-btn" :disabled="querying" @click="loadOrder">
          {{ querying ? '查询中…' : '重新查询' }}
        </button>
      </p>

      <!-- 底部固定操作：查看订单 / 回到首页（PRD 底部操作行） -->
      <section class="ps-actions">
        <button class="ps-primary" type="button" data-testid="goto-order-btn" @click="goOrder">查看订单</button>
        <button class="ps-secondary" type="button" data-testid="goto-home-btn" @click="goHome">回到首页</button>
      </section>
    </div>

    <p v-else class="ps-tip-page">支付结果加载中…</p>
  </div>
</template>

<style scoped>
.pay-success-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* 设计稿 .frame：页面底色 #f7f7f7，分段之间露 12px 灰缝 */
  background: #f7f7f7;
}

.ps-body {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* 成功横幅：白色通栏，上 48 下 32 */
.ps-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0 32px;
  background: #ffffff;
}

.ps-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: var(--color-primary);
}

.ps-badge svg {
  width: 30px;
  height: 30px;
}

.ps-banner-title {
  margin: 0;
  padding-bottom: 8px;
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  color: #1a1c1c;
}

.ps-banner-amount {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  color: #1a1c1c;
}

.ps-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  padding: 16px 12px;
  background: #ffffff;
}

.ps-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ps-label {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #666666;
}

.ps-value {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #1a1c1c;
}

.ps-value--mono {
  font-weight: 400;
}

.ps-member {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 10px 12px;
  background: #ffffff;
}

.ps-member-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #ff5a1f1a;
}

.ps-member-icon svg {
  width: 24px;
  height: 24px;
}

.ps-member-text {
  display: flex;
  flex-direction: column;
}

.ps-member-title {
  margin: 0;
  font-size: 16px;
  line-height: 22px;
  color: #1a1c1c;
}

.ps-member-sub {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #666666;
}

.ps-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0 12px;
  font-size: 12px;
  color: var(--color-error);
}

.ps-retry {
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  color: var(--color-primary);
}

/* 底部操作固定在页面底部（设计稿 .actionsFullBleed：白色通栏 + 24 上下内边距） */
.ps-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: auto;
  padding: 24px 12px;
  background: #ffffff;
}

.ps-primary {
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  padding: 12px 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  color: #ffffff;
}

.ps-secondary {
  border: none;
  background: none;
  padding: 8px 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #666666;
}

.ps-tip-page {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999999;
}
</style>
