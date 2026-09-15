<script setup lang="ts">
/**
 * 商家详情页（视觉真源：docs/design/exports/用户端/04-商家详情/02-商家详情-商品列表与评分，390 宽）
 * 2026-09-06 TDD 落地（T11-T18）：详情/分类/商品/购物车数据驱动 + 三 Tab（点餐/评价占位）+ 底部购物车栏
 * 口径（PRD 7.16.1 + 契约 §3.2/§3.4）：
 * - 评价 Tab：P1 未选定，占位"评价功能暂未开放"，不请求评价接口（契约 §6.2）
 * - 售罄商品灰化禁加购；店铺休息加购/结算禁用并提示
 * - 去结算校验顺序：登录 → 购物车非空 → 店铺营业 → 达起送价，然后进确认订单（2026-09-08 起送拦截）
 * - 无底部导航（底部为购物车栏）；未登录可浏览
 * 2026-09-08 滚动交接修复（§5）：外层未滚到 Tab 吸顶线时锁定左右两栏滚动，滚轮/触摸先滚外层
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalogStore'
import { useCartStore } from '@/stores/cartStore'
import { useSessionStore } from '@/stores/sessionStore'
import { formatMoney, formatTime, storeStatusText } from '@/services/normalizers'
import type { ReviewFilter } from '@/services/api/types'
import { reviewApi, favoriteApi } from '@/services/api'
import type { CartLine, Product, ReviewRecord, StoreCategory } from '@/services/api/types'
import { toast } from '@/utils/toast'
import { flyToCart } from '@/utils/flyToCart'
import StoreCover from '@/components/StoreCover.vue'
import { productImageSrc, storeImageSrc } from '@/utils/demoImages'

const ASSETS = '/design-assets/首页-精细'
/** 商品图契约暂无图片字段：用固定素材占位（PRD：图片为空显示占位图） */
const route = useRoute()
const router = useRouter()
/** 底部购物车栏元素（加购抛球的终点；用 ref 而非 querySelector，见 animateAddToCart 注释） */
const cartBarEl = ref<HTMLElement | null>(null)
const catalogStore = useCatalogStore()
const cartStore = useCartStore()
const sessionStore = useSessionStore()

const storeId = String(route.params.storeId)

const activeTab = ref<'order' | 'review'>('order')

/** 店铺评价（批次⑩ TODO-USER-003：接契约 §6.2 店铺评价接口，含商家回复与脱敏昵称） */
const reviews = ref<ReviewRecord[]>([])
const reviewLoading = ref(false)
/** 评价加载失败：保留旧结果 + 重试入口（2026-09-15 P1-6） */
const reviewFailed = ref(false)
/** 评价汇总与筛选（Wave3，契约 §6.2）：summary 不随筛选变化；切换筛选重新请求 */
const reviewSummary = ref<{ averageRating: number; totalCount: number } | null>(null)
const reviewFilter = ref<ReviewFilter>('全部')
const REVIEW_FILTERS: ReviewFilter[] = ['全部', '有图', '最新', '好评', '差评']

/** 切换评价筛选：更新选项并重新请求（SRS R682-C7） */
function switchReviewFilter(f: ReviewFilter): void {
  if (reviewFilter.value === f) return
  reviewFilter.value = f
  reviews.value = []
  void loadReviews()
}

/** 评价图片加载失败 → 占位图（PRD 859 异常分支） */
function onReviewImageError(event: Event): void {
  const target = event.target as HTMLImageElement
  target.src = '/design-assets/首页-精细/product-thumb-1.png'
  target.style.opacity = '0.5'
}

async function loadReviews(): Promise<void> {
  reviewLoading.value = true
  reviewFailed.value = false
  try {
    const page = await reviewApi.getStoreReviews(storeId, reviewFilter.value)
    reviewSummary.value = page.summary
    reviews.value = page.list
  } catch {
    // 评价加载失败：保留已显示结果并提供重试（SRS R682-C9，2026-09-15 P1-6）
    reviewFailed.value = true
  } finally {
    reviewLoading.value = false
  }
}

// 切到评价页签时才请求评价接口（点餐页签不拉取）
watch(activeTab, (tab) => {
  if (tab === 'review' && reviews.value.length === 0) void loadReviews()
})
const activeCategoryId = ref('')

// 2026-09-08 闪屏修复（T69）：详情数据归属当前店铺才参与渲染——
// catalogStore 为全局单例，换店首帧可能残留上一店详情，直接渲染会闪现旧店横幅（负责人真机反馈）。
const store = computed(() =>
  catalogStore.storeDetail?.storeId === storeId ? catalogStore.storeDetail : null,
)
// CLOSED 与 TEMPORARILY_CLOSED 都不可下单；只有 OPEN 才允许加购/结算。
const isClosed = computed(() => Boolean(store.value && store.value.status !== 'OPEN'))

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
// 2026-09-08 跨店修复（T67）：仅当分类/商品数据归属当前店铺时才参与默认选中——
// catalogStore 为全局单例，挂载瞬间可能残留上一店铺数据，旧逻辑会把 activeCategoryId
// 锁到旧店分类 id，等本店数据到达后 watcher 直接 return，落成"暂无商品"空态。
// 另：等商品加载完成后再按"第一个有商品"判定，不再先锁空分类（同店缓存命中时立即选中，秒开不变）。
watch(
  () =>
    [catalogStore.categories.length, catalogStore.products.length, catalogStore.productsLoading] as const,
  () => {
    if (activeCategoryId.value) return
    if (
      catalogStore.categories.length === 0 ||
      catalogStore.categoriesStoreId !== storeId ||
      catalogStore.productsStoreId !== storeId
    ) {
      return
    }
    if (catalogStore.productsLoading) return
    const firstWithProducts =
      catalogStore.categories.find(
        (cat) => (productsByCategory.value.get(cat.categoryId) ?? []).length > 0,
      ) ?? catalogStore.categories[0]
    if (firstWithProducts) activeCategoryId.value = firstWithProducts.categoryId
  },
  { immediate: true },
)

