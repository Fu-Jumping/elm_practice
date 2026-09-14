<script setup lang="ts">
/**
 * 支付页（待支付收银台）— 批次⑩ TODO-USER-105（2026-09-11，CHG-003 真源 12-订单与支付/02-支付页）
 * 口径出处：PRD 7.5（模拟支付与结果页跳转）+ 7.16.1 支付页三行、契约 §3.5（payDeadline 与支付接口）
 * 关键口径：
 * - 倒计时数据源为后端 `payDeadline`（契约 §3.5 = createdAt + 15 分钟）；归零显示「已失效」并禁用支付
 *   （2026-09-11 负责人确认：仅前端禁用，不回查后端）；
 *   **`payDeadline` 未返回时只显示「--:--」、不再禁用支付**（2026-09-14 负责人裁定：后端缺该字段曾导致
 *   线上整页点不动、支付主链路断死，改为「字段缺失不阻断支付」；契约已同步为已实现）
 * - 金额明细走 normalizers.buildAmountLines（CHG-004 唯一出口）；商品与金额一律按后端返回展示，前端不自行计算
 * - 卡内「取消订单」为文字入口（不与底部按钮并排）；弹层与取消接口归 TODO-USER-002，本批给占位提示
 * - 应用标题用「轻量外卖」（负责人口径；设计稿的英文 CampusBites 与全库「不出现英文界面」口径冲突，不作真源）
 * - 视觉：设计稿的深橙 #ae3200 按设计系统「primary 令牌不直接用作界面主色」改用品牌橙 #ff5a1f
 * - 已支付订单再次进入：直接进入支付成功页（PRD 顶部栏行：不能重复扣款）
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '@/services/api'
import {
  buildAmountLines,
  formatCountdown,
  formatMoney,
  formatTime,
  normalizeOrderDetail,
  remainingSeconds,
} from '@/services/normalizers'
import { useCatalogStore } from '@/stores/catalogStore'
import type { OrderDetail } from '@/services/api/types'
import PaymentActions from '@/components/PaymentActions.vue'
import CancelOrderSheet from '@/components/CancelOrderSheet.vue'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()

const orderId = typeof route.params.orderId === 'string' ? route.params.orderId : ''
const order = ref<OrderDetail | null>(null)
const missing = ref(false)
const copyTip = ref(false)
const showCancelSheet = ref(false)
/** 倒计时剩余秒数（每秒刷新）；null 表示 payDeadline 未返回（禁用支付但不判失效） */
const remain = ref<number | null>(null)
let timer: number | undefined

const createdTime = computed(() => (order.value ? formatTime(order.value.createdAt) : ''))
const storeName = computed(() => catalogStore.storeDetail?.name ?? order.value?.storeId ?? '')
const amountText = computed(() => formatMoney(order.value?.amounts.payableAmount ?? 0))
const isPendingPayment = computed(() => order.value?.status === 'PENDING_PAYMENT')
const expired = computed(() => remain.value !== null && remain.value <= 0)
/** 支付可用条件：待支付状态 + 未失效（`payDeadline` 未返回时只不显示倒计时，不再禁用支付，2026-09-14 裁定） */
const payDisabled = computed(() => !isPendingPayment.value || expired.value)
const countdownText = computed(() => {
  if (remain.value === null) return '--:--'
  return expired.value ? '已失效' : formatCountdown(remain.value)
})

const amountLines = computed(() =>
  buildAmountLines({
    itemsTotal: order.value?.amounts.itemsTotal ?? 0,
    packagingFee: order.value?.amounts.packagingFee ?? 0,
    deliveryFee: order.value?.deliveryFee,
    discounts: order.value?.discounts,
    payableAmount: order.value?.amounts.payableAmount ?? 0,
  }),
)

