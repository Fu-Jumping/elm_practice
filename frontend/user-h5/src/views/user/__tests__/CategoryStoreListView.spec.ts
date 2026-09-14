import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import CategoryStoreListView from '../CategoryStoreListView.vue'
import { mockDispatch } from '@/mocks'

const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: vi.fn() }
})

/**
 * 分类商家列表页测试（TODO-USER-107 ②）
 * 口径来源：PRD 7.16.1「分类商家列表页-顶部栏与筛选栏 / 商家列表内容区」两行 + 契约 §3.2
 * CL-1 顶部栏标题来自页面参数；按接口返回渲染商家卡字段（金额两位小数、促销标签）
 * CL-2 无分类名参数时标题回退为「分类商家」（不显示 undefined）
 * CL-3 首次进入带 categoryId 与默认 sort=综合 请求 `GET /stores`；定位文案与首页同口径
 * CL-4 缺 categoryId → 不发起请求并提示
 * CL-5 切换排序 → 带新 sort 重新请求且高亮切换；点同项不重复请求
 * CL-6 切换排序后列表回到顶部（PRD「切换排序或筛选后列表重新请求并回到顶部」）
 * CL-7 接口返回空数组 → 空态「该分类暂无商家」与返回入口，不得用演示数据伪装
 * CL-8 首次加载失败 → 错误态与重试；重试成功后渲染结果
 * CL-9 已有结果时请求失败 → 保留已展示结果并提供重试（PRD 检查列）
 * CL-10 慢响应不得覆盖后发请求的结果
 * CL-11 店铺休息（CLOSED/TEMPORARILY_CLOSED）→ 展示不可购买提示；OPEN 不展示
 * CL-12 字段缺失只隐藏对应字段，不出现 undefined
 * CL-13 点商家卡按 storeId 进商家详情；点返回回上一页
 */
const STORES_SEED = [
  {
    storeId: 'm002',
    name: '肯德基宅急送',
    rating: 4.8,
    monthlySales: 3500,
    deliveryMinutes: 25,
    startPrice: 20,
    deliveryFee: 5,
    status: 'OPEN',
    distanceText: '2.4km',
    couponTags: ['满50减10'],
  },
  {
    storeId: 'm003',
    name: '麦当劳',
    rating: 4.7,
    monthlySales: 2800,
    deliveryMinutes: 25,
    startPrice: 20,
    deliveryFee: 5,
    status: 'OPEN',
    distanceText: '2.9km',
  },
  {
    // 休息中店铺（CL-11）
    storeId: 'm004',
    name: '老胖烧烤',
    rating: 4.5,
    monthlySales: 800,
    deliveryMinutes: 40,
    startPrice: 30,
    deliveryFee: 4,
    status: 'TEMPORARILY_CLOSED',
    distanceText: '3.6km',
    couponTags: ['满88减20'],
  },
  {
    // 字段缺失店铺（CL-12）：无 distanceText / couponTags
    storeId: 'm005',
    name: '缺字段小馆',
    rating: 4.2,
    monthlySales: 300,
    deliveryMinutes: 35,
    startPrice: 10,
    deliveryFee: 0,
    status: 'OPEN',
  },
]

function storesPayload(stores: unknown[]) {
  return {
    status: 200,
    payload: { code: 0, message: 'success', data: stores },
  }
}

/** 记录每次 /stores 请求的参数，便于断言「带什么参数请求」 */
let calls: Array<Record<string, unknown>> = []

function mockStores(handler: (params: Record<string, unknown>) => unknown): void {
  vi.mocked(mockDispatch).mockImplementation(async (config) => {
    if ((config.url ?? '') === '/stores') {
      calls.push({ ...(config.params ?? {}) })
      return handler({ ...(config.params ?? {}) }) as never
    }
    return actualMocks.mockDispatch(config)
  })
}

