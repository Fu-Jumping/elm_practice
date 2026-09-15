<template>
  <div ref="pageRef" class="category-page" data-testid="category-store-page">
    <!-- 顶部栏（PRD 7.16.1「分类商家列表页-顶部栏与筛选栏」）：返回 + 页面标题 -->
    <header class="cl-header">
      <button class="cl-back" type="button" aria-label="返回" data-testid="category-back" @click="onBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <h1 class="cl-title" data-testid="category-title">{{ categoryTitle }}</h1>
    </header>
    <!-- 定位：与首页/搜索结果页同口径（设计真源 03-搜索与商家列表/02 顶部栏第二行；PRD 7.16.1）——已登录无地址占位「选择收货地址」，未登录/读取失败回退课程演示地址 -->
    <p class="cl-location" data-testid="category-location" :title="isDemoLocation ? '演示地址' : undefined">
      <span class="cl-location-icon" aria-hidden="true">◎</span>{{ locationText }}
    </p>

    <!-- 缺分类参数：防御性提示，不发起请求（PRD「不得用演示数据伪装」的边界场景） -->
    <p v-if="missingCategory" class="cl-hint" data-testid="category-hint">
      缺少分类参数，暂时无法加载商家
    </p>
    <template v-else>
      <!-- 排序栏：默认综合，取值与接口契约 §3.2 一致（综合/销量/距离） -->
      <nav class="cl-sort" data-testid="category-sort">
        <button
          v-for="option in SORT_OPTIONS"
          :key="option"
          class="cl-sort-item"
          :class="{ 'is-active': sort === option }"
          :data-testid="`sort-${option}`"
          type="button"
          @click="changeSort(option)"
        >
          {{ option }}
        </button>
      </nav>

      <!-- 首次加载：卡片占位（PRD 检查列） -->
      <div v-if="loading && !stores.length" class="cl-skeleton" data-testid="category-skeleton">
        <div v-for="n in 3" :key="n" class="cl-skeleton-card"></div>
      </div>
      <!-- 失败且无已展示结果：错误态 + 重试 -->
      <div v-else-if="errorMessage && !stores.length" class="cl-error" data-testid="category-error">
        <p class="cl-error-text">{{ errorMessage }}</p>
        <button class="cl-retry" type="button" data-testid="category-retry" @click="load">重试</button>
      </div>
      <!-- 空数组即空态，不得用演示数据伪装成功（PRD 字段列） -->
      <div v-else-if="!stores.length" class="cl-empty" data-testid="category-empty">
        <p class="cl-empty-text">该分类暂无商家</p>
        <button class="cl-empty-back" type="button" data-testid="category-empty-back" @click="onBack">
          返回
        </button>
      </div>
      <template v-else>
        <!-- 失败但已有结果：保留已展示结果 + 重试入口（PRD 检查列） -->
        <div v-if="errorMessage" class="cl-error-banner" data-testid="category-error-banner">
          <span class="cl-error-text">{{ errorMessage }}</span>
          <button class="cl-retry cl-retry--inline" type="button" data-testid="category-retry" @click="load">
            重试
          </button>
        </div>
        <ul class="cl-list" data-testid="category-store-list">
          <li
            v-for="store in stores"
            :key="store.storeId"
            class="cl-card"
            data-testid="category-store-card"
            @click="goStore(store.storeId)"
          >
            <div class="cl-card-head">
              <span class="cl-name">{{ store.name }}</span>
              <span class="cl-rating">{{ store.rating }}</span>
              <!-- 店铺关闭时展示不可购买提示（PRD 检查列） -->
              <span
                v-if="store.status !== 'OPEN'"
                class="cl-closed"
                data-testid="category-store-closed"
              >
                休息中 · 暂不可下单
              </span>
            </div>
            <p class="cl-meta">
              <span>月售{{ store.monthlySales }}</span>
              <span>{{ store.deliveryMinutes }}分钟</span>
              <!-- 距离来自接口，缺失整段隐藏（不显示 undefined） -->
              <span v-if="store.distanceText">{{ store.distanceText }}</span>
            </p>
            <p class="cl-fee">
              <span>起送 ¥{{ formatMoney(store.startPrice) }}</span>
              <span>配送 ¥{{ formatMoney(store.deliveryFee) }}</span>
            </p>
            <!-- 促销标签只有接口明确返回时展示（PRD 字段列） -->
            <p v-if="store.couponTags?.length" class="cl-tags">
              <span
                v-for="tag in store.couponTags"
                :key="tag"
                class="cl-tag"
                data-testid="category-store-tag"
              >
                {{ tag }}
              </span>
            </p>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 分类商家列表页（TODO-USER-107 ②，PRD 7.16.1 两行逐区行 + 契约 §3.2）
 *
 * 口径要点：
 * - 分类来源为**店铺自身** `categories`，请求 `GET /stores?categoryId=&sort=`；
 *   平台级「10 类」本期不做（CHG-001），故本页不伪造任何分类数据。
 * - 排序取值按契约 §3.2 = 综合/销量/距离（最小取值），与搜索结果页共用同一组选项。
 * - 「筛选」按钮与 `page`/`size` 分页：PRD 817/818 与契约 §1.3/§3.2 存在口径冲突
 *   （§1.3 明确「分页接口唯一例外是 §3.6 搜索」，`GET /stores` 返回裸数组），
 *   本页按契约实现（不分页、无筛选），冲突已登记待裁定，详见 TODO-USER-107 证据列。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addressApi, storeApi } from '@/services/api'
