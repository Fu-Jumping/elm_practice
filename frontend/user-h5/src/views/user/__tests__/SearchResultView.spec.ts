import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import SearchResultView from '../SearchResultView.vue'
import { onToast } from '@/utils/toast'
import { mockDispatch } from '@/mocks'
import { useSessionStore } from '@/stores/sessionStore'
import { ADDRESS_SEED, addressMockState } from '@/mocks/address'

const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: vi.fn() }
})

/**
 * 搜索结果页测试（批次⑤ TODO-USER-005）
 * 口径来源：PRD 7.16.1「搜索结果页-搜索头部 / 排序筛选栏 / 商家结果列表」三行 + 契约 §3.6
 * SR-1 关键词来自页面参数并保留在输入框；发起搜索并渲染商家卡字段（金额两位小数）
 * SR-2 空关键词不发起请求，提示输入关键词
 * SR-3 改关键词后点搜索/回车 → 新请求更新结果（不以前端旧列表冒充）
 * SR-4 排序默认综合；切换销量/距离 → 带 sort 重新请求且选项高亮
 * SR-5 无结果显示空态与回首页入口
 * SR-6 接口失败保留关键词并可重试
 * SR-7 慢响应不得覆盖后发请求的结果（旧结果不覆盖新结果）
 * SR-8 促销标签只有接口返回时展示；字段缺失只隐藏，不出现 undefined
 * SR-9 点击商家卡按 storeId 进商家详情
 * SR-10 商品结果组：接口返回 products 时渲染商品组（PRD 831 交互列「更新商家结果和商品结果」），点击进所属商家
 * SR-11 商品组缺失时只渲染商家组，不出现 undefined
 * SR-12 分页：还有下一页显示「加载更多」，点击带 page=2 追加结果；取完显示「没有更多了」
 * SR-13 换关键词或切排序回到第 1 页（分页游标随检索条件重置）
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
    distanceText: '2.1km',
    couponTags: ['满40减5'],
  },
  {
    storeId: 'm001',
    name: '老王小店',
    rating: 4.6,
    monthlySales: 1200,
    deliveryMinutes: 30,
    startPrice: 15,
    deliveryFee: 3,
    status: 'OPEN',
    distanceText: '1.8km',
  },
  {
    // 字段缺失店铺（SR-8）：无 distanceText / couponTags
    storeId: 'm003',
    name: '缺字段小馆',
    rating: 4.2,
    monthlySales: 300,
    deliveryMinutes: 35,
    startPrice: 10,
    deliveryFee: 0,
    status: 'OPEN',
  },
]

function searchPayload(stores: unknown[], keyword = '') {
  return {
    status: 200,
    payload: {
      code: 0,
      message: 'success',
      data: {
        merchants: { list: stores, page: 1, size: 10, total: stores.length },
        products: { list: [], page: 1, size: 10, total: 0 },
      },
    },
  }
}

/** 记录每次 /search 请求的参数，便于断言「带什么参数重新请求」 */
let calls: Array<Record<string, unknown>> = []

function mockSearch(handler: (params: Record<string, unknown>) => unknown): void {
  vi.mocked(mockDispatch).mockImplementation(async (config) => {
    if ((config.url ?? '') === '/search') {
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
      { path: '/search', name: 'search', component: SearchResultView },
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
    ],
  })
  void router.push(path)
  return router
}

async function mountSearch(path = '/search?keyword=肯德基') {
  const pinia = createPinia()
  const r = makeRouter(path)
  await r.isReady()
  const wrapper = mount(SearchResultView, { global: { plugins: [pinia, r] } })
  await flushPromises()
  return wrapper
}

