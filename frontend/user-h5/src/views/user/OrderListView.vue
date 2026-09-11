<script setup lang="ts">
/**
 * 订单列表页（视觉真源：docs/design/exports/用户端/06-订单/01-订单列表，390 宽）
 * 2026-09-07 TDD 落地（T40-T42）：
 * - 订单卡由订单列表接口返回，金额、状态、时间使用接口值（PRD 7.16 订单列表行）
 * - P0 仅"全部"筛选（待支付/待评价筛选在对应 P1 扩展后出现）；订单按创建时间倒序（TC-ORD-013）
 * - 空结果显示空态；点击卡片进入订单详情；回到列表重新请求，不沿用过期列表
 * - 待支付订单提供「去支付」入口 → 支付页（批次⑩ 105，PRD 订单列表页行：待支付点击去支付）
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { orderApi } from '@/services/api'
import {
  formatCountdown,
  formatMoney,
  formatTime,
  normalizeOrderSummary,
  orderDisplayStatus,
  remainingSeconds,
} from '@/services/normalizers'
import { reorderToCart } from '@/utils/reorder'
import { toast } from '@/utils/toast'
import { useCatalogStore } from '@/stores/catalogStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { OrderSummary } from '@/services/api/types'

const router = useRouter()
const catalogStore = useCatalogStore()
const sessionStore = useSessionStore()

const orders = ref<OrderSummary[]>([])
const loading = ref(false)

/** 每秒刷新的「当前时间」（待支付倒计时展示用） */
const now = ref(Date.now())
let countdownTimer: number | undefined

/** 待支付剩余秒数（契约 §3.5 payDeadline；缺失或已过为 0） */
function remainingOf(order: OrderSummary): number {
  return remainingSeconds(order.payDeadline, new Date(now.value))
}

/** 待支付且已过 payDeadline：显示已失效并禁止支付（PRD 订单列表页异常列） */
function isExpired(order: OrderSummary): boolean {
  return order.status === 'PENDING_PAYMENT' && !!order.payDeadline && remainingOf(order) <= 0
}

function hasCountdown(order: OrderSummary): boolean {
  return order.status === 'PENDING_PAYMENT' && !!order.payDeadline
}

function countdownText(order: OrderSummary): string {
  return isExpired(order) ? '已失效' : `剩余 ${formatCountdown(remainingOf(order))}`
}

/** 待支付订单 → 支付页（收银台）；已失效则禁止支付并提示 */
function goPay(order: OrderSummary): void {
  if (isExpired(order)) {
    toast('订单已失效，请重新下单')
    return
  }
  void router.push({ name: 'order-pay', params: { orderId: order.orderId } })
}

/** 去评价（PRD 列表页行：待评价点击评价）→ 评价订单页 */
function goReview(order: OrderSummary): void {
  void router.push({ name: 'order-review', params: { orderId: order.orderId } })
}

/** 再来一单（契约 §3.5）：按历史明细重建购物车，能加尽加，复制完成后跳商家详情页 */
async function onReorder(order: OrderSummary): Promise<void> {
  try {
    const result = await reorderToCart(order.orderId)
    if (result.failed.length > 0) {
      toast(`已加入 ${result.added} 件商品，${result.failed.length} 件不可购买：${result.failed.join('、')}`)
    } else if (result.added > 0) {
      toast(`已加入 ${result.added} 件商品`)
    }
    if (result.added > 0) {
      void router.push({ name: 'store-detail', params: { storeId: result.storeId } })
    }
  } catch {
    toast('再来一单失败，请稍后重试')
  }
}

/** 店名映射（后端订单记录无 storeName：按 storeId 从店铺列表映射，缺口见联调问题清单） */
const storeNameMap = computed(() => new Map(catalogStore.stores.map((s) => [s.storeId, s.name])))

function displayName(order: OrderSummary): string {
  return storeNameMap.value.get(order.storeId) ?? order.storeId
}

onMounted(async () => {
  // 路由 meta.auth 已拦截未登录；页面内兜底探活（刷新恢复会话）
  if (!sessionStore.isLoggedIn) await sessionStore.checkLogin()
  // 店铺列表供店名映射（失败不阻塞订单渲染，降级显示 storeId）
  void catalogStore.fetchStores().catch(() => undefined)
  await refresh()
  // 倒计时每秒刷新（仅用于展示与失效判定，不向服务端轮询）
  countdownTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (countdownTimer !== undefined) window.clearInterval(countdownTimer)
})

