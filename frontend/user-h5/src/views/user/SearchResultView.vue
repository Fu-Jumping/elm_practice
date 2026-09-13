<template>
  <div class="search-page" data-testid="search-page">
    <!-- 搜索头部（PRD 7.16.1「搜索结果页-搜索头部」）：返回 + 关键词输入（来自页面参数并保留）+ 搜索按钮 -->
    <header class="sr-header">
      <button class="sr-back" type="button" aria-label="返回" data-testid="search-back" @click="onBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <div class="sr-input-wrap">
        <input
          v-model="keywordInput"
          class="sr-input"
          type="search"
          data-testid="search-input"
          placeholder="搜索商家、商品"
          @keyup.enter="submit"
        />
      </div>
      <button class="sr-submit" type="button" data-testid="search-submit" :disabled="submitting" @click="submit">
        搜索
      </button>
    </header>
    <!-- 定位：与首页同口径（PRD 806/814）——未登录/无地址/读取失败回退课程演示地址 -->
    <p class="sr-location" :title="isDemoLocation ? '演示地址' : undefined">
      <span class="sr-location-icon" aria-hidden="true">◎</span>{{ locationText }}
    </p>

    <!-- 排序筛选栏（PRD「排序筛选栏」）：默认综合，可切 综合/销量/距离，切换即重新请求 -->
    <nav v-if="searched" class="sr-sort" data-testid="search-sort">
      <button
        v-for="option in SORT_OPTIONS"
        :key="option"
        class="sr-sort-item"
        :class="{ 'is-active': sort === option }"
        :data-testid="`sort-${option}`"
        type="button"
        @click="changeSort(option)"
      >
        {{ option }}
      </button>
    </nav>

    <!-- 状态与结果列表（PRD「商家结果列表」：加载占位 / 空态 + 回首页 / 失败重试 / 字段缺失只隐藏） -->
    <p v-if="hint" class="sr-hint" data-testid="search-hint">请输入关键词</p>
    <div v-else-if="loading && !merchants.length" class="sr-skeleton" data-testid="search-skeleton">
      <div v-for="n in 3" :key="n" class="sr-skeleton-card"></div>
    </div>
    <div v-else-if="errorMessage" class="sr-error" data-testid="search-error">
      <p class="sr-error-text">{{ errorMessage }}</p>
      <button class="sr-retry" type="button" data-testid="search-retry" @click="runSearch">重试</button>
    </div>
    <div v-else-if="!merchants.length" class="sr-empty" data-testid="search-empty">
      <p class="sr-empty-text">没有找到「{{ keyword }}」相关的商家</p>
      <button class="sr-empty-home" type="button" data-testid="search-empty-home" @click="goHome">
        回到首页
      </button>
    </div>
    <ul v-else class="sr-list" data-testid="search-merchant-list">
      <li
        v-for="store in merchants"
        :key="store.storeId"
        class="sr-card"
        data-testid="search-merchant-card"
        @click="goStore(store.storeId)"
      >
        <div class="sr-card-head">
          <span class="sr-name">{{ store.name }}</span>
          <span class="sr-rating">{{ store.rating }}</span>
        </div>
        <p class="sr-meta">
          <span>月售{{ store.monthlySales }}</span>
          <span>{{ store.deliveryMinutes }}分钟</span>
          <!-- 距离来自接口，缺失整段隐藏（不显示 undefined） -->
          <span v-if="store.distanceText">{{ store.distanceText }}</span>
        </p>
        <p class="sr-fee">
          <span>起送 ¥{{ formatMoney(store.startPrice) }}</span>
          <span>配送 ¥{{ formatMoney(store.deliveryFee) }}</span>
        </p>
        <!-- 促销标签只有接口明确返回时展示（PRD 字段列） -->
        <p v-if="store.couponTags?.length" class="sr-tags">
          <span
            v-for="tag in store.couponTags"
            :key="tag"
            class="sr-tag"
            data-testid="search-merchant-tag"
          >
            {{ tag }}
          </span>
        </p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchApi } from '@/services/api'
import type { SearchSort, StoreSummary } from '@/services/api/types'
import { SEARCH_SORT_OPTIONS } from '@/services/api/types'
import { formatMoney } from '@/services/normalizers'
import { DEMO_LOCATION } from '@/utils/location'

const route = useRoute()
const router = useRouter()

const SORT_OPTIONS = SEARCH_SORT_OPTIONS

/** 关键词：来自页面参数并在输入框中保留（PRD「搜索头部」） */
const keywordInput = ref(String(route.query.keyword ?? ''))
const keyword = ref(String(route.query.keyword ?? '').trim())
const sort = ref<SearchSort>(
  (SORT_OPTIONS as string[]).includes(String(route.query.sort))
    ? (String(route.query.sort) as SearchSort)
    : '综合',
)

