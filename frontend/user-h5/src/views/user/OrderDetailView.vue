<script setup lang="ts">
/**
 * 订单详情页（视觉真源：docs/design/exports/用户端/06-订单/02-订单详情，390 宽）
 * 2026-09-07 TDD 落地（T43-T44）：
 * - 订单编号来自路由参数；状态/下单时间/收货信息/商品明细/金额明细全部来自详情接口
 * - 商品显示下单快照，不跟随当前商品改价（PRD 订单详情内容行，TC-ORD-002）
 * - 金额明细展示后端金额快照三件套：商品小计 + 打包费 = 实付（TC-ORD-022；PRD 7.4"不单列打包费行"
 *   决议仅限确认订单页，详情页按 TC-ORD-022 展示三件套）
 * - 订单不存在：提示并返回订单列表（PRD 顶部栏行）
 * TODO(第三批 TDD)：状态驱动的底部操作区（去支付/再来一单，P1 扩展后）；联系商家入口（消息扩展）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '@/services/api'
import { formatMoney, formatTime, statusText } from '@/services/normalizers'
import type { OrderDetail } from '@/services/api/types'

const route = useRoute()
const router = useRouter()

const orderId = typeof route.params.orderId === 'string' ? route.params.orderId : ''
const order = ref<OrderDetail | null>(null)
const missing = ref(false)

const createdTime = computed(() => (order.value ? formatTime(order.value.createdAt) : ''))

onMounted(async () => {
  if (!orderId) {
    // 编号缺失返回列表并提示（PRD 顶部栏行）
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
    return
  }
  try {
    order.value = await orderApi.getOrder(orderId)
  } catch {
    // 订单不存在/无权限（TC-ORD-015，http 层已 toast）：提示并返回列表
    missing.value = true
    window.setTimeout(() => void router.replace({ name: 'orders' }), 400)
  }
})

function goBack(): void {
  void router.push({ name: 'orders' })
}
</script>

<template>
  <div class="order-detail-page">
    <header class="od-header">
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
      <span class="od-title">订单详情</span>
      <span class="od-header-slot" />
    </header>

    <main class="od-main">
      <div v-if="missing" class="od-missing" data-testid="order-missing-tip">
        订单不存在或已删除，即将返回列表…
      </div>

      <div v-else-if="order" class="od-detail" data-testid="order-detail">
        <section class="od-card">
          <div class="od-head">
            <span class="od-status">{{ statusText(order.status) }}</span>
            <span class="od-no">订单号 {{ order.orderId }}</span>
          </div>
          <p class="od-time">下单时间：{{ createdTime }}</p>
        </section>

        <section class="od-card">
          <div class="od-section-title">收货信息</div>
          <p class="od-addr">
            {{ order.addressSnapshot.contactName }} {{ order.addressSnapshot.contactPhone }}
          </p>
          <p class="od-addr-sub">
            {{ order.addressSnapshot.region }} {{ order.addressSnapshot.detail }}
          </p>
          <p v-if="order.remark" class="od-remark">备注：{{ order.remark }}</p>
        </section>

        <section class="od-card">
          <div class="od-section-title">{{ order.storeName }}</div>
          <div v-for="item in order.items" :key="item.productId" class="od-item">
            <span class="od-item-name">{{ item.name }}</span>
            <span class="od-item-price">¥{{ formatMoney(item.unitPrice) }}</span>
            <span class="od-item-qty">×{{ item.quantity }}</span>
          </div>

          <div class="od-amounts">
            <div class="od-amount-row">
              <span>商品小计</span>
              <span>¥{{ formatMoney(order.amounts.itemsTotal) }}</span>
            </div>
            <div class="od-amount-row">
              <span>打包费</span>
              <span>¥{{ formatMoney(order.amounts.packagingFee) }}</span>
            </div>
            <div class="od-amount-row od-amount-row--total">
              <span>实付</span>
              <span>¥{{ formatMoney(order.amounts.payableAmount) }}</span>
            </div>
          </div>
        </section>
      </div>
      <p v-else class="od-skeleton">详情加载中…</p>
    </main>
  </div>
</template>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  background: #f9f9f9;
}

.od-header {
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

.od-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #ff5a1f;
}

.od-back svg {
  width: 22px;
  height: 22px;
}

.od-title {
  font-size: 18px;
  font-weight: 600;
  color: #ff5a1f;
}

.od-header-slot {
  width: 32px;
}

.od-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.od-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.od-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.od-status {
  font-size: 16px;
  font-weight: 700;
  color: #ff5a1f;
}

.od-no {
  font-size: 12px;
  color: #666;
}

.od-time {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}

.od-section-title {
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f3f3f3;
  font-size: 15px;
  font-weight: 600;
  color: #1a1c1c;
}

.od-addr {
  font-size: 14px;
  color: #1a1c1c;
}

.od-addr-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #666;
}

.od-remark {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
}

.od-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 0;
}

.od-item-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #1a1c1c;
}

.od-item-price {
  font-size: 13px;
  color: #666;
}

.od-item-qty {
  font-size: 12px;
  color: #999;
}

.od-amounts {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #f3f3f3;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.od-amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
}

.od-amount-row--total {
  font-size: 15px;
  font-weight: 700;
  color: #ff5a1f;
}

.od-missing {
  background: #fff;
  border-radius: 8px;
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