async function refresh(): Promise<void> {
  loading.value = true
  try {
    const records = await orderApi.listOrders()
    orders.value = records.map(normalizeOrderSummary)
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

function goDetail(order: OrderSummary): void {
  void router.push({ name: 'order-detail', params: { orderId: order.orderId } })
}
</script>

<template>
  <div class="order-list-page">
    <header class="ol-header">
      <span class="ol-title">我的订单</span>
      <span class="ol-filter">全部</span>
    </header>

    <main class="ol-main">
      <template v-if="!loading">
        <section
          v-for="order in orders"
          :key="order.orderId"
          class="ol-card"
          data-testid="order-card"
          @click="goDetail(order)"
        >
          <div class="ol-store-row">
            <span class="ol-store">{{ displayName(order) }}</span>
            <span class="ol-status">{{ orderDisplayStatus(order) }}</span>
          </div>
          <div class="ol-meta-row">
            <span class="ol-time">{{ formatTime(order.createdAt) }}</span>
            <span class="ol-amount">实付 ¥{{ formatMoney(order.amounts.payableAmount) }}</span>
          </div>
          <div
            v-if="hasCountdown(order) || order.status === 'PENDING_PAYMENT' || order.status === 'COMPLETED'"
            class="ol-actions"
          >
            <span
              v-if="hasCountdown(order)"
              class="ol-countdown"
              :class="{ 'is-expired': isExpired(order) }"
              data-testid="order-countdown"
            >
              {{ countdownText(order) }}
            </span>
            <button
              v-if="order.status === 'PENDING_PAYMENT'"
              class="ol-pay"
              :class="{ 'is-disabled': isExpired(order) }"
              type="button"
              data-testid="order-pay-entry"
              :aria-disabled="isExpired(order) ? 'true' : 'false'"
              @click.stop="goPay(order)"
            >
              去支付
            </button>
            <button
              v-if="order.status === 'COMPLETED' && order.reviewed"
              class="ol-pay"
              type="button"
              data-testid="order-reorder-entry"
              @click.stop="onReorder(order)"
            >
              再来一单
            </button>
            <button
              v-if="order.status === 'COMPLETED' && !order.reviewed"
              class="ol-pay"
              type="button"
              data-testid="order-review-entry"
              @click.stop="goReview(order)"
            >
              去评价
            </button>
          </div>
        </section>

        <div v-if="orders.length === 0" class="ol-empty" data-testid="order-empty">
          <p>暂无订单</p>
          <button class="ol-gohome" type="button" @click="router.push({ name: 'home' })">
            去逛逛
          </button>
        </div>
      </template>
      <p v-else class="ol-skeleton">订单加载中…</p>
    </main>
  </div>
</template>

<style scoped>
.order-list-page {
  min-height: 100vh;
  /* 设计稿 .frame 画布 #eeeeee（06-订单/01-订单列表）：卡片通栏白底、行间 8px 灰缝靠画布色分辨。
     此前误用 #f9f9f9（与白色仅差 6 个色阶），灰缝肉眼不可见（2026-09-08 负责人反馈） */
  background: var(--color-surface-container);
}

.ol-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.ol-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1c1c;
}

.ol-filter {
  font-size: 13px;
  color: #ff5a1f;
  font-weight: 600;
}

/* 通栏分段：设计稿 .orderList（padding-top: 8px、row-gap: 8px 灰缝），左右不加外边距 */
.ol-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0 0;
}

/* 订单卡：通栏白块，无圆角无阴影（设计稿 .orderCard* padding: 16px） */
.ol-card {
  background: #fff;
  padding: 16px;
}

.ol-store-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ol-store {
  font-size: 15px;
  font-weight: 600;
  color: #1a1c1c;
}

.ol-status {
  font-size: 13px;
  color: #ff5a1f;
  font-weight: 600;
}

.ol-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.ol-time {
  font-size: 12px;
  color: #999;
}

.ol-amount {
  font-size: 14px;
  font-weight: 600;
  color: #1a1c1c;
}

/* 待支付卡片「去支付」入口（批次⑩ 105）：白底品牌橙描边次按钮，点击冒泡已阻止 */
.ol-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}

/* 待支付倒计时：未到期品牌橙、已失效置灰 */
.ol-countdown {
  margin-right: auto;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-primary);
}

.ol-countdown.is-expired {
  color: #999999;
}

.ol-pay.is-disabled {
  border-color: #e5e5e5;
  color: #bfbfbf;
}

.ol-pay {
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  background: #ffffff;
  padding: 6px 14px;
  font-size: 13px;
  line-height: 18px;
  color: var(--color-primary);
}



/* 空态为设计稿外的兜底块：随父级通栏后不再带圆角，避免出现"整屏白卡" */
.ol-empty {
  background: #fff;
  padding: 40px 12px;
  text-align: center;
}

.ol-empty p {
  font-size: 14px;
  color: #999;
}

.ol-gohome {
  margin-top: 16px;
  padding: 10px 24px;
  border: none;
  border-radius: 12px;
  background: #ff5a1f;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.ol-skeleton {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999;
}
</style>