function stopTimer(): void {
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function startTimer(): void {
  stopTimer()
  const tick = (): void => {
    // 区分「payDeadline 未返回」（null → 禁用但不判失效）与「已归零」（0 → 已失效）
    remain.value = order.value?.payDeadline ? remainingSeconds(order.value.payDeadline) : null
    if (expired.value) stopTimer()
  }
  tick()
  timer = window.setInterval(tick, 1000)
}

async function loadOrder(): Promise<void> {
  if (!orderId) {
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
    return
  }
  try {
    const record = await orderApi.getOrder(orderId)
    order.value = normalizeOrderDetail(record)
    void catalogStore.fetchStoreDetail(order.value.storeId).catch(() => undefined)
    // 已取消订单：转订单详情展示「已取消」与原因（不误判为已支付）
    if (order.value.status === 'CANCELLED') {
      void router.replace({ name: 'order-detail', params: { orderId } })
      return
    }
    // 已支付/非待支付订单再次进入：直接展示支付结果，不重复扣款（PRD 支付页顶部栏行）
    if (order.value.status !== 'PENDING_PAYMENT') {
      void router.replace({ name: 'pay-success', params: { orderId } })
      return
    }
    startTimer()
  } catch {
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
  }
}

onMounted(loadOrder)

onUnmounted(stopTimer)

function goBack(): void {
  void router.push({ name: 'order-detail', params: { orderId } })
}

async function onCopyOrderId(): Promise<void> {
  if (!order.value) return
  try {
    await navigator.clipboard?.writeText(order.value.orderId)
  } catch {
    /* 剪贴板不可用时仍提示，用户可手动选择 */
  }
  copyTip.value = true
  window.setTimeout(() => {
    copyTip.value = false
  }, 1500)
}

/** 取消入口：打开取消订单确认弹层（TODO-USER-002） */
function onCancel(): void {
  showCancelSheet.value = true
}

/** 取消成功：提示并回订单列表（列表可查「已取消」与取消原因） */
function onCancelled(): void {
  showCancelSheet.value = false
  toast('订单已取消')
  void router.replace({ name: 'orders' })
}

/** 取消被拒（已接单/已取消等）：关弹层并刷新订单状态（PRD 异常列） */
function onRejected(): void {
  showCancelSheet.value = false
  void loadOrder()
}

/** 模拟支付成功 → 支付成功页；失败 → 支付失败页（携带失败原因） */
function onPaid(): void {
  void router.replace({ name: 'pay-success', params: { orderId } })
}
function onFailed(reason: string): void {
  void router.replace({ name: 'pay-fail', params: { orderId }, query: { reason } })
}
</script>

<template>
  <div class="pay-page">
    <div v-if="missing" class="pay-missing" data-testid="pay-missing-tip">
      订单不存在或已删除，即将返回列表…
    </div>

    <template v-else-if="order">
      <div data-testid="order-pay">
        <header class="pay-appbar">
          <button class="pay-back" type="button" aria-label="返回" data-testid="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <p class="pay-appbar-title">轻量外卖</p>
        </header>

        <!-- 倒计时卡：仅「支付剩余时间」+ 倒计时大字（设计稿 .backgroundHorizontal） -->
        <section class="pay-countdown-card" data-testid="pay-countdown-card">
          <p class="pay-countdown-pill">
            <svg class="pay-clock" viewBox="0 0 13 13" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.6" fill="none" stroke="currentColor" stroke-width="1.2" />
              <path d="M6.5 3.6v3.1l2.2 1.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
            <span>支付剩余时间</span>
          </p>
          <p
            class="pay-countdown"
            :class="{ 'is-expired': expired, 'is-waiting': remain === null }"
            data-testid="pay-countdown"
          >
            {{ countdownText }}
          </p>
        </section>

        <main class="pay-main">
          <section class="pay-section">
            <!-- 卡标题行：订单详情 + 卡内取消订单文字入口（不与底部按钮并排） -->
            <div class="pay-card-head">
              <p class="pay-card-title">订单详情</p>
              <button class="pay-cancel-entry" type="button" data-testid="pay-cancel-entry" @click="onCancel">
                取消订单
              </button>
            </div>

            <!-- 商品清单 -->
            <ul class="pay-items">
              <li v-for="item in order.items" :key="item.productId" class="pay-item" data-testid="pay-item">
                <span class="pay-thumb" aria-hidden="true" />
                <span class="pay-item-info">
                  <span class="pay-item-name">{{ item.name }}</span>
                  <span class="pay-item-qty">x{{ item.quantity }}</span>
                </span>
                <span class="pay-item-price">¥{{ formatMoney(item.unitPrice) }}</span>
              </li>
            </ul>

            <!-- 金额明细（CHG-004：基础四行 + 优惠项按实际发生） -->
            <div class="pay-amounts">
              <div
                v-for="line in amountLines"
                :key="line.key"
                class="pay-amount-row"
                :class="{ 'is-payable': line.kind === 'payable' }"
                data-testid="amount-line"
                :data-key="line.key"
                :data-kind="line.kind"
              >
                <span class="pay-amount-label">{{ line.label }}</span>
                <span v-if="line.kind === 'payable'" class="pay-payable">
                  <i class="pay-yuan">¥</i>{{ line.text.replace('¥', '') }}
                </span>
                <span v-else class="pay-amount-value">{{ line.text }}</span>
              </div>
            </div>

            <!-- 信息区：商家 / 订单编号（含复制）/ 下单时间 / 收货地址 -->
            <div class="pay-info" data-testid="pay-info">
              <div class="pay-info-line">
                <span class="pay-info-label">商家</span>
                <span class="pay-info-value">{{ storeName }}</span>
              </div>
              <div class="pay-info-line">
                <span class="pay-info-label">订单编号</span>
                <span class="pay-order-no">
                  <span class="pay-order-id">{{ order.orderId }}</span>
                  <button class="pay-copy" type="button" aria-label="复制订单号" data-testid="copy-order-btn" @click="onCopyOrderId">
                    <svg viewBox="0 0 11 13" aria-hidden="true">
                      <rect x="0.6" y="3.6" width="6.8" height="8.8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.1" />
                      <path d="M3.4 3.2V2.2A1.6 1.6 0 0 1 5 0.6h3.4A1.6 1.6 0 0 1 10 2.2v6.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" />
                    </svg>
                  </button>
                </span>
              </div>
              <p v-if="copyTip" class="pay-tip" data-testid="copy-order-tip">已复制</p>
              <div class="pay-info-line">
                <span class="pay-info-label">下单时间</span>
                <span class="pay-info-value">{{ createdTime }}</span>
              </div>
              <div class="pay-info-line pay-info-line--top">
                <span class="pay-info-label">收货地址</span>
                <span class="pay-address">
                  <span class="pay-address-main">{{ order.addressSnapshot.region }} {{ order.addressSnapshot.detail }}</span>
                  <span class="pay-address-sub">
                    {{ order.addressSnapshot.contactName }} {{ order.addressSnapshot.contactPhone }}
                  </span>
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>

      <!-- 底部固定「立即支付 ¥实付金额」（设计稿 .container30） -->
      <footer class="pay-footer">
        <PaymentActions
          :order-id="order.orderId"
          :status="order.status"
          variant="pay-page"
          :amount-text="amountText"
          :disabled="payDisabled"
          @paid="onPaid"
          @failed="onFailed"
        />
      </footer>

      <!-- 取消订单确认弹层（批次⑩ TODO-USER-002） -->
      <CancelOrderSheet
        v-if="showCancelSheet"
        :order-id="order.orderId"
        @close="showCancelSheet = false"
        @cancelled="onCancelled"
        @rejected="onRejected"
      />
    </template>

    <p v-else class="pay-skeleton">支付信息加载中…</p>
  </div>
</template>

<style scoped>
.pay-page {
  min-height: 100vh;
  /* 设计稿 .htmlBody：页面底色 #f9f9f9 + 底部为固定操作栏预留（按钮栏 69 + 间距） */
  padding-bottom: 84px;
  background: #f9f9f9;
}

.pay-appbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  border-bottom: 1px solid #e5e5e5;
  background: #f9f9f9;
}

