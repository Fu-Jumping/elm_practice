<script setup lang="ts">
/**
 * 确认订单页（视觉真源：docs/design/exports/用户端/06-订单/04-确认订单，390 宽）
 * 2026-09-07 TDD 落地（T26-T30 + mock M1-M4）：
 * - 登录校验先行（未登录转登录带 redirect）；storeId 缺失返回商家列表（PRD 顶部栏行）
 * - 地址来自地址接口并默认选中默认地址；无地址禁用提交并引导新增（PRD 订单内容区行）
 * - 商品行来自该店购物车
 * - 金额明细按「基础四行 + 优惠项按实际发生展示」渲染（PRD 7.4 / 契约 §3.5，2026-09-11 定稿 CHG-004，
 *   批次① TODO-USER-001）：无优惠时实付 = 商品小计 + 打包费 2.00 + 配送费（店铺配置，未配置按 0）
 * - 金额以后端为准：前端合计仅作 expectedTotal 一致性提示（TC-ORD-011）
 * - 去支付只发一次创建订单请求；成功后清空该店购物车并进入支付页（PRD 底部结算栏行）
 * 口径差异备注：设计稿地址卡电话为脱敏展示、备注为弹层交互、支付方式区为 P1 扩展；
 * 本期按测试锁定口径完整号码 + 内联备注输入，支付方式区 P0 不渲染，视觉细化任务再对齐
 * 2026-09-08 缺陷修复：无地址引导块补点击（此前无点击事件，地址删光后只能退出页面新增）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addressApi, orderApi } from '@/services/api'
import { PACKAGING_FEE, buildAmountLines, formatMoney, payableAmountText } from '@/services/normalizers'
import { useCartStore } from '@/stores/cartStore'
import { useCatalogStore } from '@/stores/catalogStore'
import { useSessionStore } from '@/stores/sessionStore'
import { toast } from '@/utils/toast'
import type { Address } from '@/services/api/types'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const catalogStore = useCatalogStore()
const sessionStore = useSessionStore()

const storeId = typeof route.query.storeId === 'string' ? route.query.storeId : ''

const remark = ref('')
const addresses = ref<Address[]>([])
const loaded = ref(false)
const submitting = ref(false)

/** 地址选择回填（PRD 873）：query.addressId（地址列表选择返回）优先，否则默认地址 */
const selectedAddressId = computed(() =>
  typeof route.query.addressId === 'string' ? route.query.addressId : '',
)

const defaultAddress = computed(() => {
  const bySelected = selectedAddressId.value
    ? addresses.value.find((item) => item.addressId === selectedAddressId.value)
    : undefined
  return bySelected ?? addresses.value.find((item) => item.isDefault) ?? null
})

/** 点地址卡/无地址引导 → 地址列表选择模式（携带 select 与 storeId，不直接创建订单） */
function pickAddress(): void {
  void router.push({ name: 'address-list', query: { select: '1', storeId } })
}
const storeName = computed(() => catalogStore.storeDetail?.name ?? '')

/** 店铺配送费（契约 §3.5：配送费默认 ¥3.00、店铺可配、未配置按 0） */
const deliveryFee = computed(() => catalogStore.storeDetail?.deliveryFee ?? 0)

/**
 * 实付金额预览：商品小计 + 打包费 + 配送费（无优惠退化口径；后端计价为准，TC-ORD-011）
 * 优惠项（满减/红包/新客立减/会员折扣/配送费优惠）待批次① 计价与红包选择接入后按实际发生传入
 */
const payableAmount = computed(() =>
  Number(
    payableAmountText({
      itemsTotal: cartStore.totalAmount,
      packagingFee: PACKAGING_FEE,
      deliveryFee: deliveryFee.value,
    }),
  ),
)

/**
 * 金额明细（CHG-004 定稿口径，批次① TODO-USER-001）：基础四行 + 优惠项按实际发生展示，
 * 与订单详情页、支付页共用 `normalizers.buildAmountLines` 唯一出口（本页暂无优惠数据源，
 * 未发生则整行不显示）；顺序固定 商品小计 → 打包费 → 配送费 → 优惠项 → 实付金额
 */
