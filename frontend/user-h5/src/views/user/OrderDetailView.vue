<script setup lang="ts">
/**
 * 订单详情页（含订单进度时间线）— 批次⑩ TODO-USER-104（2026-09-11，CHG-003 订单跟踪页并入本页）
 * 设计真源：docs/design/exports/用户端/12-订单与支付/01-订单详情-含订单跟踪/（390 宽 exact 复刻）
 * 口径出处：PRD 7.6（时间线文案 ↔ 状态值映射表）+ 7.16.1 订单详情页四行 + 契约 §3.5 + CHG-004（金额明细）
 * 关键口径：
 * - 时间线五节点 已下单/已支付/商家接单/配送中/已完成；已完成全部点亮；CANCELLED 不进时间线、整体置灰（PRD 7.6）
 * - 金额明细「基础四行 + 优惠项按实际发生展示」，行构造唯一出口在 normalizers.buildAmountLines（CHG-004）
 * - 取消按钮：待支付/待接单可用；商家接单（COOKING）及之后保留但置灰、点击提示「商家已接单，无法取消」
 *   （原生 disabled 会吞掉点击，故用 aria-disabled + is-disabled 视觉态；PRD 7.16.1 底部操作区行）
 * - 不提供「查看配送进度」按钮（配送进度由本页时间线与配送信息卡表达，CHG-002/003）
 * - 课程口径替换：配送服务方为课程占位文案（不出现「蜂鸟专送」）、支付方式显示「模拟支付」（不出现「微信支付」）
 * - 预计送达：契约 §3.5 无 ETA 字段 → 按 createdAt + 40 分钟本地推算（2026-09-11 负责人确认的课程演示口径）
 * - 取消确认弹层与评价/消息/再来一单跳转分别属 TODO-USER-002/003/004/008，本批先渲染按钮并给出占位提示
 * - 收货人电话按数据原样展示（PRD 未要求本页脱敏；商家端脱敏口径用于评价昵称）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '@/services/api'
import {
  buildAmountLines,
  formatMoney,
  formatTime,
  normalizeOrderDetail,
  statusText,
} from '@/services/normalizers'
import { useCatalogStore } from '@/stores/catalogStore'
import type { OrderDetail } from '@/services/api/types'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()

const orderId = typeof route.params.orderId === 'string' ? route.params.orderId : ''
const order = ref<OrderDetail | null>(null)
const missing = ref(false)
const refreshing = ref(false)
const refreshError = ref('')
const copyTip = ref(false)
const cancelTip = ref('')

/** 时间线五节点（PRD 7.6 文案 ↔ 状态值映射表，CHG-003） */
const TIMELINE_STEPS = ['已下单', '已支付', '商家接单', '配送中', '已完成'] as const
/** 状态 → 当前节点下标；PROCESSING 为 P0 遗留状态，按「制作中」等价档位展示（兼容历史数据） */
const STATUS_STEP_INDEX: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PENDING: 1,
  COOKING: 2,
  PROCESSING: 2,
  DELIVERING: 3,
  COMPLETED: 4,
}

const createdTime = computed(() => (order.value ? formatTime(order.value.createdAt) : ''))
const storeName = computed(() => catalogStore.storeDetail?.name ?? order.value?.storeId ?? '')

const isCancelled = computed(() => order.value?.status === 'CANCELLED')
const isCompleted = computed(() => order.value?.status === 'COMPLETED')
const currentStep = computed(() => (order.value ? STATUS_STEP_INDEX[order.value.status] ?? 0 : 0))

/** 节点状态：done 已达成 / current 当前节点（品牌橙实心+光环）/ todo 未达（PRD 7.16.1 状态头与时间线行） */
function stepState(index: number): 'done' | 'current' | 'todo' {
  if (!order.value || isCancelled.value) return 'todo'
  if (isCompleted.value) return 'done'
  if (index < currentStep.value) return 'done'
  if (index === currentStep.value) return 'current'
  return 'todo'
}

/** 已走过轨道宽度：按节点步长 1/4 推进；已取消回退到 0（时间线置灰）、已完成铺满 */
const trackWidth = computed(() => {
  if (!order.value || isCancelled.value) return '0%'
  if (isCompleted.value) return '100%'
  return `${(currentStep.value / (TIMELINE_STEPS.length - 1)) * 100}%`
})