let router: ReturnType<typeof createRouter>
function makeRouter(path: string) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/category/:categoryId', name: 'category-store-list', component: CategoryStoreListView },
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
    ],
  })
  void router.push(path)
  return router
}

async function mountList(path = '/category/c101?name=%E4%B8%BB%E9%A3%9F') {
  const pinia = createPinia()
  const r = makeRouter(path)
  await r.isReady()
  const wrapper = mount(CategoryStoreListView, { global: { plugins: [pinia, r] } })
  await flushPromises()
  return wrapper
}

describe('CategoryStoreListView（分类商家列表页，TODO-USER-107 ②）', () => {
  beforeEach(() => {
    calls = []
    vi.mocked(mockDispatch).mockImplementation(actualMocks.mockDispatch)
  })

  afterEach(() => {
    vi.mocked(mockDispatch).mockReset()
  })

  it('CL-1 标题来自页面参数；渲染商家卡字段（金额两位小数、促销标签）', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(4),
    )
    expect(wrapper.find('[data-testid="category-title"]').text()).toBe('主食')
    const first = wrapper.findAll('[data-testid="category-store-card"]')[0]!
    expect(first.text()).toContain('肯德基宅急送')
    expect(first.text()).toContain('4.8')
    expect(first.text()).toContain('月售3500')
    expect(first.text()).toContain('25分钟')
    expect(first.text()).toContain('2.4km')
    expect(first.text()).toContain('¥20.00')
    expect(first.text()).toContain('¥5.00')
    expect(first.findAll('[data-testid="category-store-tag"]')).toHaveLength(1)
  })

  it('CL-2 无分类名参数时标题回退为「分类商家」', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList('/category/c101')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(4),
    )
    expect(wrapper.find('[data-testid="category-title"]').text()).toBe('分类商家')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('CL-3 首次进入带 categoryId 与默认 sort=综合 请求 /stores；展示定位文案', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList()
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0))
    expect(calls[0]?.categoryId).toBe('c101')
    expect(calls[0]?.sort).toBe('综合')
    expect(wrapper.find('[data-testid="category-location"]').text()).toContain('天津大学')
    expect(wrapper.find('[data-testid="sort-综合"]').classes()).toContain('is-active')
  })

  it('CL-4 缺 categoryId 参数时不发起请求并提示', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList('/category/')
    await flushPromises()
    expect(calls).toHaveLength(0)
    expect(wrapper.find('[data-testid="category-hint"]').exists()).toBe(true)
  })

  it('CL-5 切换排序带新 sort 重新请求并高亮；点同项不重复请求', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList()
    await vi.waitFor(() => expect(calls.length).toBe(1))

    await wrapper.find('[data-testid="sort-销量"]').trigger('click')
    await vi.waitFor(() => expect(calls.length).toBe(2))
    expect(calls[1]?.sort).toBe('销量')
    expect(wrapper.find('[data-testid="sort-销量"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="sort-综合"]').classes()).not.toContain('is-active')

    await wrapper.find('[data-testid="sort-销量"]').trigger('click')
    await flushPromises()
    expect(calls).toHaveLength(2)
  })

  it('CL-6 切换排序后列表回到顶部', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const pinia = createPinia()
    const r = makeRouter('/category/c101?name=%E4%B8%BB%E9%A3%9F')
    await r.isReady()
    // 宿主滚动容器：jsdom 默认 scrollHeight/clientHeight 为 0，显式声明尺寸以模拟真实可滚容器
    const host = document.createElement('div')
    Object.defineProperty(host, 'scrollHeight', { value: 1200, configurable: true })
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true })
    document.body.appendChild(host)
    host.scrollTop = 240
    const wrapper = mount(CategoryStoreListView, { attachTo: host, global: { plugins: [pinia, r] } })
    await flushPromises()
    await vi.waitFor(() => expect(calls.length).toBe(1))

    await wrapper.find('[data-testid="sort-距离"]').trigger('click')
    await vi.waitFor(() => expect(calls.length).toBe(2))
    expect(host.scrollTop).toBe(0)
    wrapper.unmount()
    host.remove()
  })

  it('CL-7 空数组 → 空态「该分类暂无商家」与返回入口，不伪装演示数据', async () => {
    mockStores(() => storesPayload([]))
    const wrapper = await mountList()
    await vi.waitFor(() => expect(wrapper.find('[data-testid="category-empty"]').exists()).toBe(true))
    expect(wrapper.find('[data-testid="category-empty"]').text()).toContain('该分类暂无商家')
    expect(wrapper.find('[data-testid="category-empty-back"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(0)
  })

  it('CL-8 首次加载失败 → 错误态与重试；重试成功后渲染结果', async () => {
    let fail = true
    mockStores(() => {
      if (fail) {
        return { status: 500, payload: { code: 50000, message: '服务器开小差了', data: null } }
      }
      return storesPayload(STORES_SEED)
    })
    const wrapper = await mountList()
    await vi.waitFor(() => expect(wrapper.find('[data-testid="category-error"]').exists()).toBe(true))
    fail = false
    await wrapper.find('[data-testid="category-retry"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(4),
    )
  })

  it('CL-9 已有结果时请求失败 → 保留已展示结果并提供重试', async () => {
    let fail = false
    mockStores(() => {
      if (fail) {
        return { status: 500, payload: { code: 50000, message: '服务器开小差了', data: null } }
      }
      return storesPayload([STORES_SEED[0]!])
    })
    const wrapper = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(1),
    )
    fail = true
    await wrapper.find('[data-testid="sort-销量"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="category-retry"]').exists()).toBe(true))
    expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="category-store-card"]').text()).toContain('肯德基宅急送')
  })

  it('CL-10 慢响应不得覆盖后发请求的结果', async () => {
    const deferred: Array<() => void> = []
    mockStores((params) => {
      if (params.sort === '销量') {
        return new Promise((resolve) => {
          deferred.push(() => resolve(storesPayload([STORES_SEED[1]!])))
        })
      }
      return storesPayload([STORES_SEED[0]!])
    })
    const wrapper = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="category-store-card"]').text()).toContain('肯德基宅急送'),
    )
    await wrapper.find('[data-testid="sort-销量"]').trigger('click')
    await wrapper.find('[data-testid="sort-综合"]').trigger('click')
    await vi.waitFor(() => expect(calls.length).toBe(3))
    for (const resolve of deferred) resolve()
    await flushPromises()
    expect(wrapper.find('[data-testid="category-store-card"]').text()).toContain('肯德基宅急送')
  })

  it('CL-11 休息中店铺展示不可购买提示；营业中不展示', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(4),
    )
    const cards = wrapper.findAll('[data-testid="category-store-card"]')
    expect(cards[0]!.find('[data-testid="category-store-closed"]').exists()).toBe(false)
    expect(cards[2]!.find('[data-testid="category-store-closed"]').exists()).toBe(true)
    expect(cards[2]!.text()).toContain('休息中')
  })

  it('CL-12 字段缺失只隐藏对应字段，不出现 undefined', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(4),
    )
    const last = wrapper.findAll('[data-testid="category-store-card"]')[3]!
    expect(last.findAll('[data-testid="category-store-tag"]')).toHaveLength(0)
    expect(last.text()).not.toContain('km')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('CL-13 点商家卡按 storeId 进详情；点返回回上一页', async () => {
    mockStores(() => storesPayload(STORES_SEED))
    const wrapper = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="category-store-card"]')).toHaveLength(4),
    )
    await wrapper.findAll('[data-testid="category-store-card"]')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('store-detail')
    expect(router.currentRoute.value.params.storeId).toBe('m003')

    // 返回：无浏览器历史可退时回退首页（与搜索结果页同口径）
    const backWrapper = await mountList()
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(1))
    await backWrapper.find('[data-testid="category-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })
})