import { useSessionStore } from '@/stores/sessionStore'
import type { SearchSort, StoreSummary } from '@/services/api/types'
import { SEARCH_SORT_OPTIONS } from '@/services/api/types'
import { formatMoney } from '@/services/normalizers'
import { DEMO_LOCATION, LOCATION_LOAD_FAILED, resolveLocationState } from '@/utils/location'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const SORT_OPTIONS = SEARCH_SORT_OPTIONS

const pageRef = ref<HTMLElement | null>(null)

/** 分类编号来自路由参数（PRD：来源为店铺自身 `categories`） */
const categoryId = computed(() => {
  const raw = route.params.categoryId
  return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '')
})
/** 分类名来自页面参数（契约无「按分类编号取分类名」接口，故由入口传入；缺失回退通用标题） */
const categoryName = ref(String(route.query.name ?? '').trim())
const categoryTitle = computed(() => categoryName.value || '分类商家')

const sort = ref<SearchSort>(
  (SORT_OPTIONS as string[]).includes(String(route.query.sort))
    ? (String(route.query.sort) as SearchSort)
    : '综合',
)

const stores = ref<StoreSummary[]>([])
const loading = ref(false)
const errorMessage = ref('')
const missingCategory = computed(() => categoryId.value === '')

/**
 * 定位文案：与首页/搜索结果页同口径（PRD 7.16.1 分类商家列表页-顶部栏；
 * 2026-09-15 口径变更·方案 C，唯一出口 utils/location）：已登录有地址取默认地址 region；
 * 已登录无地址占位「选择收货地址」；未登录/读取失败回退演示地址并标记。
 */
const locationText = ref(DEMO_LOCATION)
const isDemoLocation = ref(true)

async function loadLocation(): Promise<void> {
  let state = LOCATION_LOAD_FAILED
  try {
    if (!sessionStore.isLoggedIn) await sessionStore.checkLogin()
    const addresses = sessionStore.isLoggedIn ? await addressApi.getAddresses() : null
    state = resolveLocationState({ isLoggedIn: sessionStore.isLoggedIn, addresses })
  } catch {
    // PRD 检查列：读取地址失败保留默认演示地址并标记为演示数据
  }
  locationText.value = state.text
  isDemoLocation.value = state.isDemoLocation
}

