import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '../HomeView.vue'
import { onToast } from '@/utils/toast'
import { useCatalogStore } from '@/stores/catalogStore'
import { useSessionStore } from '@/stores/sessionStore'
import { ADDRESS_SEED, addressMockState } from '@/mocks/address'
import { mockDispatch } from '@/mocks'

// 原始 mock 分发器保留引用：T67/T68 在其响应上剥离 image 字段，模拟 real 模式（后端不填图）形状
const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: vi.fn() }
})

/** 递归剥离 data 中的 image 字段（置空串），对齐真实后端种子不填图的响应形状 */
function stripImages<T>(data: T): T {
  if (Array.isArray(data)) return data.map((d) => stripImages(d)) as unknown as T
  if (data && typeof data === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = k === 'image' ? '' : stripImages(v)
    }
    return out as T
  }
  return data
}

const dispatchStripped: typeof mockDispatch = async (config) =>
  stripImages(await actualMocks.mockDispatch(config))

/** T60-T62 用定位跳转：自建 router 并暴露实例供断言 */
let routerInstance: ReturnType<typeof createRouter>
function routerPlugin() {
  routerInstance = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/addresses', name: 'address-list', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
  return routerInstance
}

/**
 * 首页 P0 行为测试（2026-09-06 负责人拍板替换初始化 Hello 用例；T7-T10 口径同日拍板）
 * 口径来源：PRD 7.16.1（定位频道栏/搜索框/分类宫格/活动区/商家卡行）+ 首页-精细 README §2.3 占位清单
 * T1 定位频道栏：演示地址渲染 + 常点占位提示
 * T2 分类宫格：15 格渲染 + 5 个超范围占位栏目点击提示
 * T3 活动区与筛选标签：占位内容点击提示
 * T4 搜索框：P0 只承担入口，未实现时提示且不发起请求
 * T7 商家卡数据驱动：mock GET /stores 渲染 5 家，字段格式化对齐 PRD 金额/文案口径
 * T8 字段缺失降级：接口未返回的优惠标签/距离整块隐藏，不出现 undefined
 * T9 空态：店铺列表为空显示"暂无商家"
 * T10 加载态：加载中渲染占位卡，完成后消失
 * T46 商品预览聚合（2026-09-07 联调补）：/stores 不返回预览字段时，从各店商品接口聚合前 3 个
 *     （PRD 7.16.1：预览来自商家商品接口；图片为空用占位图；口径演进见 raw 用户端-1428.md）
 * T67/T68 real 形状图片兜底（2026-09-08）：接口 image 为空时首页店招/预览商品图走演示映射
 *     （与详情页同一 utils/demoImages 兜底链；缺陷由 real 模式冒烟暴露，mock 填图曾掩盖）
 */
