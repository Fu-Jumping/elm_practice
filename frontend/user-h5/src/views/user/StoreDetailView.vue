<script setup lang="ts">
/**
 * 商家详情页（视觉真源：docs/design/exports/用户端/04-商家详情/02-商家详情-商品列表与评分，390 宽）
 * 2026-09-06 TDD 落地（T11-T18）：详情/分类/商品/购物车数据驱动 + 三 Tab（点餐/评价占位）+ 底部购物车栏
 * 口径（PRD 7.16.1 + 契约 §3.2/§3.4）：
 * - 评价 Tab：P1 未选定，占位"评价功能暂未开放"，不请求评价接口（契约 §6.2）
 * - 售罄商品灰化禁加购；店铺休息加购/结算禁用并提示
 * - 去结算校验顺序：登录 → 购物车非空 → 店铺营业，然后进确认订单（确认订单页 9/7 实现）
 * - 无底部导航（底部为购物车栏）；未登录可浏览
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalogStore'
import { useCartStore } from '@/stores/cartStore'
import { useSessionStore } from '@/stores/sessionStore'
import { formatMoney, statusText } from '@/services/normalizers'
import type { CartLine, Product } from '@/services/api/types'
import { toast } from '@/utils/toast'
import StoreCover from '@/components/StoreCover.vue'

const ASSETS = '/design-assets/首页-精细'
/** 商品图契约暂无图片字段：用固定素材占位（PRD：图片为空显示占位图） */
const PRODUCT_PLACEHOLDER = `${ASSETS}/product-thumb-1.png`

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()
const cartStore = useCartStore()
const sessionStore = useSessionStore()

const storeId = String(route.params.storeId)

const activeTab = ref<'order' | 'review'>('order')
const activeCategoryId = ref('')

const store = computed(() => catalogStore.storeDetail)
const isClosed = computed(() => store.value?.status === 'CLOSED')

/** 分类 → 商品 分组（分类接口 + 商品接口在前端按 categoryId 归组） */
const productsByCategory = computed(() => {
  const map = new Map<string, Product[]>()
  for (const product of catalogStore.products) {
    const list = map.get(product.categoryId) ?? []
    list.push(product)
    map.set(product.categoryId, list)
  }
  return map
})

// PRD：默认选中第一个有商品的分类
watch(
  () => [catalogStore.categories.length, catalogStore.productsLoading] as const,
  () => {
    if (activeCategoryId.value) return
    const firstWithProducts =
      catalogStore.categories.find(
        (cat) => (productsByCategory.value.get(cat.categoryId) ?? []).length > 0,
      ) ?? catalogStore.categories[0]
    if (firstWithProducts) activeCategoryId.value = firstWithProducts.categoryId
  },
  { immediate: true },
)

const activeCategory = computed(() =>
  catalogStore.categories.find((cat) => cat.categoryId === activeCategoryId.value),
)
const activeProducts = computed(
  () => productsByCategory.value.get(activeCategoryId.value ?? '') ?? [],
)

// 详情请求成功后标题更新（PRD 顶部栏行）
watch(
  () => catalogStore.storeDetail?.name,
  (name) => {
    if (name) document.title = `${name} · 轻量外卖`
  },
)

onMounted(() => {
  void catalogStore.fetchStoreDetail(storeId)
  void catalogStore.fetchStoreCategories(storeId)
  void catalogStore.fetchStoreProducts(storeId)
  void cartStore.fetchCart(storeId)
})

const isMissing = computed(() => catalogStore.detailError?.status === 404)

function onBack(): void {
  router.back()
}

function backHome(): void {
  // PRD：缺少或无效编号直接返回商家列表（当前为首页店铺列表）
  void router.push({ name: 'home' })
}

function retryDetail(): void {
  void catalogStore.fetchStoreDetail(storeId)
}

function onPlaceholderClick(): void {
  toast('暂未开放')
}

function onSelectCategory(categoryId: string): void {
  activeCategoryId.value = categoryId
}