// 详情请求成功后标题更新（PRD 顶部栏行）
watch(
  () => catalogStore.storeDetail?.name,
  (name) => {
    if (name) document.title = `${name} · 轻量外卖`
  },
)

onMounted(async () => {
  void catalogStore.fetchStoreDetail(storeId)
  void catalogStore.fetchStoreCategories(storeId)
  void catalogStore.fetchStoreProducts(storeId)
  // §5 滚动交接：监听外层滚动容器（MainLayout 的 .app-main）维护吸顶状态位
  mainScrollEl = document.querySelector('.app-main')
  mainScrollEl?.addEventListener('scroll', updateOuterPinned, { passive: true })
  updateOuterPinned()
  await cartStore.fetchCart(storeId)
  // 收藏状态（批次⑥）：与详情/分类/商品并行，失败不阻塞浏览
  void loadFavoriteState()
  // TC-CRT-012：A 店有商品进 B 店 → 提示购物车按店独立保留
  const hint = cartStore.takeCrossStoreHint()
  if (hint) toast('已为您保留原店铺购物车，本店商品独立结算')
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

/**
 * 商家收藏（批次⑥ TODO-USER-006，PRD 688 行「商家详情收藏/取消，icon 状态切换」、契约 §3.7）
 * - 设计稿未含收藏入口 → 按设计系统新建（图标按钮，与设计系统圆角/主色一致），已收藏用品牌橙实心
 * - 状态判定：已登录时读收藏列表比对当前 storeId（契约无「单店收藏状态」查询接口）
 * - 未登录点收藏 → 引导登录并带 redirect（与加购 T45 同口径，不静默失败）
 * - 重复收藏由后端幂等；请求中禁用按钮，防重复点击
 */
const favorited = ref(false)
const favoriteBusy = ref(false)

async function loadFavoriteState(): Promise<void> {
  if (!sessionStore.isLoggedIn) {
    favorited.value = false
    return
  }
  try {
    const list = await favoriteApi.listFavorites()
    favorited.value = list.some((item) => item.storeId === storeId)
  } catch {
    // 收藏状态读取失败不阻塞浏览：按未收藏展示，用户点击收藏时仍会走后端幂等
    favorited.value = false
  }
}

async function onToggleFavorite(): Promise<void> {
  if (favoriteBusy.value) return
  if (!sessionStore.isLoggedIn) {
    // 商家详情是公开页（路由 meta 无 auth）：整页刷新或直接开深链后守卫不会探活，客户端会话态为空；
    // 服务端会话可能仍有效 → 先探活再判定，避免把已登录用户当未登录拦下（BUG-20260914-003）
    await sessionStore.checkLogin()
  }
  if (!sessionStore.isLoggedIn) {
    toast('请先登录')
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  favoriteBusy.value = true
  try {
    if (favorited.value) {
      await favoriteApi.removeFavorite(storeId)
      favorited.value = false
      toast('已取消收藏')
    } else {
      await favoriteApi.addFavorite(storeId)
      favorited.value = true
      toast('收藏成功')
    }
  } catch {
    // 失败提示由 http 层统一 toast，按钮状态保持原值（用户可重试）
  } finally {
    favoriteBusy.value = false
  }
}

/** 右侧商品列表滚动容器：点击定位与滚动高亮都以它为根（.product-list 已设 position: relative） */
const productListEl = ref<HTMLElement | null>(null)
/** 顶部栏与点餐/评价 Tab：Tab 为 §5 的吸顶线，点击分类时以它为外层滚动目标 */
const detailHeaderEl = ref<HTMLElement | null>(null)
const storeTabsEl = ref<HTMLElement | null>(null)
/** 点击分类触发的程序化滚动窗口：期内忽略 IntersectionObserver 回调，防高亮中途跳变 */
let spyLockUntil = 0
let spy: IntersectionObserver | null = null

/**
 * 外层是否已滚到点餐/评价 Tab 吸顶线（§5 滚动交接的状态位）。
 * 未吸顶时左右两栏锁定滚动（.order-area--locked），滚轮/触摸先滚外层整页——
 * 否则鼠标悬停在商品列表上时滚轮被内层直接吃掉、外层不滚，与 §5
 * 「先滚外层到吸顶线，再滚左右两栏」相悖（2026-09-08 负责人反馈，
 * E2E store-detail-scroll-handoff.spec.ts 复现：悬停列表滚 100px，内层滚了 100px）。
 */
const outerPinned = ref(false)
let mainScrollEl: HTMLElement | null = null

/** 吸顶判定的容差（px）：抵消 px→vw 换算带来的亚像素误差 */
const PIN_TOLERANCE = 1
/**
 * 解除吸顶的**滞后死区**（px，SHOW-QA-004，2026-09-13 修复）：
 * 原实现是单阈值判定（`top <= 顶部栏高 + 1`），Tab 栏 top 在吸顶线附近来回时锁定态反复翻转；
 * 而翻转会同时切换右侧商品列表的可滚状态（`.order-area--locked` 控制 overflow），
 * 导致滚轮时而作用外层、时而作用内层——这就是负责人 9/10 走查到的「抖动」。
 * 现改为：越过吸顶线才锁定，锁定后必须回退超过该死区才解除。
 * ⚠️ **死区取值属交互口径**：暂定 8px（问题记录建议 8–16px），待负责人/测试联调确认后可调整。
 */
const PIN_RELEASE_DEADBAND = 8

function updateOuterPinned(): void {
  const tabs = storeTabsEl.value
  const header = detailHeaderEl.value
  if (!tabs || !header) return
  const line = header.offsetHeight + PIN_TOLERANCE
  const top = tabs.getBoundingClientRect().top
  if (outerPinned.value) {
    // 已吸顶：只有明显回退（超过死区）才解除，避免阈值附近抖动
    if (top > line + PIN_RELEASE_DEADBAND) outerPinned.value = false
    return
  }
  // 未吸顶：越过吸顶线即锁定；jsdom 无布局（矩形与高度均为 0）时恒判定为已吸顶，不影响既有单测
  outerPinned.value = top <= line
}

/**
 * 点击分类：立即高亮 + 列表滚动定位到该分区（项目规则 §5：连续联动，不做整列表切换）
 * 定位基准为分区标题在滚动容器内的 offsetTop。
 */
function onSelectCategory(categoryId: string): void {
  activeCategoryId.value = categoryId
  spyLockUntil = Date.now() + 600
  // 项目规则 §5：点击分类必须先把整页滚到点餐/评价 Tab 吸顶线，再定位到对应商品分区
  pinOuterToTabs()
  const list = productListEl.value
  if (!list) return
  const section = list.querySelector<HTMLElement>(`[data-section-id="${categoryId}"]`)
  if (!section) return
  if (typeof list.scrollTo === 'function') {
    list.scrollTo({ top: section.offsetTop, behavior: 'smooth' })
  } else {
    list.scrollTop = section.offsetTop
  }
}

/**
 * 进入分类商家列表（TODO-USER-107 ② 的入口，位于店名旁）：
 * 参数取**当前选中分类**（默认第一个有商品的分类，见 activeCategoryId 的默认选中口径）；
 * 同时把分类名作为页面参数传出——契约没有「按分类编号取分类名」的用户端接口，
 * 分类名只在店铺分类接口里返回，故由入口负责传递（缺失时目标页回退通用标题）。
 */
function goCategoryList(category: StoreCategory): void {
  void router.push({
    name: 'category-store-list',
    params: { categoryId: category.categoryId },
    query: { name: category.name },
  })
}

/** 当前选中分类对象（店名旁入口用；无分类时入口不渲染） */
const activeCategory = computed<StoreCategory | undefined>(() => {
  const list = catalogStore.categories
  return list.find((cat) => cat.categoryId === activeCategoryId.value) ?? list[0]
})

/**
 * 把外层滚动容器（.app-main，MainLayout 的内容区）滚到 Tab 吸顶线：
 * 目标 = 当前滚动量 + Tab 相对视口的位置 - 顶部栏高度（吸顶线在顶部栏下沿）。
 * 已在吸顶线以下（外层无法再滚）时不动；jsdom 无布局（矩形与高度均为 0）时自然无操作。
 */
function pinOuterToTabs(): void {
  const list = productListEl.value
  const tabs = storeTabsEl.value
  const header = detailHeaderEl.value
  if (!list || !tabs || !header) return
  const main = list.closest('.app-main') as HTMLElement | null
  if (!main) return
  const target = main.scrollTop + tabs.getBoundingClientRect().top - header.offsetHeight
  if (target > main.scrollTop) main.scrollTop = target
  // 程序化滚动同样要刷新吸顶状态位（scroll 事件下一帧才派发，此处同步一次）
  updateOuterPinned()
}

/**
 * 按偏移量判定当前分类（scroll-spy 的唯一事实来源）。
 * 为什么不用 IntersectionObserver 的交集结果直接判定：它只上报“交集状态变化”，
 * 长分区内滚动、或从列表底部滑回顶部时状态不变、回调不触发，高亮会滞留在错误分类
 * （2026-09-08 真浏览器 390x844/390x568 双视口验证发现）。观察器保留为触发源。
 */
function syncActiveCategory(): void {
  const list = productListEl.value
  if (!list || Date.now() < spyLockUntil) return
  const sections = Array.from(list.querySelectorAll<HTMLElement>('[data-section-id]'))
  if (sections.length === 0) return
  // 滑到底部：最后一个分区可能永远到不了顶部命中线，直接取它
  if (
    list.scrollHeight > list.clientHeight &&
    list.scrollTop + list.clientHeight >= list.scrollHeight - 4
  ) {
    const lastId = sections[sections.length - 1]!.dataset.sectionId
    if (lastId) activeCategoryId.value = lastId
    return
  }
  // 否则取最后一个已越过顶部命中线的分区（分区按 DOM 顺序排列）
  const hitLine = list.scrollTop + 4
  let current = sections[0]!
  for (const section of sections) {
    if (section.offsetTop <= hitLine) current = section
    else break
  }
  const id = current.dataset.sectionId
  if (id) activeCategoryId.value = id
}

/** 列表滚动：持续同步高亮（滚动事件即触发源，避免观察器不回调导致的滞后） */
function onListScroll(): void {
  syncActiveCategory()
}

/** 滚动列表时分类高亮同步（scroll-spy）：观察各分区标题，进入列表上部命中区即高亮对应分类 */
function setupScrollSpy(): void {
  if (typeof IntersectionObserver === 'undefined') return
  const list = productListEl.value
  if (!list) return
  spy?.disconnect()
  spy = null
  const sections = Array.from(list.querySelectorAll<HTMLElement>('[data-section-id]'))
  if (sections.length === 0) return
  spy = new IntersectionObserver(
    () => {
      // 仅作触发：实际判定交给 syncActiveCategory（偏移量口径）
      syncActiveCategory()
    },
    { root: list, rootMargin: '0px 0px -60% 0px', threshold: 0 },
  )
  for (const section of sections) spy.observe(section)
}

// 列表元素挂载（或分类/商品数据变化）后重建观察目标：
// 分类/商品可能先于店铺详情返回，此时列表尚未渲染（productListEl 为空），
// 必须把元素本身纳入依赖，否则详情到达后无人触发、滚动高亮整体失效（2026-09-08 竞态修复）
watch(
  () =>
    [productListEl.value, catalogStore.categories.length, catalogStore.products.length] as const,
  async () => {
    await nextTick()
    setupScrollSpy()
  },
  { immediate: true, flush: 'post' },
)

onUnmounted(() => {
  spy?.disconnect()
  mainScrollEl?.removeEventListener('scroll', updateOuterPinned)
})

/** 售罄/下架商品禁止加购（契约：库存 0 显示售罄禁止加购） */
function isSoldOut(product: Product): boolean {
  return !product.onSale || product.stock <= 0
}

/** 是否「有规格」商品（契约 §3.2/§4.2：`specOptions` 非空即需先选规格再加购） */
function hasSpecs(product: Product): boolean {
  return (product.specOptions ?? []).length > 0
}

/** 会员价（契约 §3.2：非会员仍返回该字段，计价仍按 price）；缺失返回 null → 整块隐藏 */
function memberPriceOf(product: Product): number | null {
  return typeof product.memberPrice === 'number' ? product.memberPrice : null
}

async function onAdd(product: Product, event?: MouseEvent): Promise<void> {
  if (isClosed.value || isSoldOut(product)) return
  // 有规格商品：点加号先打开规格弹层，选定规格后才加购（PRD 850 行）
  if (hasSpecs(product)) {
    openSpecPopup(product)
    return
  }
  // 加购需登录（后端 401 口径）：未登录引导登录并回跳商家详情，不静默失败
  // （PRD 校验顺序"登录先行"；9/7 联调修正，用例 T45）
  if (!sessionStore.isLoggedIn) {
    // 商家详情是公开页（路由 meta 无 auth）：整页刷新或直接开深链后守卫不会探活，客户端会话态为空；
    // 服务端会话可能仍有效 → 先探活再判定，避免把已登录用户当未登录拦下（BUG-20260914-003）
    await sessionStore.checkLogin()
  }
  if (!sessionStore.isLoggedIn) {
    toast('请先登录')
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  // 加购动画（TODO-USER-016）：从「加号」抛球到购物车栏，先给即时反馈，不等接口返回
  animateAddToCart(event?.currentTarget as HTMLElement | null)
  // 已加购 → 步进 +1（PATCH）；未加购 → 加购 1 件（POST，同商品合并由后端保证）
  const line = lineOf(product.productId)
  if (line) await cartStore.incrementLine(line.cartLineId)
  else await cartStore.addItem(storeId, product.productId)
}

/**
 * 规格弹层（PRD 850「商品规格弹层-规格弹层」行，契约 §3.4/§4.2）
 * - 规格默认值由商品配置返回；契约 `specOptions` 未定义默认项 → 视为「没有默认值，必须先选择」
 *   （后端 `validatedSelection` 对未选也返回 400「请选择商品规格」，两边口径一致）
 * - 数量默认 1；价格 = 基础价 + 已选规格价差（× 数量），前端只做展示，以后端计价为准
 * - 打开时记录当前商品与库存快照；提交前重新校验上下架/库存，避免用过期快照下单
 * - 遮罩或关闭按钮放弃本次输入
 */
const specPopupOpen = ref(false)
const specProduct = ref<Product | null>(null)
const selectedSpecName = ref('')
const specQuantity = ref(1)
const specSubmitting = ref(false)

function openSpecPopup(product: Product): void {
  specProduct.value = product
  selectedSpecName.value = ''
  specQuantity.value = 1
  specPopupOpen.value = true
}

/** 关闭弹层：放弃本次输入（PRD 交互列） */
function closeSpecPopup(): void {
  specPopupOpen.value = false
  specProduct.value = null
  selectedSpecName.value = ''
  specQuantity.value = 1
}

function selectSpec(name: string): void {
  selectedSpecName.value = name
}

const selectedSpecOption = computed(
  () => specProduct.value?.specOptions?.find((option) => option.name === selectedSpecName.value) ?? null,
)

/** 预览单价 = 基础价 + 已选规格价差（未选规格时即基础价） */
const specUnitPrice = computed(
  () => (specProduct.value?.price ?? 0) + (selectedSpecOption.value?.priceDelta ?? 0),
)

/** 预览合计 = 预览单价 × 数量（PRD：选择规格/数量后只更新预览价） */
const specPreviewTotal = computed(() => specUnitPrice.value * specQuantity.value)

/** 可买上限 = 弹层打开时的库存快照（不足 1 时按 1 兜底，避免数量控件失效） */
const specMaxQuantity = computed(() => Math.max(1, specProduct.value?.stock ?? 1))

function changeSpecQuantity(delta: number): void {
  const next = specQuantity.value + delta
  if (next < 1) {
    toast('数量至少为 1')
    return
  }
  if (next > specMaxQuantity.value) {
    toast(`数量不能超过库存（${specMaxQuantity.value}）`)
    return
  }
  specQuantity.value = next
}

/** 确认加入购物车：校验 → 提交带规格的加购请求 → 成功关闭弹层并刷新购物车栏 */
async function confirmSpecAdd(): Promise<void> {
  const product = specProduct.value
  if (!product || specSubmitting.value) return
  if (isClosed.value) {
    toast('店铺休息中，暂不可下单')
    return
  }
  // 必选规格未选：禁止提交（PRD 异常列；后端同样返回 400 兜底）
  if (!selectedSpecName.value) {
    toast('请选择规格')
    return
  }
  // 商品已删除/下架/库存变化：禁止提交并提示刷新（PRD 异常列）
  if (isSoldOut(product)) {
    toast('商品已售罄或已下架，请刷新后重试')
    return
  }
  if (specQuantity.value > product.stock) {
    toast(`库存不足，最多可买 ${product.stock} 件`)
    return
  }
  if (!sessionStore.isLoggedIn) {
    await sessionStore.checkLogin()
  }
  if (!sessionStore.isLoggedIn) {
    toast('请先登录')
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  specSubmitting.value = true
  try {
    const added = await cartStore.addItem(storeId, product.productId, specQuantity.value, [
      { name: selectedSpecName.value, priceDelta: selectedSpecOption.value?.priceDelta ?? 0 },
    ])
    // 失败原因（售罄/超库存/未登录等）由 http 层统一 toast，弹层保留选择允许重试
    if (added) {
      toast('已加入购物车')
      closeSpecPopup()
    }
  } finally {
    specSubmitting.value = false
  }
}

/** 购物车行规格文案（购物车弹层展示，契约 §3.4：同一商品不同规格是不同行） */
function specTextOf(line: CartLine): string {
  return (line.specOptions ?? []).map((option) => option.name).join(' / ')
}

/**
 * 加购抛物线抛球（TODO-USER-016，PRD 7.3 加购交互）：
 * 起点取被点按钮中心、终点取购物车栏左侧图标区。
 * 终点用**模板 ref**而不是 document.querySelector：组件在单测中可能挂载于游离容器
 * （vue-test-utils 默认不 attachTo document），querySelector 会取不到而静默跳过动画。
 * 动画本身由 `utils/flyToCart` 负责（挂 body + 内联样式 + WAAPI 三关键帧 + 兜底清理）。
 */
function animateAddToCart(source: HTMLElement | null): void {
  const bar = cartBarEl.value
  if (!source || !bar) return
  const from = source.getBoundingClientRect()
  const to = bar.getBoundingClientRect()
  flyToCart(
    { x: from.left + from.width / 2, y: from.top + from.height / 2 },
    { x: to.left + to.width * 0.18, y: to.top + to.height / 2 },
  )
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

/** 去结算校验顺序：登录 → 购物车非空 → 店铺营业 → 达起送价（PRD 点餐内容区行） */
async function onCheckout(): Promise<void> {
  if (!sessionStore.isLoggedIn) {
    // 商家详情是公开页（路由 meta 无 auth）：整页刷新或直接开深链后守卫不会探活，客户端会话态为空；
    // 服务端会话可能仍有效 → 先探活再判定，避免把已登录用户当未登录拦下（BUG-20260914-003）
    await sessionStore.checkLogin()
  }
  if (!sessionStore.isLoggedIn) {
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (cartStore.totalCount === 0) {
    toast('请先加入商品')
    return
  }
  // 起送金额拦截（2026-09-08 负责人拍板「点去结算就拦」）：差额算法与确认订单页同口径，
  // 确认订单页内的 submitDisabled/blockReason 兜底保留（可深链直达、购物车可再变）
  const startPrice = store.value?.startPrice ?? 0
  const delta = startPrice - cartStore.totalAmount
  if (delta > 0) {
    toast(`还差 ¥${formatMoney(delta)} 起送（满 ¥${formatMoney(startPrice)} 可下单）`)
    return
  }
  // 确认订单页 9/7 落地：校验通过进入确认订单，携带商家编号（PRD 顶部栏行）
  void router.push({ name: 'order-confirm', query: { storeId } })
}
</script>

<template>
  <div class="store-detail-page">
    <header ref="detailHeaderEl" class="detail-header">
      <button class="header-btn" type="button" aria-label="返回" @click="onBack">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4.5L7.5 12L15 19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <!-- 应用名按课程口径，不沿用设计稿的第三方品牌名（与批次⑩ 105 的应用标题、MemberView 会员页同一处理） -->
      <span class="detail-brand">轻量外卖</span>
      <button class="header-btn" type="button" aria-label="搜索" @click="onPlaceholderClick">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M15.8 15.8L20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
    </header>

    <!-- 加载占位（PRD：首次请求显示顶部占位） -->
    <div v-if="catalogStore.detailLoading && !store" class="detail-state">
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
        <StoreCover class="banner-img" :name="store.name" :image="storeImageSrc(storeId, store.image)" />
        <div class="store-info">
          <div class="store-logo-row">
            <span class="store-logo-box">
              <StoreCover class="store-logo" :name="store.name" :image="storeImageSrc(storeId, store.image)" />
            </span>
            <h1 class="store-name">{{ store.name }}</h1>
            <!-- 同类商家入口（TODO-USER-107 ②）：放在店名旁；参数取当前选中分类（默认第一个有商品的分类），
                 进入分类商家列表；左分类栏仍保持「点击滚动定位」不变（项目规则 §5，锁于 T76） -->
            <button
              v-if="activeCategory"
              class="store-similar"
              type="button"
              data-testid="store-similar-btn"
              @click="goCategoryList(activeCategory)"
            >
              同类商家 ›
            </button>
            <!-- 收藏入口（PRD 688：icon 状态切换；设计稿未含，按设计系统新建） -->
            <button
              class="store-favorite"
              type="button"
              data-testid="favorite-toggle"
              :aria-pressed="favorited ? 'true' : 'false'"
              :aria-label="favorited ? '取消收藏' : '收藏商家'"
              :disabled="favoriteBusy"
              @click="onToggleFavorite"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 20.3l-1.2-1.1C6.3 15.2 3.5 12.6 3.5 9.4 3.5 6.9 5.5 5 8 5c1.5 0 2.9.7 3.9 1.9C12.9 5.7 14.4 5 15.9 5c2.5 0 4.6 1.9 4.6 4.4 0 3.2-2.9 5.8-7.3 9.8z"
                  :fill="favorited ? '#ff5a1f' : 'none'"
                  :stroke="favorited ? '#ff5a1f' : '#666666'"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
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
            <span v-if="isClosed" class="store-status-closed">{{ storeStatusText(store.status) }}</span>
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
      <nav ref="storeTabsEl" class="store-tabs">
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

      <!-- 店铺评价列表（批次⑩ 003 真实化：GET /stores/{storeId}/reviews） -->
      <div v-if="activeTab === 'review'" class="review-area" data-testid="review-list">
        <!-- 评价汇总行（Wave3：平均分+总数，来自评价接口聚合，非 stores.rating 静态值） -->
        <div v-if="reviewSummary" class="review-summary" data-testid="review-summary">
          <span class="rs-score">{{ Number(reviewSummary.averageRating || 0).toFixed(1) }}</span>
          <span class="rs-total">{{ reviewSummary.totalCount }} 条评价</span>
        </div>
        <!-- 筛选 chips（契约 §6.2：全部/有图/最新/好评/差评，切换重新请求） -->
        <div class="review-filters" data-testid="review-filters">
          <button
            v-for="f in REVIEW_FILTERS"
            :key="f"
            type="button"
            class="review-filter"
            :class="{ 'is-active': reviewFilter === f }"
            :data-testid="`review-filter-${f}`"
            @click="switchReviewFilter(f)"
          >{{ f }}</button>
        </div>
        <p v-if="reviewLoading" class="review-empty">评价加载中…</p>
        <div v-else-if="reviewFailed" class="review-failed" data-testid="review-failed">
          <span>{{ reviews.length > 0 ? '评价刷新失败，已保留原结果' : '评价加载失败' }}</span>
          <button type="button" data-testid="review-retry-btn" @click="loadReviews">重试</button>
        </div>
        <p v-else-if="reviews.length === 0" class="review-empty" data-testid="review-empty">暂无评价</p>
        <ul v-else class="review-list">
          <li v-for="review in reviews" :key="review.reviewId" class="review-item" data-testid="review-item">
            <div class="review-head">
              <span class="review-nickname">{{ review.userNickname }}</span>
              <span class="review-stars" :aria-label="`${review.rating} 星`">
                {{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}
              </span>
            </div>
            <!-- 评价图片（PRD 859：评价列表展示图片；≤3 张、失败占位，2026-09-15） -->
            <div v-if="review.images && review.images.length > 0" class="review-images" data-testid="review-images">
              <img
                v-for="(img, imgIndex) in review.images.slice(0, 3)"
                :key="imgIndex"
                :src="img"
                alt="评价图片"
                loading="lazy"
                @error="onReviewImageError($event)"
              />
            </div>
            <div v-else class="review-head">
            </div>
            <p class="review-content">{{ review.content }}</p>
            <div v-if="review.tags.length > 0" class="review-tags">
              <span v-for="tag in review.tags" :key="tag" class="review-tag">{{ tag }}</span>
            </div>
            <p class="review-time">{{ formatTime(review.createdAt) }}</p>
            <!-- 商家回复（TC-REV-003：回复内容与时间可见；商家端写权，用户端只读展示） -->
            <div v-if="review.reply" class="review-reply" data-testid="review-reply">
              <p class="review-reply-label">商家回复</p>
              <p class="review-reply-content">{{ review.reply }}</p>
              <p v-if="review.repliedAt" class="review-reply-time">{{ formatTime(review.repliedAt) }}</p>
            </div>
          </li>
        </ul>
      </div>

      <!-- 点餐区：左分类栏 + 右商品列表 -->
      <div v-else class="order-area" :class="{ 'order-area--locked': !outerPinned }">
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
        <div
          ref="productListEl"
          class="product-list"
          data-testid="product-list"
          @scroll="onListScroll"
        >
          <!-- 分段连续渲染全部分类商品（项目规则 §5：不做整列表切换）；分区标题吸顶，供点击定位与滚动高亮 -->
          <section
            v-for="cat in catalogStore.categories"
            :key="cat.categoryId"
            class="product-section"
            :data-section-id="cat.categoryId"
          >
            <h2 class="product-list-title" :data-testid="`product-section-${cat.categoryId}`">
              {{ cat.name }}
            </h2>
            <div
              v-for="product in productsByCategory.get(cat.categoryId) ?? []"
              :key="product.productId"
              class="product-item"
              :class="{ 'product-item--soldout': isSoldOut(product) }"
              :data-testid="`product-item-${product.productId}`"
            >
              <img class="product-img" :src="productImageSrc(product.productId, product.image)" :alt="product.name" />
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
                  <!-- 行内步进器（T47-T49）：已加购显示 "- 数量 +"，未加购仅 + 按钮。
                       有规格商品不在此处步进——同一商品的不同规格在购物车中是不同行（contract §3.4），
                       数量增减统一在规格弹层与购物车弹层内完成（PRD 850 行：点加号打开规格弹层） -->
                  <span v-if="!hasSpecs(product) && qtyOf(product.productId) > 0" class="product-stepper">
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
                      @click="onAdd(product, $event)"
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
                    @click="onAdd(product, $event)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                    </svg>
                  </button>
                </p>
                <!-- 会员价（PRD 7.10「会员价展示（价格行高亮）」、契约 §3.2）：
                     接口返回 memberPrice 才展示；缺失整块隐藏，不显示 undefined。
                     非会员同样可见（契约明确非会员仍返回该字段），实际计价以后端为准 -->
                <p
                  v-if="memberPriceOf(product) !== null"
                  class="product-member-price"
                  :data-testid="`member-price-${product.productId}`"
                >
                  <span class="member-price-tag">会员价</span>
                  <span class="member-price-amount">
                    <span class="price-symbol">¥</span>{{ formatMoney(memberPriceOf(product) as number) }}
                  </span>
                </p>
                <!-- 规格入口提示（PRD 850：有规格的商品卡显示规格入口） -->
                <p v-if="hasSpecs(product)" class="product-spec-hint" :data-testid="`spec-hint-${product.productId}`">
                  可选规格 {{ (product.specOptions ?? []).length }} 项
                </p>
                <p v-if="isSoldOut(product)" class="product-soldout-text">售罄</p>
              </div>
            </div>
          </section>
          <p v-if="!catalogStore.productsLoading && catalogStore.products.length === 0" class="product-empty">
            暂无商品
          </p>
        </div>
      </div>

      <!-- 底部购物车栏（PRD：商品数/合计来自购物车接口；店铺休息结算禁用） -->
      <div ref="cartBarEl" class="cart-bar" data-testid="cart-bar" @click="toggleCartPopup">
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
              <span class="cart-popup-name">
                {{ line.name }}
                <span v-if="specTextOf(line)" class="cart-popup-spec" :data-testid="`popup-spec-${line.cartLineId}`">
                  {{ specTextOf(line) }}
                </span>
              </span>
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

      <!-- 规格弹层（PRD 850 行 / 契约 §3.4·§4.2）：单选规格 + 数量 + 预览价 + 加入购物车 -->
      <template v-if="specPopupOpen && specProduct">
        <div class="spec-mask" data-testid="spec-popup-mask" @click="closeSpecPopup" />
        <section class="spec-popup" data-testid="spec-popup" role="dialog" aria-label="选择规格">
          <header class="spec-head">
            <span class="spec-title" data-testid="spec-popup-name">{{ specProduct.name }}</span>
            <button
              class="spec-close"
              type="button"
              data-testid="spec-popup-close"
              aria-label="关闭规格弹层"
              @click="closeSpecPopup"
            >
              ×
            </button>
          </header>

          <p class="spec-section-label">规格（必选）</p>
          <div class="spec-options" data-testid="spec-options">
            <button
              v-for="option in specProduct.specOptions ?? []"
              :key="option.name"
              class="spec-option"
              :class="{ 'is-selected': selectedSpecName === option.name }"
              :data-testid="`spec-option-${option.name}`"
              type="button"
              :aria-pressed="selectedSpecName === option.name ? 'true' : 'false'"
              @click="selectSpec(option.name)"
            >
              {{ option.name }}
              <span v-if="option.priceDelta > 0" class="spec-option-delta">
                +¥{{ formatMoney(option.priceDelta) }}
              </span>
            </button>
          </div>

          <div class="spec-quantity-row">
            <span class="spec-section-label">数量</span>
            <span class="product-stepper">
              <button
                class="stepper-btn"
                type="button"
                data-testid="spec-minus"
                aria-label="减少数量"
                @click="changeSpecQuantity(-1)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                </svg>
              </button>
              <span class="stepper-qty" data-testid="spec-quantity">{{ specQuantity }}</span>
              <button
                class="stepper-btn stepper-btn--add"
                type="button"
                data-testid="spec-plus"
                aria-label="增加数量"
                @click="changeSpecQuantity(1)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                </svg>
              </button>
            </span>
          </div>

          <p class="spec-preview" data-testid="spec-preview-total">
            合计：¥{{ formatMoney(specPreviewTotal) }}
          </p>

          <button
            class="spec-submit"
            type="button"
            data-testid="spec-submit"
            :disabled="specSubmitting || !selectedSpecName || isClosed || isSoldOut(specProduct)"
            @click="confirmSpecAdd"
          >
            加入购物车
          </button>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.store-detail-page {
  /* 项目规则 §5 滚动交接：外层页面（.app-main）先滚到点餐/评价 Tab 吸顶线，
     之后外层不再滚动、只滚点餐区内部左右两栏；点餐区高度按“视口 - 顶部栏 - Tab 栏”给出，
     使外层最大滚动量恰为“横幅高度 + Tab 上边距”，正好停在吸顶线（2026-09-08 按 §5 重做）。 */
  min-height: 100%;
  background: var(--color-surface);
}

/* ---- 顶部栏 ---- */
.detail-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
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

/* 收藏入口（PRD 688）：与店名同行右对齐；已收藏为品牌橙实心（图标 fill 由模板按状态切换） */
.store-favorite {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: 12px;
  background: none;
}

.store-favorite svg {
  width: 22px;
  height: 22px;
}

.store-favorite:disabled {
  opacity: 0.5;
}

.store-logo-box {
  flex: none;
  width: 62px;
  height: 64px;
  border: 1px solid #eeeeee;
  border-radius: 0 8px 8px 0;
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
  font-size: 20px;
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

/* ---- 点餐/评价 Tab（§5 吸顶线：滚到顶部栏下沿后固定，之后外层页面不再滚动）---- */
.store-tabs {
  position: sticky;
  top: 56px;
  z-index: 5;
  display: flex;
  height: 44px;
  /* 设计稿：Tab 与上方商家横幅同为白底通栏，用 1px hairline 分隔（无 8px 灰缝） */
  border-top: 1px solid var(--color-border-light);
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

.review-area {
  padding: 12px;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  background: #ffffff;
}
.review-failed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px;
  font-size: 13px;
  color: var(--color-text-secondary, #666);
}
.review-failed button {
  border: 1px solid var(--color-primary, #ff5a1f);
  background: none;
  color: var(--color-primary, #ff5a1f);
  border-radius: 6px;
  padding: 3px 14px;
  font-size: 12px;
}
.review-images {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.review-images img {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  object-fit: cover;
}

.review-empty {
  padding: 32px 12px;
  text-align: center;
  font-size: 13px;
  color: #999999;
}

.review-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.review-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.review-item:last-child {
  border-bottom: none;
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-nickname {
  font-size: 14px;
  font-weight: 500;
  color: #1a1c1c;
}

.review-stars {
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--color-primary);
}

.review-content {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 21px;
  color: #1a1c1c;
}

.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.review-tag {
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 18px;
  color: #666666;
}

.review-time {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

/* 商家回复块：浅品牌底，与评价正文区分（设计系统-用户端「商家评价页/评价列表」行） */
.review-reply {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff3ed;
}

.review-reply-label {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: var(--color-primary);
}

.review-reply-content {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 20px;
  color: #1a1c1c;
}

.review-reply-time {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #999999;
}

/* ---- 点餐区（滚动容器策略按设计稿导出 code.html：页面不滚，左右两栏各自滚动、右侧铺满到购物车栏上沿）---- */
.order-area {
  /* §5 滚动交接：本区高度 = 视口 - 顶部栏(56) - Tab 栏(44)，使外层最大滚动量恰为
     “横幅高度 + Tab 上边距”，滚到 Tab 吸顶线即止；此后只滚本区内部的左右两栏 */
  height: calc(100dvh - 100px);
  display: flex;
  align-items: stretch;
}

/* 未吸顶：锁定左右两栏滚动，让滚轮/触摸先作用于外层整页（§5 滚动交接）。
   2026-09-08 修复「鼠标悬停在商品列表上时滚轮直接滚内层、外层不动」，
   回归见 e2e/store-detail-scroll-handoff.spec.ts */
.order-area--locked .cat-rail,
.order-area--locked .product-list {
  overflow-y: hidden;
}

.cat-rail {
  flex: none;
  width: 84px;
  overflow-y: auto;
  /* 底部购物车栏遮挡留白，最后一项可滚到栏上沿之上；
     底栏高度含安全区（min-height 64px + env(safe-area-inset-bottom)），故留白同步计入 */
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  background: var(--color-surface-container);
}

.cat-rail-item {
  display: block;
  width: 100%;
  height: 52px;
  padding: 0 12px;
  border: none;
  background: none;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.cat-rail-item--active {
  /* TODO-USER-015：选中项加外圆角（负责人 9/10 走查，设计系统 8px 圆角阶梯） */
  border-radius: 0 8px 8px 0;
  background: var(--color-surface-white);
  font-weight: 500;
  color: var(--color-text-primary);
}

.product-list {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  /* 底部留白同左栏：避开固定购物车栏，最后一件商品可完整滚到栏上沿之上 */
  padding: 0 12px calc(64px + env(safe-area-inset-bottom));
  background: var(--color-surface-white);
}

.product-list-title {
  /* 分区标题吸顶（设计稿导出 sticky top-0）：滚动列表时当前分类标题常驻列表顶部 */
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: 12px 0;
  background: var(--color-surface-white);
  font-size: 18px;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 店名旁的「同类商家」入口（TODO-USER-107 ②）：低视觉权重的文字链，紧邻店名、不与收藏 icon 抢位 */
.store-similar {
  flex: none;
  padding: 2px 8px;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  background: none;
  font-family: inherit;
  font-size: 11px;
  line-height: 16px;
  color: var(--color-primary);
  cursor: pointer;
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
  border-radius: var(--radius-sm);
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
  font-size: 16px;
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
  font-size: 18px;
  font-weight: 700;
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

/* 展开态抽屉贴视口底端并盖住购物车栏（2026-09-08 缺陷修复）：
   原 bottom 为「购物车栏 64px + 8px 间距」，抽屉与底栏之间留出可透视的缝，
   而遮罩（z-index 30）又压在底栏（z-index 20）之上，缝隙里露出商品列表、底栏整体被压暗。
   贴底后底部内边距自行吃安全区，避免「合计」行被 Home 指示条遮挡。 */
.cart-popup {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
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
  /* TODO-USER-018：展开态可视高度不足（负责人 9/10 走查）→ 40vh 提到 56vh；
     仍保留内部滚动，避免抽屉顶到吸顶 Tab 线与底部购物车栏 */
  max-height: 56vh;
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
  /* SHOW-QA-001 真机安全区（2026-09-13）：原为固定 height: 64px + padding-bottom: env(...)，
     box-sizing 为 border-box 时安全区会把内容区压扁（iPhone 底部指示条约 34px → 内容仅余 30px）。
     改为 min-height：安全区只让整栏变高、不压缩内容，与 TabBar 与下单页底栏的写法一致。 */
  min-height: 64px;
  padding: 0 12px env(safe-area-inset-bottom);
  background: var(--color-surface-white);
  border-top: 1px solid var(--color-border-light);
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
  /* TODO-USER-020：去掉胶囊形态，改直角（负责人 9/10 走查：对齐真实饿了么底栏） */
  border-radius: 4px;
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

/* ---- 会员价（PRD 7.10：价格行高亮） ---- */
.product-member-price {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
}

.member-price-tag {
  padding: 1px 6px;
  border-radius: 2px;
  background: var(--color-primary);
  font-size: 10px;
  line-height: 16px;
  color: var(--color-surface-white);
}

.member-price-amount {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}

/* ---- 规格入口提示 ---- */
.product-spec-hint {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 14px;
  color: var(--color-text-tertiary);
}

/* ---- 规格弹层（PRD 850 行） ---- */
.spec-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.45);
}

.spec-popup {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  border-radius: 12px 12px 0 0;
  background: var(--color-surface-white);
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.12);
}

.spec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.spec-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.spec-close {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 22px;
  line-height: 1;
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.spec-section-label {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 规格选项：未选为描边胶囊，选中为品牌橙描边 + 浅品牌底（设计系统选中态口径） */
.spec-option {
  padding: 8px 14px;
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  background: none;
  font-size: 14px;
  color: var(--color-text-primary);
  cursor: pointer;
}

.spec-option.is-selected {
  border-color: var(--color-primary);
  background: #ffdbd0;
  color: var(--color-primary);
}

.spec-option-delta {
  margin-left: 4px;
  font-size: 12px;
}

.spec-quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.spec-preview {
  margin: 0;
  text-align: right;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-primary);
}

.spec-submit {
  height: 44px;
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  font-size: 16px;
  font-weight: 500;
  color: var(--color-surface-white);
  cursor: pointer;
}

.spec-submit:disabled {
  background: var(--color-surface-container);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

/* 购物车弹层内的规格文案（同一商品不同规格是不同行） */
.cart-popup-spec {
  margin-left: 6px;
  font-size: 11px;
  color: var(--color-text-tertiary);
}
</style>
<style scoped>
.review-summary {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px 6px;
}
.review-summary .rs-score {
  font-size: 26px;
  font-weight: 800;
  color: #ff5a1f;
}
.review-summary .rs-total {
  font-size: 12px;
  color: #666;
}
.review-filters {
  display: flex;
  gap: 8px;
  padding: 0 12px 10px;
  flex-wrap: wrap;
}
.review-filter {
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #666;
  border-radius: 14px;
  padding: 3px 14px;
  font-size: 12px;
}
.review-filter.is-active {
  color: #ff5a1f;
  border-color: #ff5a1f;
  background: #fff5ef;
  font-weight: 600;
}
</style>