describe('SearchResultView（搜索结果页，批次⑤）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    calls = []
    messages.length = 0
    offToast = onToast((m) => messages.push(m))
    vi.mocked(mockDispatch).mockImplementation(actualMocks.mockDispatch)
  })

  afterEach(() => {
    offToast?.()
    vi.mocked(mockDispatch).mockReset()
  })

  it('SR-1 关键词来自页面参数并保留在输入框；按接口返回渲染商家卡字段（金额两位小数）', async () => {
    mockSearch(() => searchPayload(STORES_SEED))
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
    expect((wrapper.find('[data-testid="search-input"]').element as HTMLInputElement).value).toBe(
      '肯德基',
    )
    const first = wrapper.findAll('[data-testid="search-merchant-card"]')[0]!
    expect(first.text()).toContain('肯德基宅急送')
    expect(first.text()).toContain('4.8')
    expect(first.text()).toContain('月售3500')
    expect(first.text()).toContain('25分钟')
    expect(first.text()).toContain('2.1km')
    expect(first.text()).toContain('¥20.00')
    expect(first.text()).toContain('¥5.00')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('SR-2 空关键词不发起请求并提示输入关键词', async () => {
    mockSearch(() => searchPayload([]))
    const wrapper = await mountSearch('/search')
    await flushPromises()
    expect(calls).toHaveLength(0)
    expect(wrapper.find('[data-testid="search-hint"]').text()).toContain('请输入关键词')
  })

  it('SR-3 修改关键词后点搜索按钮 → 以新关键词重新请求并更新结果', async () => {
    mockSearch((params) =>
      params.keyword === '麦当劳' ? searchPayload([STORES_SEED[1]]) : searchPayload(STORES_SEED),
    )
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
    const input = wrapper.find('[data-testid="search-input"]')
    await input.setValue('麦当劳')
    await wrapper.find('[data-testid="search-submit"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(1),
    )
    expect(calls[calls.length - 1]?.keyword).toBe('麦当劳')
    expect(wrapper.find('[data-testid="search-merchant-card"]').text()).toContain('老王小店')
  })

  it('SR-4 排序默认综合；点「销量」带 sort=销量 重新请求且选项高亮', async () => {
    mockSearch(() => searchPayload(STORES_SEED))
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0))
    expect(calls[0]?.sort).toBe('综合')
    expect(wrapper.find('[data-testid="sort-综合"]').classes()).toContain('is-active')

    await wrapper.find('[data-testid="sort-销量"]').trigger('click')
    await vi.waitFor(() => expect(calls[calls.length - 1]?.sort).toBe('销量'))
    expect(wrapper.find('[data-testid="sort-销量"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="sort-综合"]').classes()).not.toContain('is-active')
  })

  it('SR-5 无结果时显示空态与回首页入口', async () => {
    mockSearch(() => searchPayload([]))
    const wrapper = await mountSearch('/search?keyword=不存在的店')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="search-empty"]').exists()).toBe(true))
    expect(wrapper.find('[data-testid="search-empty"]').text()).toContain('没有找到')
    expect(wrapper.find('[data-testid="search-empty-home"]').exists()).toBe(true)
  })

  it('SR-6 接口失败保留关键词并提供重试；重试成功后渲染结果', async () => {
    let fail = true
    mockSearch(() => {
      if (fail) return { status: 500, payload: { code: 50000, message: '服务器开小差了', data: null } }
      return searchPayload(STORES_SEED)
    })
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="search-error"]').exists()).toBe(true))
    expect((wrapper.find('[data-testid="search-input"]').element as HTMLInputElement).value).toBe(
      '肯德基',
    )
    fail = false
    await wrapper.find('[data-testid="search-retry"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
  })

  it('SR-7 慢响应不得覆盖后发请求的结果（旧结果不覆盖新结果）', async () => {
    const deferred: Array<() => void> = []
    mockSearch((params) => {
      if (params.sort === '销量') {
        // 「销量」请求慢：挂起，等 综合 之后的结果先渲染
        return new Promise((resolve) => {
          deferred.push(() => resolve(searchPayload([STORES_SEED[2]])))
        })
      }
      return searchPayload([STORES_SEED[0]])
    })
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(1),
    )
    await wrapper.find('[data-testid="sort-销量"]').trigger('click')
    // 再切回综合（后发），随后让慢响应返回
    await wrapper.find('[data-testid="sort-综合"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="search-merchant-card"]').text()).toContain('肯德基宅急送'),
    )
    for (const resolve of deferred) resolve()
    await flushPromises()
    expect(wrapper.find('[data-testid="search-merchant-card"]').text()).toContain('肯德基宅急送')
  })

  it('SR-8 促销标签只有接口返回时展示；字段缺失只隐藏且不出现 undefined', async () => {
    mockSearch(() => searchPayload(STORES_SEED))
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
    const cards = wrapper.findAll('[data-testid="search-merchant-card"]')
    expect(cards[0]!.findAll('[data-testid="search-merchant-tag"]')).toHaveLength(1)
    expect(cards[2]!.findAll('[data-testid="search-merchant-tag"]')).toHaveLength(0)
    expect(cards[2]!.text()).not.toContain('km')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('SR-9 点击商家卡按 storeId 进入商家详情', async () => {
    mockSearch(() => searchPayload(STORES_SEED))
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
    await wrapper.findAll('[data-testid="search-merchant-card"]')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('store-detail')
    expect(router.currentRoute.value.params.storeId).toBe('m001')
  })

  it('SR-10 商品结果组：契约返回 products 时渲染商品组，点击进入所属商家详情（PRD 831 交互列）', async () => {
    mockSearch(() => ({
      status: 200,
      payload: {
        code: 0,
        message: 'success',
        data: {
          merchants: { list: STORES_SEED, page: 1, size: 10, total: STORES_SEED.length },
          products: {
            list: [
              {
                productId: 'p101',
                storeId: 'm002',
                categoryId: 'c101',
                name: '香辣鸡腿堡',
                description: '招牌汉堡，香辣多汁',
                image: '/demo-images/product-m002-01.jpg',
                price: 19.5,
                stock: 100,
                onSale: true,
                memberPrice: 17.5,
              },
            ],
            page: 1,
            size: 10,
            total: 1,
          },
        },
      },
    }))
    const wrapper = await mountSearch('/search?keyword=鸡腿堡')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-product-card"]')).toHaveLength(1),
    )
    // 商家组与商品组同时渲染（PRD 831：请求完成后更新商家结果**和商品结果**）
    expect(wrapper.findAll('[data-testid="search-merchant-card"]').length).toBeGreaterThan(0)
    const card = wrapper.find('[data-testid="search-product-card"]')
    expect(card.text()).toContain('香辣鸡腿堡')
    expect(card.text()).toContain('¥19.50')
    // 会员价只有接口返回时才展示（PRD 7.10）
    expect(card.find('[data-testid="search-product-member-price"]').text()).toContain('¥17.50')

    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('store-detail')
    expect(router.currentRoute.value.params.storeId).toBe('m002')
  })

  it('SR-11 商品组缺失（接口未返回 products）时只渲染商家组，不出现 undefined', async () => {
    mockSearch(() => ({
      status: 200,
      payload: {
        code: 0,
        message: 'success',
        data: {
          merchants: { list: STORES_SEED, page: 1, size: 10, total: STORES_SEED.length },
          products: { list: [], page: 1, size: 10, total: 0 },
        },
      },
    }))
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
    expect(wrapper.find('[data-testid="search-product-list"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('SR-12 分页：还有下一页时显示「加载更多」，点击带 page=2 请求并追加；取完显示「没有更多了」', async () => {
    mockSearch((params) => {
      const currentPage = Number(params.page ?? 1)
      return {
        status: 200,
        payload: {
          code: 0,
          message: 'success',
          data: {
            // 共 2 页：第 1 页 3 家、第 2 页 2 家
            merchants: {
              list: currentPage === 1 ? STORES_SEED : [STORES_SEED[1], STORES_SEED[2]],
              page: currentPage,
              size: 10,
              total: 5,
            },
            products: {
              list:
                currentPage === 1
                  ? []
                  : [
                      {
                        productId: 'p101',
                        storeId: 'm002',
                        categoryId: 'c101',
                        name: '香辣鸡腿堡',
                        price: 19.5,
                        stock: 100,
                        onSale: true,
                      },
                    ],
              page: currentPage,
              size: 10,
              total: 1,
            },
            page: currentPage,
            size: 10,
            total: currentPage === 1 ? 0 : 1,
          },
        },
      }
    })
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
    expect(wrapper.find('[data-testid="search-load-more"]').exists()).toBe(true)

    await wrapper.find('[data-testid="search-load-more"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(5),
    )
    // 追加而非替换（第一页结果仍在）
    expect(calls[calls.length - 1]?.page).toBe(2)
    expect(wrapper.findAll('[data-testid="search-merchant-card"]')[0]!.text()).toContain('肯德基宅急送')
    // 商品组同样按页追加
    expect(wrapper.findAll('[data-testid="search-product-card"]')).toHaveLength(1)
    // 两组都取完 → 不再显示加载更多
    expect(wrapper.find('[data-testid="search-load-more"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="search-list-end"]').text()).toContain('没有更多了')
  })

  it('SR-13 换关键词或切排序回到第 1 页（分页游标随检索条件重置）', async () => {
    mockSearch((params) => {
      const currentPage = Number(params.page ?? 1)
      return {
        status: 200,
        payload: {
          code: 0,
          message: 'success',
          data: {
            merchants: {
              list: currentPage === 1 ? STORES_SEED : [STORES_SEED[0]],
              page: currentPage,
              size: 10,
              total: 5,
            },
            products: { list: [], page: currentPage, size: 10, total: 0 },
          },
        },
      }
    })
    const wrapper = await mountSearch('/search?keyword=肯德基')
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0))
    await wrapper.find('[data-testid="search-load-more"]').trigger('click')
    await vi.waitFor(() => expect(calls[calls.length - 1]?.page).toBe(2))

    await wrapper.find('[data-testid="sort-销量"]').trigger('click')
    await vi.waitFor(() => expect(calls[calls.length - 1]?.sort).toBe('销量'))
    // 切排序后重新从第 1 页取，且列表替换而非追加
    expect(calls[calls.length - 1]?.page).toBe(1)
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="search-merchant-card"]')).toHaveLength(3),
    )
  })

  it('SR-14 已登录但无地址 → 定位占位「选择收货地址」（2026-09-15 口径变更·方案 C）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    addressMockState.splice(0, addressMockState.length)
    const r = makeRouter('/search?keyword=肯德基')
    await r.isReady()
    const wrapper = mount(SearchResultView, { global: { plugins: [pinia, r] } })
    await vi.waitFor(() =>
      expect(wrapper.find('.sr-location').text()).toContain('选择收货地址'),
    )
    // 占位态不是演示数据：不得标记「演示地址」
    expect(wrapper.find('.sr-location').attributes('title')).toBeUndefined()
    // 还原地址种子（模块级内存态），避免影响后续用例
    addressMockState.splice(0, addressMockState.length, ...ADDRESS_SEED.map((item) => ({ ...item })))
  })
})