/** 售罄/下架商品禁止加购（契约：库存 0 显示售罄禁止加购） */
function isSoldOut(product: Product): boolean {
  return !product.onSale || product.stock <= 0
}

async function onAdd(product: Product): Promise<void> {
  if (isClosed.value || isSoldOut(product)) return
  // 加购需登录（后端 401 口径）：未登录引导登录并回跳商家详情，不静默失败
  // （PRD 校验顺序"登录先行"；9/7 联调修正，用例 T45）
  if (!sessionStore.isLoggedIn) {
    toast('请先登录')
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  // 已加购 → 步进 +1（PATCH）；未加购 → 加购 1 件（POST，同商品合并由后端保证）
  const line = lineOf(product.productId)
  if (line) await cartStore.incrementLine(line.cartLineId)
  else await cartStore.addItem(storeId, product.productId)
}

/** 步进 -（T49）：减 1；减到 0 由 cartStore 转删除请求（契约 §3.4） */
async function onDecrement(product: Product): Promise<void> {
  const line = lineOf(product.productId)
  if (line) await cartStore.decrementLine(line.cartLineId)
}

/** 购物车行查询（步进器渲染与定位用） */
function lineOf(productId: string): CartLine | undefined {
  return cartStore.lines.find((line) => line.productId === productId)
}

function qtyOf(productId: string): number {
  return lineOf(productId)?.quantity ?? 0
}

/** 购物车弹层（T50，PRD：点击购物车栏展开弹层） */
const cartPopupOpen = ref(false)

function toggleCartPopup(): void {
  cartPopupOpen.value = !cartPopupOpen.value
}

/** 去结算校验顺序：登录 → 购物车非空 → 店铺营业（PRD 点餐内容区行） */
function onCheckout(): void {
  if (!sessionStore.isLoggedIn) {
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (cartStore.totalCount === 0) {
    toast('请先加入商品')
    return
  }
  // 确认订单页 9/7 落地：校验通过进入确认订单，携带商家编号（PRD 顶部栏行）
  void router.push({ name: 'order-confirm', query: { storeId } })
}
</script>

<template>
  <div class="store-detail-page">
    <header class="detail-header">
      <button class="header-btn" type="button" aria-label="返回" @click="onBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <span class="detail-brand">饿了么</span>
      <button class="header-btn" type="button" aria-label="搜索" @click="onPlaceholderClick">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M15.8 15.8L20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <!-- 加载占位（PRD：首次请求显示顶部占位） -->
    <div v-if="catalogStore.detailLoading && !catalogStore.storeDetail" class="detail-state">
      加载中…
    </div>

    <!-- 商家不存在（PRD：显示"商家不存在"并返回列表） -->
    <div v-else-if="isMissing" class="detail-state" data-testid="store-missing">
      <p class="detail-state-text">商家不存在</p>
      <button class="state-retry" type="button" data-testid="store-back-home" @click="backHome">
        返回商家列表
      </button>
    </div>

    <!-- 其他错误：保留提示并提供重试 -->
    <div v-else-if="catalogStore.detailError" class="detail-state" data-testid="store-error">
      <p class="detail-state-text">{{ catalogStore.detailError.message }}</p>
      <button class="state-retry" type="button" @click="retryDetail">重试</button>
    </div>

    <template v-else-if="store">
      <!-- 商家信息横幅（名称/评分/月售/时长/起送/配送来自详情接口；促销标签接口返回才展示） -->
      <section class="store-banner" data-testid="store-banner">
        <StoreCover class="banner-img" :name="store.name" :image="store.image" />
        <div class="store-info">
          <div class="store-logo-row">
            <span class="store-logo-box">
              <StoreCover class="store-logo" :name="store.name" :image="store.image" />
            </span>
            <h1 class="store-name">{{ store.name }}</h1>
          </div>
          <p class="store-meta-row">
            <svg class="star-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.1l6.1-.7z"
                fill="var(--color-primary)"
              />
            </svg>
            <span class="store-rating">{{ store.rating.toFixed(1) }}</span>
            <span class="store-meta">月售{{ store.monthlySales }}+</span>
            <span class="meta-divider" aria-hidden="true" />
            <span class="store-meta">约{{ store.deliveryMinutes }}分钟</span>
          </p>
          <p class="store-meta-row store-fee-row">
            <span class="store-meta">起送 ¥{{ formatMoney(store.startPrice) }}</span>
            <span class="store-meta">配送 ¥{{ formatMoney(store.deliveryFee) }}</span>
            <span v-if="isClosed" class="store-status-closed">{{ statusText(store.status) }}</span>
          </p>
          <p class="store-tags-row">
            <span
              v-for="tag in store.couponTags ?? []"
              :key="tag"
              class="store-promo-tag"
            >
              {{ tag }}
            </span>
            <button class="store-coupon-btn" type="button" @click="onPlaceholderClick">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 8a2 2 0 012-2h12a2 2 0 012 2v1.5a2.5 2.5 0 000 5V16a2 2 0 01-2 2H6a2 2 0 01-2-2v-1.5a2.5 2.5 0 000-5z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
              领券
            </button>
          </p>
          <p v-if="isClosed" class="store-closed-tip" data-testid="store-closed-tip">
            商家已休息，暂不接受下单
          </p>
        </div>
      </section>

      <!-- 点餐 / 评价 切换（默认点餐；评价为 P1 占位） -->
      <nav class="store-tabs">
        <button
          class="store-tab"
          type="button"
          data-testid="tab-order"
          :class="{ 'store-tab--active': activeTab === 'order' }"
          @click="activeTab = 'order'"
        >
          点餐
        </button>
        <button
          class="store-tab"
          type="button"
          data-testid="tab-review"
          :class="{ 'store-tab--active': activeTab === 'review' }"
          @click="activeTab = 'review'"
        >
          评价
        </button>
      </nav>

      <!-- 评价占位（契约 §6.2：P1 未选定不实现，不请求评价接口） -->
      <div v-if="activeTab === 'review'" class="review-placeholder" data-testid="review-placeholder">
        评价功能暂未开放
      </div>

      <!-- 点餐区：左分类栏 + 右商品列表 -->
      <div v-else class="order-area">
        <nav class="cat-rail">
          <button
            v-for="cat in catalogStore.categories"
            :key="cat.categoryId"
            type="button"
            class="cat-rail-item"
            :class="{ 'cat-rail-item--active': cat.categoryId === activeCategoryId }"
            :data-testid="`cat-rail-item`"
            @click="onSelectCategory(cat.categoryId)"
          >
            {{ cat.name }}
          </button>
        </nav>
        <div class="product-list" data-testid="product-list">
          <h2 class="product-list-title">{{ activeCategory?.name }}</h2>
          <div
            v-for="product in activeProducts"
            :key="product.productId"
            class="product-item"
            :class="{ 'product-item--soldout': isSoldOut(product) }"
            :data-testid="`product-item-${product.productId}`"
          >
            <img class="product-img" :src="PRODUCT_PLACEHOLDER" :alt="product.name" />
            <div class="product-info">
              <h3 class="product-name">{{ product.name }}</h3>
              <p v-if="product.description" class="product-desc">{{ product.description }}</p>
              <p class="product-meta">
                <span v-if="product.monthlySalesText">{{ product.monthlySalesText }}</span>
                <span v-if="product.goodRateText"> · {{ product.goodRateText }}</span>
              </p>
              <p class="product-price-row">
                <span class="product-price">
                  <span class="price-symbol">¥</span>
                  <span class="price-int">{{ formatMoney(product.price) }}</span>
                </span>
                <!-- 行内步进器（T47-T49）：已加购显示 "- 数量 +"，未加购仅 + 按钮 -->
                <span v-if="qtyOf(product.productId) > 0" class="product-stepper">
                  <button
                    class="stepper-btn"
                    type="button"
                    :data-testid="`minus-btn-${product.productId}`"
                    :disabled="cartStore.isStepping(lineOf(product.productId)?.cartLineId ?? '')"
                    aria-label="减少数量"
                    @click="onDecrement(product)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                    </svg>
                  </button>
                  <span class="stepper-qty" :data-testid="`product-qty-${product.productId}`">
                    {{ qtyOf(product.productId) }}
                  </span>
                  <button
                    class="stepper-btn stepper-btn--add"
                    type="button"
                    :data-testid="`add-btn-${product.productId}`"
                    :disabled="isClosed || isSoldOut(product) || cartStore.isAdding(product.productId)"
                    :aria-label="`增加数量 ${product.name}`"
                    @click="onAdd(product)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                    </svg>
                  </button>
                </span>
                <button
                  v-else
                  class="product-add"
                  type="button"
                  :data-testid="`add-btn-${product.productId}`"
                  :disabled="isClosed || isSoldOut(product) || cartStore.isAdding(product.productId)"
                  :aria-label="`加入购物车 ${product.name}`"
                  @click="onAdd(product)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                  </svg>
                </button>
              </p>
              <p v-if="isSoldOut(product)" class="product-soldout-text">售罄</p>
            </div>
          </div>
          <p v-if="!catalogStore.productsLoading && activeProducts.length === 0" class="product-empty">
            暂无商品
          </p>
        </div>
      </div>

      <!-- 底部购物车栏（PRD：商品数/合计来自购物车接口；店铺休息结算禁用） -->
      <div class="cart-bar" data-testid="cart-bar" @click="toggleCartPopup">
        <button
          class="cart-icon-btn"
          type="button"
          :disabled="isClosed"
          aria-label="购物车"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 4h2.4l2.2 10.2a1.6 1.6 0 001.6 1.3h7.6a1.6 1.6 0 001.6-1.2L20.4 8H6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="10" cy="20" r="1.4" fill="currentColor" />
            <circle cx="17" cy="20" r="1.4" fill="currentColor" />
          </svg>
          <span v-if="cartStore.totalCount > 0" class="cart-badge" data-testid="cart-bar-count">
            {{ cartStore.totalCount }}
          </span>
        </button>
        <div class="cart-summary">
          <p class="cart-total" data-testid="cart-bar-total">
            ¥{{ formatMoney(cartStore.totalAmount) }}
          </p>
          <p class="cart-fee">另需配送费 ¥{{ formatMoney(store.deliveryFee) }}</p>
        </div>
        <button
          class="checkout-btn"
          type="button"
          data-testid="checkout-btn"
          :disabled="isClosed"
          @click.stop="onCheckout"
        >
          去结算
        </button>
      </div>

      <!-- 购物车弹层（T50，PRD：点击购物车栏展开；行内步进器可增减，减到 0 移除） -->
      <template v-if="cartPopupOpen">
        <div class="cart-popup-mask" data-testid="cart-popup-mask" @click="toggleCartPopup" />
        <section class="cart-popup" data-testid="cart-popup" role="dialog" aria-label="购物车">
          <header class="cart-popup-head">
            <span class="cart-popup-title">购物车</span>
            <button
              class="cart-popup-close"
              type="button"
              data-testid="cart-popup-close"
              aria-label="收起购物车"
              @click="toggleCartPopup"
            >
              收起
            </button>
          </header>
          <ul class="cart-popup-list">
            <li
              v-for="line in cartStore.lines"
              :key="line.cartLineId"
              class="cart-popup-item"
              data-testid="cart-popup-item"
            >
              <span class="cart-popup-name">{{ line.name }}</span>
              <span class="cart-popup-price">¥{{ formatMoney(line.unitPrice) }}</span>
              <span class="product-stepper">
                <button
                  class="stepper-btn"
                  type="button"
                  :data-testid="`popup-minus-${line.cartLineId}`"
                  :disabled="cartStore.isStepping(line.cartLineId)"
                  aria-label="减少数量"
                  @click="cartStore.decrementLine(line.cartLineId)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                  </svg>
                </button>
                <span class="stepper-qty">{{ line.quantity }}</span>
                <button
                  class="stepper-btn stepper-btn--add"
                  type="button"
                  :data-testid="`popup-plus-${line.cartLineId}`"
                  :disabled="cartStore.isStepping(line.cartLineId)"
                  aria-label="增加数量"
                  @click="cartStore.incrementLine(line.cartLineId)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                  </svg>
                </button>
              </span>
            </li>
          </ul>
          <p class="cart-popup-total" data-testid="cart-popup-total">
            合计：¥{{ formatMoney(cartStore.totalAmount) }}
          </p>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.store-detail-page {
  min-height: 100%;
  background: var(--color-surface);
  /* 底部购物车栏高度留白 */
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

/* ---- 顶部栏 ---- */
.detail-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: var(--color-surface-white);
}

.header-btn {
  width: 28px;
  height: 28px;
  color: var(--color-primary);
  cursor: pointer;
}

.header-btn svg {
  display: block;
  width: 100%;
  height: 100%;
}

.detail-brand {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-primary);
}

/* ---- 状态占位（加载/404/错误） ---- */
.detail-state {
  padding: 64px 12px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.detail-state-text {
  margin: 0 0 12px;
}

.state-retry {
  color: var(--color-primary);
  cursor: pointer;
}

/* ---- 商家信息横幅 ---- */
.store-banner {
  background: var(--color-surface-white);
}

.banner-img {
  width: 100%;
  height: 96px;
  object-fit: cover;
}

.store-info {
  margin-top: -24px;
  padding: 0 12px 16px;
  display: flex;
  flex-direction: column;
  row-gap: 8px;
}

.store-logo-row {
  display: flex;
  align-items: flex-end;
  column-gap: 12px;
}

.store-logo-box {
  flex: none;
  width: 62px;
  height: 64px;
  border: 1px solid #eeeeee;
  border-radius: 8px;
  background: var(--color-surface-white);
  overflow: hidden;
}

.store-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.store-name {
  margin: 0 0 4px;
  font-size: 18px;
  line-height: 28px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.store-meta-row {
  display: flex;
  align-items: center;
  column-gap: 8px;
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-secondary);
}

.star-icon {
  width: 12px;
  height: 11px;
}

.store-rating {
  color: var(--color-primary);
  font-weight: 500;
}

.meta-divider {
  width: 1px;
  height: 10px;
  background: var(--color-border-light);
}

.store-status-closed {
  margin-left: auto;
  color: var(--color-error);
}

.store-tags-row {
  display: flex;
  align-items: center;
  column-gap: 8px;
  margin: 0;
}

.store-promo-tag {
  padding: 2px 6px;
  border-radius: var(--radius-default);
  background: #ffe0d5;
  font-size: 11px;
  line-height: 16px;
  color: var(--color-primary);
}

.store-coupon-btn {
  display: inline-flex;
  align-items: center;
  column-gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-default);
  background: var(--color-surface-white);
  font-size: 11px;
  line-height: 16px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.store-coupon-btn svg {
  width: 12px;
  height: 12px;
}

.store-closed-tip {
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-error);
}

/* ---- 点餐/评价 Tab ---- */
.store-tabs {
  display: flex;
  height: 44px;
  margin-top: 8px;
  background: var(--color-surface-white);
}

.store-tab {
  flex: 1;
  position: relative;
  border: none;
  background: none;
  font-size: 16px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.store-tab--active {
  color: var(--color-primary);
  font-weight: 500;
}

.store-tab--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 4px;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  border-radius: 1px;
  background: var(--color-primary);
}

.review-placeholder {
  padding: 64px 12px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ---- 点餐区 ---- */
.order-area {
  display: flex;
  align-items: stretch;
  min-height: 320px;
}

.cat-rail {
  flex: none;
  width: 84px;
  background: var(--color-surface-container);
}

.cat-rail-item {
  display: block;
  width: 100%;
  height: 52px;
  padding: 0 12px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.cat-rail-item--active {
  background: var(--color-surface-white);
  font-weight: 500;
  color: var(--color-text-primary);
}

.product-list {
  flex: 1;
  min-width: 0;
  padding: 12px;
  background: var(--color-surface-white);
}

.product-list-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.product-item {
  display: flex;
  column-gap: 12px;
  margin-bottom: 16px;
}

.product-item--soldout {
  opacity: 0.5;
}

.product-img {
  flex: none;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-lg);
  object-fit: cover;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.product-name {
  margin: 0;
  font-size: 15px;
  line-height: 20px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.product-desc {
  margin: 4px 0 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 16px;
  color: var(--color-text-tertiary);
}

.product-meta {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 15px;
  color: var(--color-text-tertiary);
}

.product-price-row {
  display: flex;
  align-items: center;
  margin: auto 0 0;
}

.product-price {
  color: var(--color-primary);
}

.price-symbol {
  font-size: 12px;
}

.price-int {
  font-size: 16px;
  font-weight: 500;
}

.product-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-surface-white);
  cursor: pointer;
}

/* 行内步进器（T47-T49）：- 数量 + */
.product-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-surface-white);
  cursor: pointer;
}