const amountLines = computed(() =>
  buildAmountLines({
    itemsTotal: cartStore.totalAmount,
    packagingFee: PACKAGING_FEE,
    deliveryFee: deliveryFee.value,
    payableAmount: payableAmount.value,
  }),
)

/** 店铺休息（CLOSED/TEMPORARILY_CLOSED 均不可下单，TC-ORD-006 前端侧） */
const storeClosed = computed(() => {
  const status = catalogStore.storeDetail?.status
  return status === 'CLOSED' || status === 'TEMPORARILY_CLOSED'
})

/** 起送金额差额（TC-ORD-009 前端侧）：商品小计不足起送价时返回差额 */
const belowMinimumDelta = computed(() => {
  const start = catalogStore.storeDetail?.startPrice ?? 0
  const delta = start - cartStore.totalAmount
  return delta > 0 ? delta : 0
})

/** 提交阻断原因（PRD 851 行：禁止提交并说明原因；关店优先于起送） */
const blockReason = computed(() => {
  if (storeClosed.value) return '商家休息中，暂不能下单'
  const delta = belowMinimumDelta.value
  if (delta > 0) {
    return `还差 ¥${formatMoney(delta)} 起送（满 ¥${formatMoney(catalogStore.storeDetail?.startPrice ?? 0)} 可下单）`
  }
  return ''
})

const submitDisabled = computed(
  () =>
    submitting.value ||
    !defaultAddress.value ||
    cartStore.lines.length === 0 ||
    storeClosed.value ||
    belowMinimumDelta.value > 0,
)

onMounted(async () => {
  // 登录校验先行（T27，PRD：未登录转登录）；探活失败保持未登录 → 跳登录
  if (!sessionStore.isLoggedIn) {
    await sessionStore.checkLogin()
    if (!sessionStore.isLoggedIn) {
      void router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }
  }
  // 参数缺失返回商家列表（T30，PRD 顶部栏行：参数缺失或商家不存在返回列表）
  if (!storeId) {
    void router.replace({ name: 'home' })
    return
  }
  void catalogStore.fetchStoreDetail(storeId)
  // 地址与购物车并行加载；地址失败不阻塞页面（展示为无地址引导）
  await Promise.all([
    addressApi
      .getAddresses()
      .then((list) => {
        addresses.value = list
      })
      .catch(() => {
        addresses.value = []
      }),
    cartStore.fetchCart(storeId),
  ])
  loaded.value = true
})

/** 提交创建订单：只发一次请求；成功前不清购物车，成功后经购物车接口刷新清空（PRD 结算栏行） */
async function submitOrder(): Promise<void> {
  if (submitDisabled.value || !defaultAddress.value) return
  submitting.value = true
  try {
    const created = await orderApi.createOrder({
      storeId,
      addressId: defaultAddress.value.addressId,
      remark: remark.value.trim() || undefined,
      expectedTotal: payableAmount.value,
    })
    // 成功后由明确前端流程清空该店购物车：经购物车接口重查（mock 后端已清空，TC-ORD-003）
    await cartStore.fetchCart(storeId)
    toast('下单成功')
    // PRD 7.5：创建订单成功后进入支付页（待支付收银台；批次⑩ 105 起取代原先跳订单列表）
    await router.push({ name: 'order-pay', params: { orderId: created.orderId } })
  } catch {
    // 失败停留当前页并保留表单（PRD）；错误提示由 http 层统一 toast
  } finally {
    submitting.value = false
  }
}

/** 返回目标为当前商家详情（PRD 顶部栏行），无历史时兜底回首页 */
function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.replace({ name: 'home' })
}
</script>