describe('HomeView（首页 P0）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  const mountHome = () => mount(HomeView, { global: { plugins: [createPinia()] } })

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    // 默认代理原始 mock 分发；T67/T68 用例内再覆写为剥图实现
    vi.mocked(mockDispatch).mockImplementation(actualMocks.mockDispatch)
  })

  afterEach(() => {
    offToast?.()
    vi.mocked(mockDispatch).mockReset()
  })

  it('T1 定位频道栏渲染演示地址；点击"常点"占位提示暂未开放', async () => {
    const wrapper = mountHome()
    const bar = wrapper.find('[data-testid="location-bar"]')
    expect(bar.exists()).toBe(true)
    // PRD：定位文字无地址时使用课程演示地址（北洋园口径 2026-09-05 修正）
    expect(bar.text()).toContain('天津大学北洋园校区')
    expect(bar.text()).toContain('常点')
    expect(bar.text()).toContain('推荐')
    await bar.find('[data-placeholder="常点"]').trigger('click')
    expect(messages).toEqual(['暂未开放'])
  })

  it('T2 分类宫格渲染 15 格，5 个超范围占位栏目点击提示暂未开放', async () => {
    const wrapper = mountHome()
    const grid = wrapper.find('[data-testid="cat-grid"]')
    expect(grid.exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="cat-grid"] .cat-cell')).toHaveLength(15)
    // 占位清单（精细版 README §2.3）：超市便利/水果鲜花/买菜/买药/跑腿
    const placeholders = wrapper.findAll('[data-testid="cat-grid"] [data-placeholder]')
    expect(placeholders).toHaveLength(5)
    const labels = placeholders.map((c) => c.attributes('data-placeholder'))
    for (const name of ['超市便利', '水果鲜花', '买菜', '买药', '跑腿']) {
      expect(labels).toContain(name)
    }
    for (const cell of placeholders) {
      await cell.trigger('click')
    }
    expect(messages).toHaveLength(5)
    expect(new Set(messages)).toEqual(new Set(['暂未开放']))
  })

  it('T3 活动区与筛选标签为占位内容，点击提示暂未开放', async () => {
    const wrapper = mountHome()
    const promoPlaceholders = wrapper.findAll('[data-testid="promo-area"] [data-placeholder]')
    expect(promoPlaceholders.length).toBeGreaterThanOrEqual(3)
    await promoPlaceholders[0]!.trigger('click')
    const filterTags = wrapper.findAll('[data-testid="filter-bar"] [data-placeholder]')
    expect(filterTags).toHaveLength(4)
    await filterTags[0]!.trigger('click')
    expect(messages).toHaveLength(2)
    expect(new Set(messages)).toEqual(new Set(['暂未开放']))
  })

  it('T4 搜索框 P0 仅承担入口，点击提示暂未开放', async () => {
    const wrapper = mountHome()
    const searchBox = wrapper.find('[data-testid="search-bar"] [data-placeholder]')
    expect(searchBox.exists()).toBe(true)
    await searchBox.trigger('click')
    expect(messages).toEqual(['暂未开放'])
  })

  it('T7 商家卡数据驱动渲染 5 家 mock 店铺，字段格式化对齐口径', async () => {
    const wrapper = mountHome()
    // mock 网络延迟 200-500ms，等待卡片渲染完成
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    const first = wrapper.findAll('.merchant-card')[0]!
    // 首卡 m001 老王小店：评分原值、月售/时长拼接、距离与优惠标签来自 mock 展示字段
    expect(first.text()).toContain('老王小店')
    expect(first.text()).toContain('4.6')
    expect(first.text()).toContain('月售1200+')
    expect(first.text()).toContain('30分钟')
    expect(first.text()).toContain('1.8km')
    expect(first.text()).toContain('食无忧')
    // 商品预览按 PRD 口径来自商品接口聚合（2026-09-07 演进：/stores 不再内嵌预览字段）
    await vi.waitFor(() => expect(first.text()).toContain('家常豆腐'), { timeout: 2000 })
    // 价格按 PRD 金额口径两位小数（normalizers.formatMoney）
    expect(first.text()).toContain('12.00')
    // TODO-USER-019：商家卡装饰性标签为纯占位展示（以 data-decorative 标记，不代表真实经营数据）
    const deco = first.find('[data-decorative="true"]')
    expect(deco.exists()).toBe(true)
    expect(deco.text().length).toBeGreaterThan(0)
    // TODO-USER-021：预估价为独立不可换行单元（样式钩子类）
    expect(first.find('.product-price-est').text()).toBe('预估价')
  })

  it('T46 商品预览从商品接口聚合：每卡最多 3 个、图片为空用占位图', async () => {
    const wrapper = mountHome()
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    // m002 肯德基有 5 个商品 → 预览聚合只取前 3 个
    const kfc = wrapper.findAll('.merchant-card').find((c) => c.text().includes('肯德基'))!
    await vi.waitFor(() => expect(kfc.text()).toContain('香辣鸡腿堡'), { timeout: 2000 })
    expect(kfc.findAll('.product-cell')).toHaveLength(3)
    // 商品图接入演示素材（2026-09-07：mock 商品 image 指向 /demo-images；接口空时兜底链见 utils/demoImages）
    const firstImg = kfc.find('.product-img')
    expect(firstImg.attributes('src')).toContain('/demo-images/product-m002-01.jpg')
    // 空态兜底：无商品也不出现 undefined
    expect(wrapper.text()).not.toContain('undefined')
  })

  // T67/T68（2026-09-08 real 模式冒烟发现，负责人报"店图/食物图没了"）：mock 数据层填图掩盖了
  // 首页视图未走 demoImages 兜底链的缺陷——真实后端 image=null 时首页店招与预览商品图全部空图。
  // 口径：接口 image 为空 → 演示映射兜底（与详情页 StoreCover/商品行同一 utils/demoImages 链）
  it('T67 real 形状（接口无 image）：首页店招走演示映射兜底', async () => {
    vi.mocked(mockDispatch).mockImplementation(dispatchStripped)
    const wrapper = mountHome()
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    const kfc = wrapper.findAll('.merchant-card').find((c) => c.text().includes('肯德基'))!
    const cover = kfc.find('img.merchant-cover-img')
    expect(cover.attributes('src')).toBe('/demo-images/store-m002.jpg')
  })

  it('T68 real 形状（接口无 image）：首页预览商品图走演示映射兜底', async () => {
    vi.mocked(mockDispatch).mockImplementation(dispatchStripped)
    const wrapper = mountHome()
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    const kfc = wrapper.findAll('.merchant-card').find((c) => c.text().includes('肯德基'))!
    await vi.waitFor(() => expect(kfc.find('.product-img').exists()).toBe(true), { timeout: 2000 })
    expect(kfc.find('.product-img').attributes('src')).toBe('/demo-images/product-m002-01.jpg')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('T8 接口未返回的字段整块隐藏，页面不出现 undefined', async () => {
    const wrapper = mountHome()
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    // m003 麦当劳在 mock 中缺配 couponTags（现实合理：无优惠活动），其余字段齐备
    const mcdonald = wrapper
      .findAll('.merchant-card')
      .find((c) => c.text().includes('麦当劳'))!
    // PRD 商家卡行：优惠标签只有接口明确返回时展示，字段缺失整块隐藏且不显示 undefined
    expect(mcdonald.find('.merchant-tags').exists()).toBe(false)
    // 商品预览为异步聚合（T46），等待完成后再断言存在
    await vi.waitFor(() => expect(mcdonald.find('.merchant-products').exists()).toBe(true), {
      timeout: 2000,
    })
    expect(mcdonald.find('.merchant-meta--distance').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('T9 店铺列表为空显示暂无商家', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useCatalogStore()
    vi.spyOn(store, 'fetchStores').mockImplementation(async () => {
      store.stores = []
      store.loading = false
      store.error = ''
    })
    const wrapper = mount(HomeView, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(wrapper.find('[data-testid="merchant-empty"]').text()).toContain('暂无商家')
    expect(wrapper.findAll('.merchant-card')).toHaveLength(0)
  })

  it('T10 加载中渲染占位卡，加载完成消失', async () => {
    const wrapper = mountHome()
    // fetchStores 在 onMounted 同步置 loading=true，等重渲染落盘后骨架可见
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="merchant-skeleton"]').exists()).toBe(true)
    await vi.waitFor(() => expect(wrapper.findAll('.merchant-card')).toHaveLength(5), {
      timeout: 2000,
    })
    expect(wrapper.find('[data-testid="merchant-skeleton"]').exists()).toBe(false)
  })

  // T60-T62 首页定位地址（2026-09-07 第三批，PRD 806 行：定位文字来自当前用户默认地址，
  // 无地址/失败回退演示地址并标记；点击定位进入地址列表）
  it('T60 已登录显示默认地址 region（来自地址接口，非写死）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    // 修改默认地址 region：定位文字应随之变化（证明来自接口而非写死文案）
    addressMockState[0]!.region = '自定义园区测试'
    const wrapper = mount(HomeView, { global: { plugins: [pinia, routerPlugin()] } })
    await vi.waitFor(
      () => expect(wrapper.find('.location-text').text()).toContain('自定义园区测试'),
      { timeout: 2000 },
    )
  })

  it('T61 已登录但无地址 → 回退演示地址并标记（PRD：保留默认演示地址）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    addressMockState.splice(0, addressMockState.length)
    const wrapper = mount(HomeView, { global: { plugins: [pinia, routerPlugin()] } })
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="location-bar"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('.location-text').text()).toContain('天津大学北洋园校区')
    // 演示数据标记（PRD：标记为演示数据）
    expect(wrapper.find('.location').attributes('title')).toContain('演示')
  })

  it('T62 点击定位文字 → 进入地址列表（PRD：点击定位文字进入地址列表）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(HomeView, { global: { plugins: [pinia, routerPlugin()] } })
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="location-bar"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('.location').trigger('click')
    await flushPromises()
    expect(routerInstance.currentRoute.value.name).toBe('address-list')
  })
})