.stepper-btn:disabled {
  opacity: 0.5;
}

.stepper-btn svg {
  width: 14px;
  height: 14px;
}

.stepper-qty {
  min-width: 18px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-on-surface);
}

/* 购物车弹层（T50） */
.cart-popup-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.45);
}

.cart-popup {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(72px + env(safe-area-inset-bottom));
  z-index: 40;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 12px;
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.12);
}

.cart-popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f3f3;
}

.cart-popup-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1c1c;
}

.cart-popup-close {
  border: none;
  background: none;
  color: #999;
  font-size: 13px;
}

.cart-popup-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 40vh;
  overflow-y: auto;
}

.cart-popup-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.cart-popup-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #1a1c1c;
}

.cart-popup-price {
  font-size: 13px;
  color: #ff5a1f;
  font-weight: 600;
}

.cart-popup-total {
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid #f3f3f3;
  text-align: right;
  font-size: 14px;
  font-weight: 700;
  color: #ff5a1f;
}

.product-add:disabled {
  background: var(--color-surface-container);
  cursor: not-allowed;
}

.product-add svg {
  width: 14px;
  height: 14px;
}

.product-soldout-text {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 14px;
  color: var(--color-text-tertiary);
}

.product-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* ---- 底部购物车栏 ---- */
.cart-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 430px;
  height: 56px;
  padding: 0 12px;
  background: var(--color-surface-white);
  border-top: 1px solid var(--color-border-light);
  padding-bottom: env(safe-area-inset-bottom);
}

.cart-icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-top: -12px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-surface-white);
  cursor: pointer;
}

.cart-icon-btn:disabled {
  background: var(--color-surface-container);
}

.cart-icon-btn svg {
  width: 22px;
  height: 22px;
}

.cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ff1414; /* 未读/数量角标语义红（AGENTS 允许） */
  font-size: 10px;
  line-height: 16px;
  color: var(--color-surface-white);
}

.cart-summary {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.cart-total {
  margin: 0;
  font-size: 18px;
  line-height: 22px;
  font-weight: 500;
  color: var(--color-primary);
}

.cart-fee {
  margin: 0;
  font-size: 11px;
  line-height: 14px;
  color: var(--color-text-tertiary);
}

.checkout-btn {
  flex: none;
  width: 96px;
  height: 40px;
  border: none;
  border-radius: 20px;
  background: var(--color-primary);
  font-size: 15px;
  font-weight: 500;
  color: var(--color-surface-white);
  cursor: pointer;
}

.checkout-btn:disabled {
  background: var(--color-surface-container);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}
</style>
