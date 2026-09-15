<script setup lang="ts">
/**
 * 首页 exact 复刻（视觉真源：docs/design/exports/用户端/02-首页/02-首页-精细/首页-精细-项目化.svg，393×852）
 * 2026-09-06 静态视觉层转写 + 商家卡接 catalogStore（mock GET /stores）数据驱动；px 由 postcss px-to-viewport(390) 转 vw
 * 占位口径（PRD 7.16.1 + 精细版 README §2.3）：超范围占位栏目点击一律提示"暂未开放"，不进入功能范围
 * 2026-09-15 宫格接线补全（TODO-USER-107 ② 收口）：课程分类项点击携带分类编号进入分类商家列表（PRD 826 行），
 * 分类编号取自 `utils/courseCategories.ts` 的课程固定分类数据（PRD 该行允许「课程固定分类数据」承载）。
 */
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import StoreCover from '@/components/StoreCover.vue'
import { useCatalogStore } from '@/stores/catalogStore'
import { useSessionStore } from '@/stores/sessionStore'
import { addressApi } from '@/services/api'
import { storeApi } from '@/services/api'
import { formatMoney } from '@/services/normalizers'
import { productImageSrc, storeImageSrc } from '@/utils/demoImages'
import { courseCategoryIdOf } from '@/utils/courseCategories'
import { DEMO_LOCATION, LOCATION_LOAD_FAILED, resolveLocationState } from '@/utils/location'
import type { StorePreviewProduct, StoreSummary } from '@/services/api/types'
import type { CSSProperties } from 'vue'

// KeepAlive include 按组件名匹配（MainLayout 缓存首页以保持返回浏览位置）
defineOptions({ name: 'HomeView' })

const ASSETS = '/design-assets/首页-精细'

interface GridCell {
  key: string
  label: string
  icon: string
  /** 超范围占位栏目（点击提示暂未开放，不进入课程分类范围） */
  placeholder?: boolean
  /** 已接通的真实入口（CHG-001：宫格「天天爆红包」→ 红包页） */
  entry?: 'coupons'
  /**
   * 课程分类项标记：该格是「课程 10 类点餐分类」之一，点击进入分类商家列表（PRD 826 行）。
   * 分类编号由 `courseCategoryIdOf(label)` 解析，不在宫格表里重复硬编码。
   */
  category?: boolean
}

// 优惠标签样式按序循环（真源三款：金/橙/灰）；数据驱动后样式与文案解耦
const TAG_STYLES: CSSProperties[] = [
  { color: '#806c2e', borderColor: 'rgba(214, 195, 133, 1)' },
  { color: 'var(--color-primary)', borderColor: 'rgba(255, 214, 199, 1)' },
  { color: 'var(--color-text-secondary)', borderColor: 'rgba(204, 204, 204, 1)' },
]

function tagStyle(index: number): CSSProperties {
  return TAG_STYLES[index % TAG_STYLES.length]!
}

const catalogStore = useCatalogStore()
const sessionStore = useSessionStore()
const router = useRouter()

// 卡片 ✕ 关闭：本地收起（演示态）；PRD 未定义关闭口径，仅视图态隐藏不删数据
const dismissedCardIds = ref<string[]>([])
const visibleCards = computed(() =>
  catalogStore.stores.filter((store) => !dismissedCardIds.value.includes(store.storeId)),
)

// 定位地址（PRD 7.16.1 首页-定位与频道栏；2026-09-15 口径变更·方案 C，唯一出口 utils/location）：
// 已登录有地址 → 默认地址 region（缺省 detail）；已登录无地址 → 占位「选择收货地址」；
// 未登录或读取失败 → 回退课程演示地址并标记为演示数据
const locationText = ref(DEMO_LOCATION)
const isDemoLocation = ref(true)