.pay-back {
  position: absolute;
  left: 12px;
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

.pay-back svg {
  width: 16px;
  height: 16px;
}

.pay-appbar-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: #1a1c1c;
}

/* 倒计时卡：暖橙渐变 + 仅「支付剩余时间」与倒计时大字 */
.pay-countdown-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 16px 19px;
  border-bottom: 1px solid #ffedd5;
  box-shadow: 0 1px 2px 0 #0000000d;
  background-image: linear-gradient(180deg, #fff7edcc 0%, #fffbeb80 50%, #f9f9f9 100%);
}

.pay-countdown-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 2px 10px;
  border-radius: 12px;
  background: #ffedd599;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--color-primary);
}

.pay-clock {
  width: 13px;
  height: 13px;
}

.pay-countdown {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: -0.7px;
  color: var(--color-primary);
}

.pay-countdown.is-expired {
  font-size: 22px;
  color: #999999;
}

.pay-countdown.is-waiting {
  color: #999999;
}

.pay-main {
  padding-top: 10px;
}

/* 通栏白底分段（设计稿 .section：上下 1px 边线、无圆角） */
.pay-section {
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
  background: #ffffff;
}

.pay-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 13px;
  border-bottom: 1px solid #e5e5e5;
}

.pay-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 23px;
  letter-spacing: -0.37px;
  color: #1a1c1c;
}