<template>
  <div class="confirm-order-page">
    <header class="co-header">
      <button class="co-back" type="button" aria-label="返回" @click="goBack">
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
      <span class="co-title">确认订单</span>
      <span class="co-header-slot" />
    </header>

    <main class="co-main">
      <!-- 地址卡（设计稿：地址/标签/联系人/电话；默认选中默认地址） -->
      <section v-if="defaultAddress" class="co-card co-address" data-testid="address-card" role="button" @click="pickAddress">
        <div class="co-address-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 21s-6-5.1-6-10a6 6 0 1 1 12 0c0 4.9-6 10-6 10z"
              fill="#ff5a1f"
            />
            <circle cx="12" cy="11" r="2.2" fill="#fff" />
          </svg>
        </div>
        <div class="co-address-body">
          <div class="co-address-title">
            <span class="co-address-detail">{{ defaultAddress.detail }}</span>
            <span v-if="defaultAddress.label" class="co-address-tag">{{ defaultAddress.label }}</span>
          </div>
          <p class="co-address-sub">
            {{ defaultAddress.contactName }}（{{ defaultAddress.contactSex }}）
            {{ defaultAddress.contactPhone }}
          </p>
          <p class="co-address-region">{{ defaultAddress.region }}</p>
        </div>
        <span class="co-chevron" aria-hidden="true">›</span>
      </section>
      <section
        v-else-if="loaded"
        class="co-card co-address-missing"
        data-testid="address-missing-tip"
        role="button"
        @click="pickAddress"
      >
        <span>请先添加收货地址</span>
        <span class="co-address-guide">去添加 ›</span>
      </section>
      <section v-else class="co-card co-skeleton">地址加载中…</section>

      <!-- 送达时间（PRD：默认"尽快送达"，实际时间为演示计算值） -->
      <section class="co-card co-delivery">
        <span class="co-delivery-label">送达时间</span>
        <span class="co-delivery-value">尽快送达</span>
      </section>

      <!-- 商品清单（来自该店购物车接口；设计稿为通栏白底分段 padding 10px 12px） -->
      <section class="co-card co-goods">
        <div v-if="storeName" class="co-store">{{ storeName }}</div>
        <div v-if="cartStore.lines.length" class="co-items" data-testid="order-items">
          <div v-for="line in cartStore.lines" :key="line.cartLineId" class="co-item">
            <span class="co-item-name">{{ line.name }}</span>
            <span class="co-item-price">{{ formatMoney(line.unitPrice) }}</span>
            <span class="co-item-qty">×{{ line.quantity }}</span>
          </div>
        </div>
        <p v-else-if="loaded" class="co-cart-empty">购物车为空</p>
        <p v-else class="co-skeleton">商品加载中…</p>
      </section>

      <!-- 订单备注（设计稿为弹层交互，本期内联输入；最多 50 字；通栏白底分段 padding 18px 12px） -->
      <section class="co-card co-remark">
        <div class="co-remark-label">订单备注</div>
        <textarea
          v-model="remark"
          class="co-remark-input"
          data-testid="remark-input"
          rows="2"
          maxlength="50"
          placeholder="口味、偏好等（最多50字）"
        />
      </section>
    </main>

    <!-- 底部结算栏（设计稿：全宽橙色去支付；实付含打包费与配送费，标注预估） -->
    <footer class="co-settle">
      <div class="co-settle-main">
        <p v-if="blockReason" class="co-block-tip" data-testid="submit-block-tip">
          {{ blockReason }}
        </p>
        <!-- 预估提示（PRD 7.4：金额以后端计价为准，前端合计不得作为最终金额）：
             用户端没有满减/新客立减/免配送费的查询接口，下单前无法预知这些优惠，故此处标注为预估 -->
        <p class="co-estimate-tip" data-testid="amount-estimate-tip">预估金额，最终以下单时计价为准</p>
        <div class="co-payable-row">
          <div class="co-amount-detail" data-testid="amount-detail">
            <p
              v-for="line in amountLines"
              :key="line.key"
              class="co-amount-line"
              data-testid="amount-line"
              :data-key="line.key"
              :data-kind="line.kind"
            >
              {{ line.label }} <span class="co-amount-value">{{ line.text }}</span>
            </p>
          </div>
          <button
            class="co-submit"
            type="button"
            data-testid="submit-order-btn"
            :disabled="submitDisabled"
            @click="submitOrder"
          >
            {{ submitting ? '提交中' : '去支付' }}
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.confirm-order-page {
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: 76px;
}