/** 预计送达：契约无 ETA 字段，按 createdAt + 40 分钟本地推算（课程演示口径，2026-09-11 确认） */
const ETA_MINUTES = 40
const etaTime = computed(() => {
  if (!order.value) return ''
  const base = new Date(order.value.createdAt)
  if (Number.isNaN(base.getTime())) return ''
  const eta = new Date(base.getTime() + ETA_MINUTES * 60 * 1000)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(eta.getHours())}:${pad(eta.getMinutes())}`
})
const showEta = computed(() => !!order.value && !isCancelled.value && !isCompleted.value)

const amountLines = computed(() =>
  buildAmountLines({
    itemsTotal: order.value?.amounts.itemsTotal ?? 0,
    packagingFee: order.value?.amounts.packagingFee ?? 0,
    deliveryFee: order.value?.deliveryFee,
    discounts: order.value?.discounts,
    payableAmount: order.value?.amounts.payableAmount ?? 0,
  }),
)
const itemCount = computed(() =>
  (order.value?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
)

/** 底部操作区（PRD 7.16.1）：待支付/待接单可取消；已完成给去评价与再来一单；已取消无操作栏 */
const cancelEnabled = computed(
  () => order.value?.status === 'PENDING_PAYMENT' || order.value?.status === 'PENDING',
)
const isPendingPayment = computed(() => order.value?.status === 'PENDING_PAYMENT')
const hasFooter = computed(() => !!order.value && !isCancelled.value)
const showCancel = computed(() => !!order.value && !isCompleted.value)
const showReview = computed(() => isCompleted.value)
const showReorder = computed(() => isCompleted.value)

onMounted(async () => {
  if (!orderId) {
    // 编号缺失返回列表并提示（PRD 顶部栏行）
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
    return
  }
  try {
    const record = await orderApi.getOrder(orderId)
    order.value = normalizeOrderDetail(record)
    // 店名映射（后端订单记录无 storeName：经店铺详情接口取，失败降级 storeId）
    void catalogStore.fetchStoreDetail(order.value.storeId).catch(() => undefined)
  } catch {
    // 订单不存在/无权限（TC-ORD-015，http 层已 toast）：提示并返回列表
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
  }
})

function goBack(): void {
  void router.push({ name: 'orders' })
}

function goStore(): void {
  if (!order.value) return
  void router.push({ name: 'store-detail', params: { storeId: order.value.storeId } })
}

/** 待支付 → 支付页（收银台；批次⑩ 105） */
function goPay(): void {
  if (!order.value) return
  void router.push({ name: 'order-pay', params: { orderId: order.value.orderId } })
}

async function refreshOrder(): Promise<void> {
  if (refreshing.value) return
  refreshing.value = true
  refreshError.value = ''
  try {
    order.value = normalizeOrderDetail(await orderApi.getOrder(orderId))
  } catch {
    refreshError.value = '刷新失败，请检查网络后重试'
  } finally {
    refreshing.value = false
  }
}

async function onCopyOrderId(): Promise<void> {
  if (!order.value) return
  try {
    // 剪贴板不可用（非安全上下文/测试环境）时降级为仅提示，不阻断流程
    await navigator.clipboard?.writeText(order.value.orderId)
  } catch {
    /* 降级：复制失败仍给出提示，用户可手动选择订单号 */
  }
  copyTip.value = true
  window.setTimeout(() => {
    copyTip.value = false
  }, 1500)
}

/** 取消：可用态挂 TODO-USER-002 的确认弹层；置灰态给出原因提示（本批只做状态逻辑与提示） */
function onCancel(): void {
  if (!cancelEnabled.value) {
    cancelTip.value = '商家已接单，无法取消'
    window.setTimeout(() => {
      cancelTip.value = ''
    }, 2000)
    return
  }
  toast('取消订单确认弹层将随批次②接入')
}

/** 以下三个入口对应模块（批次③评价 / 批次④消息 / TODO-USER-008 再来一单）尚未实现，先给占位提示 */
function onContactMerchant(): void {
  toast('消息与联系商家将随批次④接入')
}
function onReview(): void {
  toast('评价提交页将随批次③接入')
}
function onReorder(): void {
  toast('再来一单将随批次⑩后续任务接入')
}
</script>

<template>
  <div class="order-detail-page">
    <div v-if="missing" class="od-missing" data-testid="order-missing-tip">
      订单不存在或已删除，即将返回列表…
    </div>

    <template v-else-if="order">
      <!-- data-testid 覆盖「状态横幅 + 内容区」（含状态头/时间线），底部操作栏在其外 -->
      <div class="od-content" data-testid="order-detail">
      <!-- 状态横幅：暖橙渐变底 + 顶部栏 + 状态头 + 五节点时间线（设计稿 .topWarmAmbientGradie） -->
      <div class="od-banner">
        <header class="od-appbar">
          <button class="od-back" type="button" aria-label="返回" data-testid="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 4.5L7.5 12L15 19.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <p class="od-appbar-title">订单详情</p>
          <button
            class="od-refresh"
            type="button"
            data-testid="refresh-order-btn"
            :disabled="refreshing"
            @click="refreshOrder"
          >
            {{ refreshing ? '刷新中…' : '刷新' }}
          </button>
        </header>

        <section class="od-status-head" data-testid="order-status-head">
          <div class="od-status-title">
            <p class="od-status-text">{{ statusText(order.status) }}</p>
            <svg class="od-status-icon" viewBox="0 0 16 19" aria-hidden="true">
              <path
                d="M2 1.5v16"
                fill="none"
                stroke="var(--color-primary)"
                stroke-width="1.6"
                stroke-linecap="round"
              />
              <path
                d="M4.5 2.5h8.2l-1.8 3 1.8 3H4.5z"
                fill="var(--color-primary)"
              />
            </svg>
          </div>
          <p v-if="showEta" class="od-eta">
            <svg class="od-eta-icon" viewBox="0 0 13 13" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.6" fill="none" stroke="var(--color-primary)" stroke-width="1.2" />
              <path d="M6.5 3.6v3.1l2.2 1.3" fill="none" stroke="var(--color-primary)" stroke-width="1.2" stroke-linecap="round" />
            </svg>
            <span>预计&nbsp;<b class="od-eta-time">{{ etaTime }}</b>&nbsp;送达</span>
          </p>
          <p v-if="isCancelled && order.cancelReason" class="od-cancel-reason" data-testid="cancel-reason">
            取消原因：{{ order.cancelReason }}
          </p>

          <div
            class="od-timeline"
            data-testid="order-timeline"
            :data-greyed="isCancelled ? 'true' : 'false'"
          >
            <div class="od-track">
              <div class="od-track-active" :style="{ width: trackWidth }" />
            </div>
            <div
              v-for="(step, index) in TIMELINE_STEPS"
              :key="step"
              class="od-step"
              data-testid="timeline-step"
              :data-state="stepState(index)"
            >
              <span class="od-node">
                <svg v-if="stepState(index) === 'done'" class="od-node-check" viewBox="0 0 10 7" aria-hidden="true">
                  <path
                    d="M1 3.4l2.6 2.6L9 1"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <i v-if="stepState(index) === 'current'" class="od-node-core" />
                <i v-if="stepState(index) === 'todo'" class="od-node-core od-node-core--todo" />
              </span>
              <span class="od-step-label">{{ step }}</span>
            </div>
          </div>
        </section>
      </div>

      <main class="od-main">
        <!-- 商家与商品卡：店名 + 纯展示标签 + 商品快照 + 金额明细（CHG-004）+ 件数与实付 -->
        <section class="od-card">
          <div class="od-merchant-head">
            <button class="od-store-entry" type="button" data-testid="store-entry" @click="goStore">
              <span class="od-store-name">{{ storeName }}</span>
              <svg class="od-store-arrow" viewBox="0 0 16 18" aria-hidden="true">
                <path
                  d="M6 4l5 5-5 5"
                  fill="none"
                  stroke="#9e9e9e"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <span class="od-merchant-tag">外卖自取/送达</span>
          </div>

          <ul class="od-dishes">
            <li v-for="item in order.items" :key="item.productId" class="od-dish">
              <span class="od-thumb" aria-hidden="true" />
              <span class="od-dish-info">
                <span class="od-dish-name">{{ item.name }}</span>
                <span class="od-dish-qty">x{{ item.quantity }}</span>
              </span>
              <span class="od-dish-price">¥ {{ formatMoney(item.unitPrice) }}</span>
            </li>
          </ul>

          <div class="od-amounts">
            <div
              v-for="line in amountLines"
              :key="line.key"
              class="od-amount-row"
              data-testid="amount-line"
              :data-key="line.key"
              :data-kind="line.kind"
            >
              <span class="od-amount-label">{{ line.label }}</span>
              <span class="od-amount-value">{{ line.text }}</span>
            </div>
          </div>

          <div class="od-total">
            <span class="od-total-count">共 {{ itemCount }} 件商品</span>
            <span class="od-total-pay">
              实付<i class="od-total-symbol">¥</i><b class="od-total-amount">{{ formatMoney(order.amounts.payableAmount) }}</b>
            </span>
          </div>
        </section>

        <!-- 配送信息卡 -->
        <section class="od-card">
          <h2 class="od-card-title">配送信息</h2>
          <div class="od-info-row">
            <span class="od-info-label">配送地址</span>
            <div class="od-info-value">
              <p class="od-addr-line">{{ order.addressSnapshot.region }} {{ order.addressSnapshot.detail }}</p>
              <p class="od-addr-sub">
                {{ order.addressSnapshot.contactName }} {{ order.addressSnapshot.contactPhone }}
              </p>
            </div>
          </div>
          <div class="od-info-row">
            <span class="od-info-label">配送服务</span>
            <!-- 课程演示占位文案（PRD 7.16.1：不出现「蜂鸟专送」等第三方字样） -->
            <div class="od-info-value od-service">
              <span class="od-service-tag">课程演示配送</span>
              <span class="od-info-text">由 课程演示配送 提供配送服务</span>
            </div>
          </div>
        </section>

        <!-- 订单信息卡 -->
        <section class="od-card">
          <h2 class="od-card-title">订单信息</h2>
          <div class="od-info-line">
            <span class="od-info-label">订单号</span>
            <span class="od-order-no">
              <span class="od-order-id">{{ order.orderId }}</span>
              <button class="od-copy" type="button" data-testid="copy-order-btn" @click="onCopyOrderId">
                复制
              </button>
            </span>
          </div>
          <p v-if="copyTip" class="od-tip" data-testid="copy-order-tip">已复制</p>
          <div class="od-info-line">
            <span class="od-info-label">下单时间</span>
            <span class="od-info-text">{{ createdTime }}</span>
          </div>
          <div class="od-info-line">
            <span class="od-info-label">支付方式</span>
            <!-- 课程口径：模拟支付（PRD 7.16.1：不出现「微信支付」等真实支付方式） -->
            <span class="od-info-text od-pay-method">
              <i class="od-pay-dot" aria-hidden="true" />模拟支付
            </span>
          </div>
        </section>

        <p v-if="refreshError" class="od-tip od-tip--error" role="alert">{{ refreshError }}</p>
      </main>
      </div>

      <!-- 底部操作区：取消按钮状态驱动；支付入口沿用 PaymentActions；不出现「查看配送进度」 -->
      <footer v-if="hasFooter" class="od-footer" data-testid="order-footer-actions">
        <p v-if="cancelTip" class="od-footer-tip" data-testid="cancel-disabled-tip">{{ cancelTip }}</p>
        <button
          v-if="showCancel"
          class="od-btn od-btn--ghost"
          :class="{ 'is-disabled': !cancelEnabled }"
          type="button"
          data-testid="cancel-order-btn"
          :aria-disabled="cancelEnabled ? 'false' : 'true'"
          @click="onCancel"
        >
          取消订单
        </button>
        <button class="od-btn od-btn--ghost" type="button" data-testid="contact-merchant-btn" @click="onContactMerchant">
          联系商家
        </button>
        <button v-if="showReorder" class="od-btn od-btn--ghost" type="button" data-testid="reorder-btn" @click="onReorder">
          再来一单
        </button>
        <button v-if="showReview" class="od-btn od-btn--primary" type="button" data-testid="goto-review-btn" @click="onReview">
          去评价
        </button>
        <!-- 待支付：主按钮进入支付页（批次⑩ 105 起由支付页承担收银台，本页不再内联支付动作） -->
        <button
          v-if="isPendingPayment"
          class="od-btn od-btn--primary"
          type="button"
          data-testid="order-pay-entry"
          @click="goPay"
        >
          去支付
        </button>
      </footer>
    </template>

    <p v-else class="od-skeleton">详情加载中…</p>
  </div>
</template>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  /* 设计稿 .frame5：页面底色 #f6f7f9 + 底部为固定操作栏预留 92px */
  padding-bottom: 92px;
  background: #f6f7f9;
}

/* 状态横幅：暖橙 → 页面底色的竖向渐变（设计稿 .topWarmAmbientGradie） */
.od-banner {
  background-image: linear-gradient(180deg, #fff0e8 0%, #fff7f2 50%, #f6f7f9 100%);
}

.od-appbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 16px;
}

.od-back {
  position: absolute;
  left: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #ffffff80;
  border-radius: 9999px;
  background: #ffffffb2;
  color: #1a1a1a;
  backdrop-filter: blur(6px);
}

.od-back svg {
  width: 10px;
  height: 17px;
}

.od-appbar-title {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.43px;
  color: #1a1a1a;
}

/* 刷新为设计稿外的功能入口（PRD 状态头异常列：失败保留结果并提供刷新），低视觉权重 */
.od-refresh {
  position: absolute;
  right: 16px;
  border: none;
  background: none;
  padding: 8px 0;
  font-size: 12px;
  color: #9e9e9e;
}

.od-status-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px 24px;
}

.od-status-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.od-status-text {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 39px;
  letter-spacing: -0.65px;
  color: #1a1a1a;
}

.od-status-icon {
  width: 16px;
  height: 19px;
}

.od-eta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 24px;
  padding: 3px 11px;
  border: 1px solid #ffd9cc99;
  border-radius: 9999px;
  background: #ffffffe5;
  font-size: 13px;
  line-height: 20px;
  color: #1a1a1a;
}

.od-eta-icon {
  width: 13px;
  height: 13px;
}

.od-eta-time {
  font-weight: 700;
  color: var(--color-primary);
}

.od-cancel-reason {
  margin: 0 0 16px;
  font-size: 12px;
  color: #9e9e9e;
}

/* 五节点时间线：轨道 + 节点（设计稿 .container5：高 46，轨道 3px） */
.od-timeline {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  align-self: stretch;
  height: 46px;
  padding: 0 8px;
}

.od-track {
  position: absolute;
  top: 11px;
  right: 26px;
  left: 26px;
  height: 3px;
  border-radius: 9999px;
  background: #e2e8f0e5;
}

.od-track-active {
  height: 3px;
  border-radius: 9999px;
  background-image: linear-gradient(90deg, #ff5a1f 0%, #ff7844 100%);
  transition: width 0.3s ease;
}

.od-step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 48px;
}

.od-step-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: #1a1a1a;
}

.od-node {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: var(--color-primary);
}

.od-node-check {
  width: 10px;
  height: 7px;
}

.od-node-core {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: var(--color-primary);
}

.od-node-core--todo {
  width: 6px;
  height: 6px;
  background: #94a3b8;
}

/* 当前节点：白底 + 品牌橙描边 + 光环（设计稿 .frame/.overlay） */
.od-step[data-state='current'] .od-node {
  position: relative;
  border: 2px solid var(--color-primary);
  background: #ffffff;
}

.od-step[data-state='current'] .od-node::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 9999px;
  background: #ff5a1f33;
}

.od-step[data-state='current'] .od-step-label {
  color: var(--color-primary);
}

/* 未达节点：灰底 + 白描边（设计稿 .backgroundBorder2） */
.od-step[data-state='todo'] .od-node {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  background: #e2e8f0;
}

/* 已取消：时间线整体置灰（PRD 7.6：CANCELLED 不进时间线） */
.od-timeline[data-greyed='true'] .od-node,
.od-timeline[data-greyed='true'] .od-node-check,
.od-timeline[data-greyed='true'] .od-node-core {
  background: #e2e8f0;
}

.od-timeline[data-greyed='true'] .od-node-check {
  display: none;
}

.od-timeline[data-greyed='true'] .od-step-label {
  color: #9e9e9e;
}

/* 内容区：卡片白底 + 1px 边线 + 8px 圆角（设计系统-用户端「订单详情页」行），无环境阴影 */
.od-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 0 16px;
}

.od-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid #f0f0f2cc;
  border-radius: 8px;
  background: #ffffff;
}

.od-card-title {
  display: flex;
  align-items: center;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 500;
  line-height: 23px;
  color: #1a1a1a;
}

.od-card-title::before {
  content: '';
  width: 4px;
  height: 14px;
  margin-right: 6px;
  border-radius: 9999px;
  background: var(--color-primary);
}

.od-merchant-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 13px;
  border-bottom: 1px solid #f0f0f2b2;
}

.od-store-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0;
}

.od-store-name {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: #1a1a1a;
}

.od-store-arrow {
  width: 16px;
  height: 18px;
}

.od-merchant-tag {
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: #9e9e9e;
}

.od-dishes {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 14px 0;
  list-style: none;
}

.od-dish {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.od-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border: 1px solid #0000000d;
  border-radius: 12px;
  /* 商品图占位：接口 image 缺失时保持设计稿缩略图尺寸，不用外部素材 */
  background: #f6f7f9;
}

.od-dish-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  margin-left: 12px;
}

.od-dish-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  color: #1a1a1a;
}

.od-dish-qty {
  font-size: 12px;
  line-height: 18px;
  color: #9e9e9e;
}

.od-dish-price {
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
  color: #1a1a1a;
}

.od-amounts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 13px;
  border-top: 1px solid #f0f0f2b2;
}

.od-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.od-amount-label {
  font-size: 13px;
  line-height: 20px;
  color: #757575;
}

.od-amount-value {
  font-size: 13px;
  line-height: 20px;
  color: #1a1a1a;
}

/* 优惠行：品牌橙负数（CHG-004） */
.od-amount-row[data-kind='discount'] .od-amount-value {
  font-weight: 700;
  color: var(--color-primary);
}

.od-amount-row[data-kind='payable'] .od-amount-value {
  font-weight: 700;
  color: #1a1a1a;
}

.od-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 15px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f2b2;
}

.od-total-count {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #9e9e9e;
}

.od-total-pay {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
  line-height: 20px;
  color: #757575;
}

.od-total-symbol {
  font-size: 15px;
  font-weight: 700;
  font-style: normal;
  color: var(--color-primary);
}

.od-total-amount {
  font-size: 24px;
  font-weight: 500;
  line-height: 36px;
  letter-spacing: -0.6px;
  color: var(--color-primary);
}

.od-info-row,
.od-info-line {
  display: flex;
  align-items: flex-start;
}

.od-info-row + .od-info-row,
.od-info-line + .od-info-line,
.od-info-line + .od-tip + .od-info-line {
  margin-top: 14px;
}

.od-info-label {
  flex-shrink: 0;
  width: 80px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #757575;
}

.od-info-value {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.od-info-line {
  align-items: center;
  justify-content: space-between;
}

.od-addr-line {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 21px;
  color: #1a1a1a;
}

.od-addr-sub {
  margin: 0;
  font-size: 12px;
  line-height: 20px;
  color: #757575;
}

.od-service {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.od-service-tag {
  flex-shrink: 0;
  padding: 1px 5px;
  border: 1px solid #ffd9cc;
  border-radius: 4px;
  background: #fff3ed;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: var(--color-primary);
}

.od-info-text {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: #1a1a1a;
}

.od-order-no {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.od-order-id {
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 0.32px;
  color: #1a1a1a;
}

.od-copy {
  padding: 1px 7px;
  border: 1px solid #ff5a1f66;
  border-radius: 9999px;
  background: #ff5a1f0d;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
  color: var(--color-primary);
}

.od-pay-method {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.od-pay-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: var(--color-primary);
}

.od-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #757575;
}

.od-tip--error {
  color: var(--color-error);
}

/* 底部操作区：固定浮动栏（设计稿 .footerFloatingBottom，含轻微上投影） */
.od-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  height: 72px;
  padding: 11px 16px 12px;
  border-top: 1px solid #f0f0f2cc;
  background: #fffffff2;
  box-shadow: 0 -4px 16px 0 #0000000a;
  backdrop-filter: blur(6px);
}

.od-btn {
  flex-shrink: 0;
  border-radius: 12px;
  padding: 9px 15px;
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
}

.od-btn--ghost {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #1a1a1a;
}

/* 置灰但保留可点击（点击给出原因提示，PRD 7.16.1 底部操作区行） */
.od-btn.is-disabled {
  border-color: #e5e5e5;
  color: #bfbfbf;
}

.od-btn--primary {
  border: none;
  background-image: linear-gradient(90deg, #ff5a1f 0%, #ff7133 100%);
  padding: 10px 16px;
  color: #ffffff;
}

.od-footer-tip {
  position: absolute;
  right: 16px;
  bottom: 78px;
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: #000000cc;
  font-size: 12px;
  color: #ffffff;
}

.od-missing {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999;
}

.od-skeleton {
  padding: 40px 12px;
  text-align: center;
  font-size: 14px;
  color: #999;
}
</style>