.pay-cancel-entry {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #999999;
}

.pay-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 16px 16px 15px;
  border-bottom: 1px solid #e5e5e5;
  list-style: none;
}

.pay-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pay-thumb {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 4px;
  /* 商品图占位（接口 image 缺失时保持设计稿尺寸，不引入外部素材） */
  background: #f6f7f9;
}

.pay-item-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  margin-left: 12px;
}

.pay-item-name {
  font-size: 15px;
  font-weight: 500;
  line-height: 19px;
  color: #1a1c1c;
}

.pay-item-qty {
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

.pay-item-price {
  font-size: 15px;
  font-weight: 600;
  line-height: 23px;
  color: #1a1c1c;
}

.pay-amounts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 16px 15px;
  border-bottom: 1px solid #e5e5e5;
}

.pay-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pay-amount-label {
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  color: #666666;
}

.pay-amount-value {
  font-size: 14px;
  line-height: 21px;
  color: #1a1c1c;
}

.pay-amount-row[data-kind='discount'] .pay-amount-value {
  color: var(--color-primary);
}

/* 实付行：上方分隔线 + 品牌橙大字（设计稿 .horizontalBorder3） */
.pay-amount-row.is-payable {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
}

.pay-amount-row.is-payable .pay-amount-label {
  font-size: 15px;
  line-height: 23px;
  color: #1a1c1c;
}

.pay-payable {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-size: 22px;
  font-weight: 700;
  line-height: 22px;
  letter-spacing: -0.55px;
  color: var(--color-primary);
}

.pay-yuan {
  font-size: 14px;
  font-style: normal;
}

.pay-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.pay-info-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pay-info-line--top {
  align-items: flex-start;
  padding-top: 2px;
}

.pay-info-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #666666;
}

.pay-info-value {
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  color: #1a1c1c;
}

.pay-order-no {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pay-order-id {
  font-size: 13px;
  line-height: 20px;
  letter-spacing: -0.32px;
  color: #1a1c1c;
}

.pay-copy {
  display: inline-flex;
  align-items: center;
  border: none;
  border-radius: 2px;
  background: none;
  padding: 2px;
  color: var(--color-primary);
}

.pay-copy svg {
  width: 11px;
  height: 13px;
}

.pay-address {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
}

.pay-address-main {
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  color: #1a1c1c;
}

.pay-address-sub {
  padding-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #666666;
}

.pay-tip {
  margin: 0;
  padding: 0 16px 8px;
  font-size: 12px;
  color: #999999;
}

/* 底部固定操作栏（设计稿 .container30：高 69、上 1px 边线、内边距 12） */
.pay-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  padding: 12px;
  border-top: 1px solid #e5e5e5;
  background: #ffffff;
}

.pay-missing,
.pay-skeleton {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999;
}
</style>