async function loadLocationAddress(): Promise<void> {
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

// 商品预览聚合（T46，PRD 7.16.1：预览来自商家商品接口）：/stores 未返回 previewProducts
// 时从各店商品接口取前 3 个；字段已有则直接用（后端将来补字段时零改动切换）
const storePreviews = ref<Record<string, StorePreviewProduct[]>>({})

function previewsFor(store: StoreSummary): StorePreviewProduct[] {
  if (store.previewProducts?.length) return store.previewProducts
  return storePreviews.value[store.storeId] ?? []
}

/** 聚合各店商品前 3 个为预览；失败静默（预览块隐藏，不阻塞商家卡渲染） */
async function aggregatePreviews(stores: StoreSummary[]): Promise<void> {
  await Promise.all(
    stores
      .filter((store) => !store.previewProducts?.length)
      .map(async (store) => {
        try {
          const products = await storeApi.getStoreProducts(store.storeId)
          storePreviews.value[store.storeId] = products.slice(0, 3).map((p) => ({
            name: p.name,
            image: productImageSrc(p.productId, p.image),
            price: p.price,
          }))
        } catch {
          // 单店聚合失败仅隐藏该店预览
        }
      }),
  )
}

/** 刷新首页数据：挂载与 KeepAlive 激活共用（PRD 通用规则 6：返回重读，不依赖旧页面缓存） */
function refreshHome(): void {
  void catalogStore.fetchStores().then(() => {
    void aggregatePreviews(catalogStore.stores)
  })
}

onMounted(() => {
  refreshHome()
  void loadLocationAddress()
})

// 从商家详情等返回（KeepAlive 激活）：重新读取商家列表；滚动位置由 MainLayout 滚动管线恢复。
// KeepAlive 初次挂载会紧随 mounted 再触发一次 activated——首次激活跳过，避免首屏双请求
let firstActivation = true
onActivated(() => {
  if (firstActivation) {
    firstActivation = false
    return
  }
  refreshHome()
})

// PRD 806 行为列：点击定位文字进入地址列表（地址列表页自身处理登录引导）
function goAddressList(): void {
  void router.push({ name: 'address-list' })
}

function retryStores(): void {
  void catalogStore.fetchStores().then(() => {
    void aggregatePreviews(catalogStore.stores)
  })
}

// 分类宫格 3 行 × 5 列；行 1 大图标 56px，行 2/3 小图标 36px；占位清单见精细版 README §2.3
// `category: true` = 课程 10 类点餐分类项，点击进入分类商家列表（PRD 826 行）；占位栏目与红包入口不标该项
const gridRows: GridCell[][] = [
  [
    { key: 'takeout', label: '美食外卖', icon: `${ASSETS}/cat-grid-01.png`, category: true },
    { key: 'market', label: '超市便利', icon: `${ASSETS}/cat-grid-02.png`, placeholder: true },
    { key: 'fruit', label: '水果鲜花', icon: `${ASSETS}/cat-grid-03.png`, placeholder: true },
    { key: 'vegetable', label: '买菜', icon: `${ASSETS}/cat-grid-04.png`, placeholder: true },
    { key: 'pharmacy', label: '买药', icon: `${ASSETS}/cat-grid-05.png`, placeholder: true },
  ],
  [
    { key: 'dessert', label: '甜品饮品', icon: `${ASSETS}/cat-grid-06.png`, category: true },
    // CHG-001（PRD 7.16.1 首页「天天爆红包」入口行）：由占位装饰改为红包页真实入口
    { key: 'redpacket', label: '天天爆红包', icon: `${ASSETS}/cat-grid-07.png`, entry: 'coupons' },
    { key: 'freefruit', label: '0元领水果', icon: `${ASSETS}/cat-grid-08.png`, category: true },
    { key: 'errand', label: '跑腿', icon: `${ASSETS}/cat-grid-09.png`, placeholder: true },
    { key: 'huichi', label: '会吃', icon: `${ASSETS}/cat-grid-10.png`, category: true },
  ],
  [
    { key: 'ranking', label: '放心点榜', icon: `${ASSETS}/cat-grid-11.png`, category: true },
    { key: 'trend', label: '趋势情报局', icon: `${ASSETS}/cat-grid-12.png`, category: true },
    { key: 'burger', label: '汉堡西餐', icon: `${ASSETS}/cat-grid-13.png`, category: true },
    { key: 'milktea', label: '奶茶果汁', icon: `${ASSETS}/cat-grid-14.png`, category: true },
    { key: 'all', label: '全部', icon: `${ASSETS}/cat-grid-15.png`, category: true },
  ],
]

// 筛选标签（运营占位，不接真实优惠）
const filterTags = [
  { key: 'taste', label: '换换口味', active: true },
  { key: 'redpacket', label: '天天爆红包', active: false },
  { key: 'delivery', label: '减配送费', active: false },
  { key: 'coupon', label: '无门槛红包', active: false },
]

// 卡片 ✕ 关闭走 dismissedCardIds（见上方 computed）

function onPlaceholderClick(): void {
  toast('暂未开放')
}

/**
 * 搜索框入口（PRD 7.16.1「首页-搜索框」：点击搜索框进入**搜索页**）。
 * 历史：批次⑤ 前为「暂未开放」占位 → TODO-USER-005 曾直连结果页 → TODO-USER-107 按 PRD
 * 改为先进搜索页（关键词输入 + 最近搜索 + 热门搜索），由搜索页提交后进结果页。
 */
function goSearch(): void {
  void router.push({ name: 'search-entry' })
}

/**
 * AI 点餐助手入口（AI点餐助手前端PRD §2.1/§2.2）：
 * 悬浮球直接进对话页；搜索框「AI 推荐」按钮带预填提示词进对话页（是否发送由对话页决定，此处只预填）。
 */
function goAiChat(prompt?: string): void {
  void router.push({ name: 'ai-chat', query: prompt ? { prompt } : undefined })
}

// PRD 商家卡行：点击商家卡携带 storeId 进入商家详情
function onOpenStore(storeId: string): void {
  void router.push({ name: 'store-detail', params: { storeId } })
}

/**
 * 分类宫格点击：
 * - 红包入口（CHG-001：天天爆红包）→ 跳红包页；未登录由红包页自身与路由守卫引导登录（PRD 877 行检查列）
 * - 课程分类项（`category: true`）→ 携带课程分类编号进入分类商家列表（PRD 826 行交互列），
 *   分类编号解析自课程固定分类数据（`utils/courseCategories.ts`）
 * - 超范围占位栏目与其它未接通栏目 → 提示「暂未开放」（PRD 877 行「其余占位保持不可点」）
 */
function onCellClick(cell: GridCell): void {
  if (cell.entry === 'coupons') {
    void router.push({ name: 'coupons' })
    return
  }
  if (cell.category) {
    const categoryId = courseCategoryIdOf(cell.label)
    if (categoryId) {
      void router.push({
        name: 'category-store-list',
        params: { categoryId },
        query: { name: cell.label },
      })
      return
    }
  }
  toast('暂未开放')
}

function onCloseCard(storeId: string): void {
  dismissedCardIds.value.push(storeId)
}
</script>

<template>
  <div class="home-page">
    <!-- 定位与频道栏（设计稿 y53-97；状态栏为设计稿装饰，H5 不含） -->
    <header class="location-bar" data-testid="location-bar">
      <button class="channel" type="button" data-placeholder="常点" @click="onPlaceholderClick">
        常点
      </button>
      <span class="channel-divider" aria-hidden="true" />
      <button class="channel channel--active" type="button">推荐</button>
      <button
        class="location"
        type="button"
        :title="isDemoLocation ? '演示地址' : undefined"
        @click="goAddressList"
      >
        <span class="location-text">{{ locationText }}</span>
        <svg class="location-caret" viewBox="0 0 7.6 5" aria-hidden="true">
          <path
            d="M4.086 4.782L7.355 0.818C7.624 0.492 7.392 0 6.97 0L0.43 0C0.008 0 -0.224 0.492 0.045 0.818L3.314 4.782C3.514 5.025 3.886 5.025 4.086 4.782Z"
            fill="#0d0d0d"
          />
        </svg>
      </button>
    </header>

    <!-- 搜索框（PRD 7.16.1「首页-搜索框」：点击搜索框进入搜索结果页；批次⑤ TODO-USER-005 起为真入口） -->
    <section class="search-section" data-testid="search-bar">
      <div
        class="search-box"
        data-placeholder="搜索"
        role="button"
        tabindex="0"
        @click="goSearch"
      >
        <svg class="search-scan" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M1.75 5.875L1.75 1.75L5.875 1.75M5.875 18.25L1.75 18.25L1.75 14.125M18.25 14.125L18.25 18.25L14.125 18.25M14.125 1.75L18.25 1.75L18.25 5.875M3.5833 10L16.4166 10"
            fill="none"
            stroke="var(--color-primary)"
            stroke-width="1.33"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="search-divider" aria-hidden="true" />
        <span class="search-placeholder">相关推荐商品的搜索…</span>
        <button class="search-btn" type="button">搜索</button>
        <!-- AI 点餐助手辅助入口（AI点餐助手前端PRD §2.2）：亮橙文字 + 图标，点击进对话页并预填提示词 -->
        <button class="search-ai" type="button" data-testid="search-ai-btn" @click.stop="goAiChat('帮我推荐今天吃什么')">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6L10 14.5 8.4 10.1 4 8.5l4.4-1.6L10 2.5Z"
              fill="currentColor"
            />
          </svg>
          AI 推荐
        </button>
      </div>
    </section>

    <!-- 分类宫格：3 行 × 5 列（课程 10 类 + 5 个超范围占位） -->
    <nav class="cat-grid" data-testid="cat-grid">
      <div v-for="(row, rowIndex) in gridRows" :key="rowIndex" class="cat-row">
        <button
          v-for="cell in row"
          :key="cell.key"
          type="button"
          class="cat-cell"
          :data-placeholder="cell.placeholder ? cell.label : undefined"
          @click="onCellClick(cell)"
        >
          <img
            class="cat-icon"
            :class="{ 'cat-icon--big': rowIndex === 0 }"
            :src="cell.icon"
            :alt="cell.label"
          />
          <span class="cat-label">{{ cell.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 活动运营区（占位区，整区不接真实数据） -->
    <section class="promo-area" data-testid="promo-area">
      <div class="promo-main" data-placeholder="活动" role="button" @click="onPlaceholderClick">
        <span class="promo-circle" aria-hidden="true" />
        <img
          class="promo-illus"
          :src="`${ASSETS}/promo-illus.png`"
          alt="天天秒大牌红包插画"
        />
        <img class="promo-avatar" :src="`${ASSETS}/promo-dog-avatar.png`" alt="" />
        <p class="promo-title">
          <span class="promo-title-name">饿小宝:</span>
          <span class="promo-title-sub">囤好券</span>
        </p>
        <p class="promo-slogan">天天秒<span class="promo-slogan-hot">大牌</span></p>
        <span class="promo-btn">去秒杀</span>
      </div>
      <div
        class="promo-side"
        data-placeholder="天天特价"
        role="button"
        @click="onPlaceholderClick"
      >
        <p class="promo-side-title">天天特价</p>
        <img class="promo-side-img" :src="`${ASSETS}/promo-card-1.png`" alt="天天特价" />
        <p class="promo-side-foot promo-side-foot--1">4.9元起</p>
      </div>
      <div
        class="promo-side"
        data-placeholder="在线拼单"
        role="button"
        @click="onPlaceholderClick"
      >
        <p class="promo-side-title">在线拼单</p>
        <img class="promo-side-img" :src="`${ASSETS}/promo-card-2.png`" alt="在线拼单" />
        <p class="promo-side-foot promo-side-foot--2">一起来嗨</p>
      </div>
    </section>

    <!-- 筛选标签行（运营占位） -->
    <section class="filter-bar" data-testid="filter-bar">
      <button
        v-for="tag in filterTags"
        :key="tag.key"
        type="button"
        class="filter-tag"
        :class="{ 'filter-tag--active': tag.active }"
        data-placeholder="筛选"
        @click="onPlaceholderClick"
      >
        {{ tag.label }}
      </button>
      <span class="filter-more" aria-hidden="true">
        <svg viewBox="0 0 14 13">
          <path d="M0 0.5H14M0 6.5H14M0 12.5H14" stroke="#333333" stroke-width="1" />
        </svg>
      </span>
    </section>

    <!-- 商家卡列表（数据驱动：catalogStore → mock GET /stores；PRD 商家卡行三态口径） -->
    <section class="merchant-list" data-testid="merchant-list">
      <!-- 加载占位（PRD：首次加载显示卡片占位） -->
      <template v-if="catalogStore.loading">
        <div
          v-for="i in 2"
          :key="`skeleton-${i}`"
          class="merchant-card merchant-card--skeleton"
          data-testid="merchant-skeleton"
        >
          <div class="skeleton-block skeleton-cover" />
          <div class="skeleton-lines">
            <div class="skeleton-block skeleton-line" />
            <div class="skeleton-block skeleton-line skeleton-line--short" />
          </div>
        </div>
      </template>
      <!-- 空态（PRD：空数组显示"暂无商家"） -->
      <div
        v-else-if="!catalogStore.stores.length && !catalogStore.error"
        class="merchant-empty"
        data-testid="merchant-empty"
      >
        暂无商家
      </div>
      <!-- 错误态：请求失败保留提示并提供重试 -->
      <div v-else-if="catalogStore.error" class="merchant-empty" data-testid="merchant-error">
        {{ catalogStore.error }}
        <button class="merchant-retry" type="button" @click="retryStores">重试</button>
      </div>
      <!-- 卡片（关闭的店铺仅视图态隐藏） -->
      <template v-else>
        <article
          v-for="store in visibleCards"
          :key="store.storeId"
          class="merchant-card"
          @click="onOpenStore(store.storeId)"
        >
          <div class="merchant-cover">
            <StoreCover
              class="merchant-cover-img"
              :name="store.name"
              :image="storeImageSrc(store.storeId, store.image)"
            />
            <span class="merchant-ribbon">
              优享大牌
              <svg class="merchant-ribbon-fold" viewBox="0 0 4.5 2" aria-hidden="true">
                <path d="M0 0L4.5 0L2.25 2Z" fill="#4f4219" />
              </svg>
            </span>
            <!-- 占位文案（精细版 README §2.3），不绑定真实数据 -->
            <p class="merchant-promo">人气推荐</p>
            <p class="merchant-fans">近30日8139人逛过</p>
          </div>
          <div class="merchant-body">
            <div class="merchant-head">
              <div class="merchant-head-main">
                <h3 class="merchant-name">{{ store.name }}</h3>
                <!-- 装饰性标签（TODO-USER-019）：纯占位展示，不代表真实经营数据；
                     data-decorative 供断言与后续替换识别，不得据此展示为经营结果 -->
                <span class="merchant-deco-tag" data-decorative="true">品质优选</span>
              </div>
              <img
                class="merchant-close"
                :src="`${ASSETS}/merchant-card-close.png`"
                alt="关闭"
                @click.stop="onCloseCard(store.storeId)"
              />
            </div>
            <div class="merchant-rating-row">
              <span class="merchant-score">{{ store.rating.toFixed(1) }}</span>
              <span class="merchant-score-unit">分</span>
              <span class="merchant-sales">月售{{ store.monthlySales }}+</span>
              <span class="merchant-meta">{{ store.deliveryMinutes }}分钟</span>
              <span
                v-if="store.distanceText"
                class="merchant-meta merchant-meta--distance"
              >
                {{ store.distanceText }}
              </span>
            </div>
            <!-- 优惠标签：接口明确返回时才展示（PRD 商家卡行） -->
            <div v-if="store.couponTags?.length" class="merchant-tags">
              <span
                v-for="(tag, tagIndex) in store.couponTags"
                :key="tag"
                class="merchant-tag"
                :style="tagStyle(tagIndex)"
              >
                {{ tag }}
              </span>
            </div>
            <!-- 商品预览：来自商品接口聚合（PRD 7.16.1），价格两位小数，不参与计价 -->
            <div v-if="previewsFor(store).length" class="merchant-products">
              <div
                v-for="product in previewsFor(store)"
                :key="product.name"
                class="product-cell"
              >
                <img class="product-img" :src="product.image" :alt="product.name" />
                <p class="product-name">{{ product.name }}</p>
                <p class="product-price">
                  <span class="product-price-symbol">￥</span>
                  <span class="product-price-int">{{ formatMoney(product.price) }}</span>
                  <span class="product-price-est">预估价</span>
                </p>
              </div>
              <!-- 右缘渐隐用于暗示「右侧还有更多商品」，只有展示 3 张（右侧仍有溢出）时才渲染；
                   不足三张仍渲染会让人以为图片被裁切（SHOW-QA-005，PRD 7.2 按实际数量展示） -->
              <span
                v-if="previewsFor(store).length >= 3"
                class="product-fade"
                aria-hidden="true"
              />
            </div>
          </div>
        </article>
      </template>
    </section>

    <!-- AI 点餐助手主入口（AI点餐助手前端PRD §2.1）：首页右下角悬浮球，
         亮橙 #ff5a1f、直径 56px，位置在底部 TabBar 上方 16px（TabBar 高 64px + 安全区）。
         悬浮球只在首页渲染（本组件即首页），商家详情/购物车/订单等页不显示，避免遮挡操作。 -->
    <button
      class="ai-float"
      type="button"
      data-testid="ai-float-btn"
      aria-label="AI 点餐助手"
      @click="goAiChat()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 5.5h16v11H9.5L5.5 20v-3.5H4v-11Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  /* 页面背景：设计稿 y224.5 起白→#f9f9f9 渐变（linear_fill_15_3） */
  background: linear-gradient(180deg, #ffffff 224px, var(--color-background) 852px);
  padding-bottom: 12px;
}

/* ---- 定位与频道栏（44px） ---- */
.location-bar {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 14px 0 16px;
  background: var(--color-surface-white);
}

.channel {
  flex: none;
  border: none;
  background: none;
  padding: 0;
  font-size: 18px;
  color: #a6a6a6;
  cursor: pointer;
}

.channel--active {
  font-size: 19px;
  font-weight: 500;
  color: #0d0d0d;
}

.channel-divider {
  width: 1px;
  height: 14px;
  margin: 0 11px 0 12px;
  background: #cccccc;
}

.location {
  display: flex;
  align-items: center;
  margin-left: auto;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.location-text {
  font-size: 16px;
  color: #0d0d0d;
}

.location-caret {
  width: 8px;
  height: 5px;
  margin-left: 3px;
}

/* ---- 搜索框（52px） ---- */
.search-section {
  height: 52px;
  /* 8 + 36 + 8 = 52：框高 36（稿），垂直居中 */
  padding: 8px 10px;
  background: var(--color-surface-white);
}

.search-box {
  display: flex;
  align-items: center;
  height: 36px;
  border: 1.5px solid var(--color-primary);
  border-radius: 20px;
  background: var(--color-surface-white);
  /* 框左沿 → 图标盒左沿 14px（稿），减去 1.5px 边框 */
  padding-left: 12.5px;
  cursor: pointer;
}

/* 稿：图标盒 24×24（内缩 2px 后视口 20×20，字形 16.5px，盒左沿距框外沿 14px） */
.search-scan {
  flex: none;
  width: 24px;
  height: 24px;
  padding: 2px;
}

.search-divider {
  flex: none;
  width: 1px;
  height: 18px;
  /* 稿：分隔线在框左 46（图标盒右沿 38 + 8），文字起于框左 54（分隔线后 7） */
  margin: 0 7px 0 8px;
  background: #cccccc;
}

.search-placeholder {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  color: #333333;
}

.search-btn {
  flex: none;
  width: 70px;
  height: 30px;
  margin-right: 3px;
  border-radius: 15px;
  background: var(--color-primary);
  font-size: 16px;
  color: var(--color-surface-white);
}

/* ---- 分类宫格 ---- */
.cat-grid {
  margin-top: 7px;
}

.cat-row {
  display: flex;
  justify-content: space-between;
  /* 稿：5 列等距（列心 47/122/197/271/345，间距 74.5）；左右内边距使列心对齐 */
  padding: 0 10.75px 0 9.75px;
}

.cat-row:nth-child(2),
.cat-row:nth-child(3) {
  margin-top: 12px;
}

.cat-cell {
  /* 等分列宽（393 - 20.5）/ 5 = 74.5：列宽不再被标签文案撑开，保证 5 列等距；
     行 1 大图标 56px 在 74.5 单元格内居中，列心与稿一致（19 + 9.25 = 47） */
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.cat-icon {
  width: 36px;
  height: 36px;
}

.cat-icon--big {
  width: 56px;
  height: 56px;
}

.cat-label {
  margin-top: 2px;
  font-size: 12px;
  line-height: 13px;
  color: var(--color-text-primary);
  /* 标签不换行，也不参与单元格宽度计算（列宽由 flex 等分决定） */
  white-space: nowrap;
}

.cat-row:nth-child(1) .cat-label {
  margin-top: 4px;
}

/* ---- 活动运营区（116px） ---- */
.promo-area {
  display: flex;
  gap: 8px;
  height: 116px;
  margin: 12px 10px 0;
}

.promo-main {
  position: relative;
  width: 197px;
  border-radius: 12px;
  background: var(--color-surface-white);
  overflow: hidden;
  cursor: pointer;
}

/* 顶部浅橙渐变叠层（linear_fill_15_149_1） */
.promo-main::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 214, 199, 0.37) 0%, rgba(255, 224, 213, 0) 100%);
}

.promo-circle {
  position: absolute;
  left: 105px;
  top: 28px;
  width: 103px;
  height: 103px;
  border-radius: 50%;
  background:
    linear-gradient(135deg, rgba(255, 214, 199, 0.48) 0%, rgba(255, 224, 213, 0) 100%),
    #ffffff;
}

.promo-illus {
  position: absolute;
  left: 118px;
  top: 47px;
  width: 79px;
  height: 62px;
}

.promo-avatar {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 20px;
  height: 22px;
}

.promo-title {
  position: absolute;
  left: 34px;
  top: 11px;
  margin: 0;
  font-size: 14px;
  line-height: 15px;
}

.promo-title-name {
  color: #0d0d0d;
}

.promo-title-sub {
  color: #333333;
}

.promo-slogan {
  position: absolute;
  left: 12px;
  top: 46px;
  margin: 0;
  font-size: 14px;
  line-height: 15px;
  color: #333333;
}

.promo-slogan-hot {
  color: var(--color-primary);
}

.promo-btn {
  position: absolute;
  left: 9px;
  top: 74px;
  width: 66px;
  height: 28px;
  border-radius: 14px;
  background: rgba(255, 90, 31, 0.1);
  font-size: 14px;
  line-height: 28px;
  text-align: center;
  color: var(--color-primary);
}

.promo-side {
  position: relative;
  width: 80px;
  border-radius: 12px;
  background: var(--color-surface-white);
  cursor: pointer;
}

.promo-side-title {
  margin: 11px 0 0 12px;
  font-size: 14px;
  line-height: 15px;
  color: #333333;
}

.promo-side-img {
  width: 56px;
  height: 56px;
  margin: 7px 0 0 12px;
}

.promo-side-foot {
  margin: 2px 0 0 16px;
  font-size: 12px;
  line-height: 13px;
  color: #999999;
}

.promo-side-foot--1 {
  margin-left: 19px;
}

/* ---- 筛选标签行（23px） ---- */
.filter-bar {
  display: flex;
  align-items: center;
  height: 23px;
  margin: 12px 12px 0 10px;
}

.filter-tag {
  flex: none;
  width: 84px;
  height: 23px;
  margin-right: 4px;
  border: none;
  border-radius: 4px;
  background: var(--color-surface-white);
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.filter-tag--active {
  color: var(--color-primary);
}

.filter-more {
  flex: none;
  width: 14px;
  height: 13px;
  margin-left: auto;
}

.filter-more svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---- 商家卡 ---- */
.merchant-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 10px 0;
}

.merchant-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: var(--color-surface-white);
  overflow: hidden;
  cursor: pointer;
}

.merchant-cover {
  position: relative;
  flex: none;
  width: 112px;
  height: 186px;
  border-radius: 8px;
  background: #fcfae6;
}

.merchant-cover-img {
  width: 112px;
  height: 113px;
  border-radius: 8px;
}

.merchant-ribbon {
  position: absolute;
  left: -2px;
  top: -2px;
  width: 49px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(90deg, #806c2e 0%, #615327 100%);
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  color: #d6c385;
}

.merchant-ribbon-fold {
  position: absolute;
  left: 0;
  top: 16px;
  width: 4.5px;
  height: 2px;
}

.merchant-promo {
  position: absolute;
  left: 8px;
  top: 121px;
  margin: 0;
  font-size: 15px;
  line-height: 16px;
  color: #eb6f4a;
}

.merchant-fans {
  position: absolute;
  left: 8px;
  top: 144px;
  width: 90px;
  margin: 0;
  font-size: 12px;
  line-height: 17px;
  color: #6e3b25;
}

.merchant-body {
  flex: 1;
  min-width: 0;
}

.merchant-head {
  display: flex;
  align-items: flex-start;
}

.merchant-name {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 16px;
  line-height: 17px;
  font-weight: 400;
  color: #000000;
}

.merchant-close {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 4px 0 0 8px;
  cursor: pointer;
}

.merchant-head-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

/* 装饰性标签：与「课程演示配送」同款浅品牌底描边（纯占位） */
.merchant-deco-tag {
  flex-shrink: 0;
  padding: 1px 5px;
  border: 1px solid #ffd9cc;
  border-radius: 4px;
  background: #fff3ed;
  font-size: 10px;
  line-height: 16px;
  color: var(--color-primary);
}

.merchant-rating-row {
  display: flex;
  align-items: baseline;
  margin-top: 9px;
}

.merchant-score {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary);
}

.merchant-score-unit {
  margin-left: 2px;
  font-size: 12px;
  color: var(--color-primary);
}

.merchant-sales {
  margin-left: 9px;
  font-size: 11px;
  color: var(--color-primary);
}

.merchant-meta {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.merchant-meta--distance {
  margin-left: 7px;
}

.merchant-tags {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.merchant-tag {
  /* 稿（画板 3/4/5）：1px 边框 + 1px 内边距 + 14px 行高 = 高 18px，字号 11px */
  padding: 1px 4px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 11px;
  line-height: 14px;
  white-space: nowrap;
}

.merchant-products {
  position: relative;
  display: flex;
  gap: 8px;
  width: max-content;
  margin: 12px -16px 0 0;
}

.product-cell {
  flex: none;
  width: 72px;
}

.product-img {
  width: 72px;
  height: 72px;
  border-radius: 4px;
}

.product-name {
  margin: 4px 0 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 13px;
  text-align: center;
  color: #000000;
}

.product-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin: 3px 0 0;
  color: var(--color-primary);
}

.product-price-symbol {
  font-size: 10px;
}

.product-price-int {
  font-size: 14px;
  font-weight: 500;
}

.product-price-est {
  margin-left: 1px;
  font-size: 9px;
  /* TODO-USER-021：「预估价」三字不得换行（负责人 9/10 走查：换行观感不佳） */
  white-space: nowrap;
}

/* 右缘白色渐隐（linear_fill_15_208），盖住溢出的第三个商品 */
.product-fade {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 39px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, #ffffff 68%);
  pointer-events: none;
}

/* ---- 商家卡三态：骨架 / 空态 / 错误重试 ---- */
.merchant-card--skeleton {
  cursor: default;
}

.skeleton-block {
  background: var(--color-surface-container);
  border-radius: var(--radius-default);
}

.skeleton-cover {
  width: 112px;
  height: 186px;
  flex: none;
}

.skeleton-lines {
  flex: 1;
  padding-top: 4px;
}

.skeleton-line {
  width: 60%;
  height: 16px;
}

.skeleton-line--short {
  width: 40%;
  margin-top: 10px;
}

.merchant-empty {
  padding: 32px 0;
  border-radius: 8px;
  background: var(--color-surface-white);
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.merchant-retry {
  margin-left: 8px;
  color: var(--color-primary);
  cursor: pointer;
}

/* AI 点餐助手入口（AI点餐助手前端PRD §2.1/§2.2）：亮橙 #ff5a1f 品牌色 */
.search-ai {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 6px;
  padding: 0 2px;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12px;
  white-space: nowrap;
}

.search-ai svg {
  width: 14px;
  height: 14px;
}

.ai-float {
  position: fixed;
  right: 16px;
  bottom: calc(64px + 16px + env(safe-area-inset-bottom));
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: #ffffff;
  box-shadow: 0 4px 12px rgb(255 90 31 / 35%);
}

.ai-float svg {
  width: 28px;
  height: 28px;
}
</style>