/** 请求序号：只接受最后一次请求的结果（PRD：不以外端旧列表冒充新结果） */
let requestSeq = 0

onMounted(() => {
  void loadLocation()
  if (categoryId.value) void load()
})

async function load(): Promise<void> {
  if (!categoryId.value) return
  const seq = ++requestSeq
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await storeApi.getStoreList({ categoryId: categoryId.value, sort: sort.value })
    if (seq !== requestSeq) return // 过期响应丢弃，不覆盖后发结果
    stores.value = result
  } catch (error) {
    if (seq !== requestSeq) return
    // 失败保留已展示结果（不清空 stores），并提供重试（PRD 检查列）
    errorMessage.value = error instanceof Error ? error.message : '加载失败，请重试'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

/** 切换排序：同项不重复请求；否则带新排序重新请求并回到顶部（PRD 点击列） */
function changeSort(option: SearchSort): void {
  if (sort.value === option) return
  sort.value = option
  void router.replace({
    name: 'category-store-list',
    params: { categoryId: categoryId.value },
    query: { ...(categoryName.value ? { name: categoryName.value } : {}), sort: option },
  })
  scrollListToTop()
  void load()
}

/** 回到列表顶部：向上找最近的可滚容器（真实运行是布局层 `.app-main`；无则可滚祖先时静默跳过） */
function scrollListToTop(): void {
  let el: HTMLElement | null = pageRef.value
  while (el) {
    if (el.scrollHeight > el.clientHeight + 1) {
      el.scrollTop = 0
      return
    }
    el = el.parentElement
  }
}

function goStore(storeId: string): void {
  void router.push({ name: 'store-detail', params: { storeId } })
}

/** 返回上一页；无上一页时回首页（与搜索结果页同口径） */
function onBack(): void {
  if (window.history.length > 1) router.back()
  else void router.push({ name: 'home' })
}
</script>

<style scoped>
.category-page {
  min-height: 100%;
  background: var(--color-background);
}
.cl-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface-white);
}
.cl-back {
  flex: none;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
}
.cl-back svg {
  width: 20px;
  height: 20px;
}
.cl-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.cl-location {
  margin: 0;
  padding: 8px 12px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.cl-location-icon {
  margin-right: 4px;
  color: var(--color-primary);
}
.cl-sort {
  display: flex;
  gap: 18px;
  padding: 10px 12px;
  background: var(--color-surface-white);
}
.cl-sort-item {
  border: none;
  background: none;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.cl-sort-item.is-active {
  color: var(--color-primary);
  font-weight: 500;
}
.cl-hint,
.cl-empty-text,
.cl-error-text {
  margin: 0;
  padding: 24px 12px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}
.cl-skeleton {
  padding: 12px;
}
.cl-skeleton-card {
  height: 88px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: var(--color-surface-container);
}
.cl-retry,
.cl-empty-back {
  display: block;
  margin: 0 auto 24px;
  padding: 8px 20px;
  border: 1px solid var(--color-primary);
  border-radius: 17px;
  background: none;
  color: var(--color-primary);
  font-size: 14px;
  cursor: pointer;
}
.cl-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 12px 12px 0;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--color-surface-container);
}
.cl-error-banner .cl-error-text {
  padding: 0;
  text-align: left;
}
.cl-retry--inline {
  margin: 0;
  padding: 4px 14px;
}
.cl-list {
  margin: 0;
  padding: 12px;
  list-style: none;
}
.cl-card {
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface-white);
  cursor: pointer;
}
.cl-card-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.cl-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.cl-rating {
  font-size: 13px;
  color: var(--color-primary);
}
.cl-closed {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-surface-container);
  font-size: 11px;
  color: var(--color-text-secondary);
}
.cl-meta,
.cl-fee {
  display: flex;
  gap: 12px;
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.cl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
}
.cl-tag {
  padding: 2px 8px;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--color-primary);
}
</style>