.co-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.co-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #ff5a1f;
}

.co-back svg {
  width: 22px;
  height: 22px;
}

.co-title {
  font-size: 18px;
  font-weight: 600;
  color: #ff5a1f;
}

.co-header-slot {
  width: 32px;
}

.co-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 通栏：左右不内缩（设计稿 main 为 px-0 + 12px 灰缝，2026-09-08 去卡片壳） */
  padding: 12px 0;
}

/* 通栏白底分段（设计稿无圆角/无阴影/无左右外边距；类名沿用 co-card 以兼容既有断言脚本与文档引用） */
.co-card {
  background: #fff;
  padding: 12px;
}

.co-skeleton {
  color: #999;
  font-size: 14px;
}

/* 地址卡（设计稿：通栏白底，padding 24px 12px） */
.co-address {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 12px;
}

.co-address-icon {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 90, 31, 0.1);
}

.co-address-icon svg {
  width: 22px;
  height: 22px;
}

.co-address-body {
  flex: 1;
  min-width: 0;
}

.co-address-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.co-address-detail {
  font-size: 17px;
  font-weight: 700;
  color: #1a1c1c;
}

.co-address-tag {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  color: #ff5a1f;
  background: rgba(255, 90, 31, 0.1);
}

.co-address-sub {
  margin-top: 4px;
  font-size: 14px;
  color: #666;
}

.co-address-region {
  margin-top: 2px;
  font-size: 12px;
  color: #999;
}

.co-chevron {
  color: #999;
  font-size: 20px;
}

.co-address-missing {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #1a1c1c;
  font-size: 15px;
}

.co-address-guide {
  color: #ff5a1f;
  font-size: 14px;
}

/* 送达时间（设计稿：通栏白底，padding 18px 12px） */
.co-delivery {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 12px;
}

.co-delivery-label {
  font-size: 14px;
  color: #1a1c1c;
  font-weight: 500;
}

.co-delivery-value {
  font-size: 14px;
  color: #1a1c1c;
}

/* 商品清单（设计稿：通栏白底，padding 10px 12px） */
.co-goods {
  padding: 10px 12px;
}

.co-store {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e5e5;
  font-size: 16px;
  font-weight: 600;
  color: #1a1c1c;
}

.co-items {
  display: flex;
  flex-direction: column;
}

.co-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 0;
}

.co-item-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #1a1c1c;
}

.co-item-price {
  font-size: 14px;
  font-weight: 600;
  color: #ff5a1f;
}

.co-item-qty {
  font-size: 12px;
  color: #666;
}

.co-cart-empty {
  margin-top: 8px;
  font-size: 14px;
  color: #999;
}

/* 备注（设计稿：通栏白底，padding 18px 12px，右侧灰字 + 箭头弹层；本期内联输入，仅去卡片壳） */
.co-remark {
  padding: 18px 12px;
}

.co-remark-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1c1c;
}

.co-remark-input {
  width: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 8px;
  font-size: 14px;
  color: #1a1c1c;
  resize: none;
  box-sizing: border-box;
}

/* 底部结算栏 */
.co-settle {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #e5e5e5;
}

.co-settle-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.co-block-tip {
  margin: 0;
  font-size: 12px;
  color: #ba1a1a;
}

.co-estimate-tip {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.co-payable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.co-amount-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.co-amount-line {
  margin: 0;
  font-size: 12px;
  color: #666;
}

/* 优惠项以品牌橙负数展示（CHG-004，base 行保持次要色） */
.co-amount-line[data-kind='discount'] .co-amount-value {
  color: #ff5a1f;
}

/* 实付金额行：基础四行的最后一行，品牌橙加粗（与订单详情页、支付页同口径） */
.co-amount-line[data-kind='payable'] {
  color: #1a1c1c;
  font-size: 14px;
}

.co-amount-line[data-kind='payable'] .co-amount-value {
  font-size: 18px;
  font-weight: 700;
  color: #ff5a1f;
}

.co-submit {
  min-width: 128px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #ff5a1f;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.co-submit:disabled {
  opacity: 0.5;
}
</style>