const merchants = ref<StoreSummary[]>([])
const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const searched = ref(false)
/** 空关键词提示（PRD：空关键词不请求并提示输入关键词） */
const hint = computed(() => keyword.value === '' && !errorMessage.value)

/** 定位文案（PRD：来自当前默认地址、默认同首页；本批不做地址读取的重复实现，统一回退演示地址） */
const locationText = ref(DEMO_LOCATION)
const isDemoLocation = ref(true)

/**
 * 请求序号：只接受最后一次请求的结果（PRD「排序筛选栏」检查列：
 * 请求完成前禁止连续切换导致的旧结果覆盖新结果）
 */
let requestSeq = 0

/** 首次进入：带关键词则直接搜索；空关键词只提示不请求 */
onMounted(() => {
  if (keyword.value) void runSearch()
})

async function runSearch(): Promise<void> {
  if (!keyword.value) return
  const seq = ++requestSeq
  loading.value = true
  submitting.value = true
  errorMessage.value = ''
  try {
    const result = await searchApi.search({ keyword: keyword.value, sort: sort.value })
    if (seq !== requestSeq) return // 过期响应直接丢弃，不覆盖后发结果
    merchants.value = result.merchants.list
    searched.value = true
  } catch (error) {
    if (seq !== requestSeq) return
    // 失败保留关键词与已展示结果，并给出重试入口（PRD 检查列）
    errorMessage.value = error instanceof Error ? error.message : '搜索失败，请重试'
    searched.value = true
  } finally {
    if (seq === requestSeq) {
      loading.value = false
      submitting.value = false
    }
  }
}

/** 提交关键词：空关键词不请求（PRD：空关键词不请求并提示输入关键词） */
function submit(): void {
  const next = keywordInput.value.trim()
  if (!next) {
    keyword.value = ''
    void router.replace({ name: 'search', query: {} })
    return
  }
  keyword.value = next
  void router.replace({ name: 'search', query: { keyword: next, sort: sort.value } })
  void runSearch()
}

/** 切换排序：同项不重复请求；否则带新排序重新请求（PRD：点击排序项更新当前选项并重新请求） */
function changeSort(option: SearchSort): void {
  if (sort.value === option) return
  sort.value = option
  void router.replace({ name: 'search', query: { keyword: keyword.value, sort: option } })
  void runSearch()
}

function goStore(storeId: string): void {
  void router.push({ name: 'store-detail', params: { storeId } })
}

function goHome(): void {
  void router.push({ name: 'home' })
}

function onBack(): void {
  if (window.history.length > 1) router.back()
  else void router.push({ name: 'home' })
}
</script>

<style scoped>
.search-page {
  min-height: 100%;
  background: var(--color-background);
}
.sr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface-white);
}
.sr-back {
  flex: none;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
}
.sr-back svg {
  width: 20px;
  height: 20px;
}
.sr-input-wrap {
  flex: 1;
}
.sr-input {
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-primary);
  border-radius: 17px;
  font-size: 14px;
}
.sr-submit {
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 17px;
  background: var(--color-primary);
  color: var(--color-surface-white);
  font-size: 14px;
  cursor: pointer;
}
.sr-submit:disabled {
  opacity: 0.6;
}
.sr-location {
  margin: 0;
  padding: 8px 12px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.sr-location-icon {
  margin-right: 4px;
  color: var(--color-primary);
}
.sr-sort {
  display: flex;
  gap: 18px;
  padding: 10px 12px;
  background: var(--color-surface-white);
}
.sr-sort-item {
  border: none;
  background: none;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.sr-sort-item.is-active {
  color: var(--color-primary);
  font-weight: 500;
}
.sr-hint,
.sr-empty-text,
.sr-error-text {
  margin: 0;
  padding: 24px 12px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}
.sr-skeleton {
  padding: 12px;
}
.sr-skeleton-card {
  height: 88px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: var(--color-surface-container);
}
.sr-retry,
.sr-empty-home {
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
.sr-list {
  margin: 0;
  padding: 0 12px 12px;
  list-style: none;
}
.sr-card {
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-surface-white);
  cursor: pointer;
}
.sr-card-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.sr-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.sr-rating {
  font-size: 13px;
  color: var(--color-primary);
}
.sr-meta,
.sr-fee {
  display: flex;
  gap: 12px;
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.sr-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
}
.sr-tag {
  padding: 2px 8px;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--color-primary);
}
</style>
