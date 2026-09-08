<script setup lang="ts">
/**
 * 订单列表页（视觉真源：docs/design/exports/用户端/06-订单/01-订单列表，390 宽）
 * 2026-09-07 TDD 落地（T40-T42）：
 * - 订单卡由订单列表接口返回，金额、状态、时间使用接口值（PRD 7.16 订单列表行）
 * - P0 仅"全部"筛选（待支付/待评价筛选在对应 P1 扩展后出现）；订单按创建时间倒序（TC-ORD-013）
 * - 空结果显示空态；点击卡片进入订单详情；回到列表重新请求，不沿用过期列表
 * TODO(第三批 TDD)：待支付去支付/已完成再来一单等状态操作（P1 扩展实施后）
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { orderApi } from '@/services/api'
import { formatMoney, formatTime, normalizeOrderSummary, statusText } from '@/services/normalizers'
import { useCatalogStore } from '@/stores/catalogStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { OrderSummary } from '@/services/api/types'

const router = useRouter()
const catalogStore = useCatalogStore()
const sessionStore = useSessionStore()

const orders = ref<OrderSummary[]>([])
const loading = ref(false)

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
            <span class="ol-status">{{ statusText(order.status) }}</span>
          </div>
          <div class="ol-meta-row">
            <span class="ol-time">{{ formatTime(order.createdAt) }}</span>
            <span class="ol-amount">实付 ¥{{ formatMoney(order.amounts.payableAmount) }}</span>
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
  background: #f9f9f9;
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

.ol-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.ol-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
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

.ol-empty {
  background: #fff;
  border-radius: 8px;
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
