import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import OrderListView from '../OrderListView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'
import type { MockOrder } from '@/mocks/order'
import { ORDER_FILTERS, emptyTextOf, matchesOrderFilter, statusParamOf } from '@/utils/orderFilters'
import { mockDispatch } from '@/mocks'

const actualMocks = await vi.importActual<typeof import('@/mocks')>('@/mocks')
vi.mock('@/mocks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks')>()
  return { ...actual, mockDispatch: vi.fn() }
})

/**
 * 订单列表状态筛选用例 OLF-1～OLF-6
 * 口径：PRD 7.6「用户端列表筛选取值：全部/待支付/进行中/已完成/待评价/已取消」+
 *       PRD 7.16.1「订单列表页-状态筛选与订单列表」行（筛选默认全部；切换筛选重置列表并请求；
 *       空结果显示对应空态；接口失败保留筛选并重试）＋ 契约 §3.5（`status` 单值查询参数）
 * OLF-1 取值范围与顺序：全部/待支付/进行中/已完成/待评价/已取消，默认「全部」
 * OLF-2 筛选 → 接口 status 参数映射（能一一对应者下传；跨状态者前端收窄）
 * OLF-3 纯前端收窄判定：进行中覆盖 PENDING/COOKING/DELIVERING/PROCESSING；待评价与已完成互斥
 * OLF-4 切换筛选重置列表并带新参数重新请求，选中项高亮
 * OLF-5 分筛选空态文案；筛选切换后不再显示前一筛选的结果
 * OLF-6 接口失败保留当前筛选并提供重试；重试成功后渲染结果
 * 本组在 feat: 实现前必须红（筛选栏与 orderFilters 由 feat: 加入）。
 */

function seed(...overrides: Array<Partial<MockOrder>>): void {
  orderMockState.splice(
    0,
    orderMockState.length,
    ...overrides.map((patch, index) => ({
      ...ORDER_SEED[0]!,
      orderId: `of${index + 1}`,
      storeId: 'm002',
      createdAt: `2026-09-11 1${index}:00:00`,
      ...patch,
    })),
  )
}

describe('orderFilters 口径（PRD 7.6 / 契约 §3.5）', () => {
  it('OLF-1 筛选取值为六个且顺序与 PRD 一致，默认「全部」', () => {
    expect([...ORDER_FILTERS]).toEqual(['全部', '待支付', '进行中', '已完成', '待评价', '已取消'])
    expect(statusParamOf('全部')).toBeUndefined()
  })

  it('OLF-2 筛选 → 接口 status 参数映射（跨状态筛选不带单值参数或只做最大收敛）', () => {
    expect(statusParamOf('待支付')).toBe('PENDING_PAYMENT')
    expect(statusParamOf('已取消')).toBe('CANCELLED')
    // 待评价只能是已完成订单 → 先收窄到 COMPLETED，再由前端按 reviewed 收窄
    expect(statusParamOf('待评价')).toBe('COMPLETED')
    // 进行中跨 PENDING/COOKING/DELIVERING 三个状态值，单值参数无法表达 → 不带参数
    expect(statusParamOf('进行中')).toBeUndefined()
    // 已完成需排除待评价，同样不能只靠 status 参数
    expect(statusParamOf('已完成')).toBeUndefined()
  })

  it('OLF-3 纯前端收窄：进行中覆盖四个状态值；已完成与待评价按 reviewed 互斥', () => {
    expect(matchesOrderFilter({ status: 'PENDING' }, '进行中')).toBe(true)
    expect(matchesOrderFilter({ status: 'COOKING' }, '进行中')).toBe(true)
    expect(matchesOrderFilter({ status: 'DELIVERING' }, '进行中')).toBe(true)
    // P0 历史状态 PROCESSING 仍属进行中（契约 §3.5 状态表）
    expect(matchesOrderFilter({ status: 'PROCESSING' }, '进行中')).toBe(true)
    expect(matchesOrderFilter({ status: 'COMPLETED' }, '进行中')).toBe(false)

    expect(matchesOrderFilter({ status: 'COMPLETED', reviewed: false }, '待评价')).toBe(true)
    expect(matchesOrderFilter({ status: 'COMPLETED', reviewed: false }, '已完成')).toBe(false)
    expect(matchesOrderFilter({ status: 'COMPLETED', reviewed: true }, '已完成')).toBe(true)
    expect(matchesOrderFilter({ status: 'COMPLETED', reviewed: true }, '待评价')).toBe(false)
    // reviewed 缺失（真实后端暂未返回）→ 按未知处理归「已完成」，不误判待评价（TV-13 口径）
    expect(matchesOrderFilter({ status: 'COMPLETED' }, '已完成')).toBe(true)
    expect(matchesOrderFilter({ status: 'COMPLETED' }, '待评价')).toBe(false)

    expect(matchesOrderFilter({ status: 'CANCELLED' }, '已取消')).toBe(true)
    expect(matchesOrderFilter({ status: 'PENDING_PAYMENT' }, '待支付')).toBe(true)
    expect(matchesOrderFilter({ status: 'PENDING_PAYMENT' }, '全部')).toBe(true)

    expect(emptyTextOf('全部')).toBe('暂无订单')
    expect(emptyTextOf('待评价')).toBe('暂无待评价订单')
  })
})

describe('OrderListView 状态筛选（PRD 7.6 / 7.16.1）', () => {
  /** 记录每次 /orders 请求携带的 status 参数 */
  let calls: Array<string | undefined> = []

  beforeEach(() => {
    calls = []
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
    vi.mocked(mockDispatch).mockImplementation(async (config) => {
      if ((config.url ?? '') === '/orders') {
        calls.push((config.params as { status?: string } | undefined)?.status)
      }
      return actualMocks.mockDispatch(config)
    })
  })

  afterEach(() => {
    vi.mocked(mockDispatch).mockReset()
  })

  async function mountList() {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSessionStore().user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/orders', name: 'orders', component: OrderListView },
        { path: '/orders/:orderId', name: 'order-detail', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
        { path: '/', name: 'home', component: { template: '<div />' } },
      ],
    })
    await router.push('/orders')
    await router.isReady()
    const wrapper = mount(OrderListView, { global: { plugins: [pinia, router] } })
    return { wrapper, router }
  }

  it('OLF-4 渲染六个筛选且默认「全部」高亮；切换筛选后按新筛选重新请求并高亮', async () => {
    seed(
      { status: 'PENDING_PAYMENT', reviewed: undefined },
      { status: 'COMPLETED', reviewed: false },
      { status: 'CANCELLED', reviewed: undefined },
    )
    const { wrapper } = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(3),
    )

    // 六个筛选齐全，默认「全部」高亮（PRD：筛选默认全部）
    for (const filter of ORDER_FILTERS) {
      expect(wrapper.find(`[data-testid="order-filter-${filter}"]`).exists()).toBe(true)
    }
    expect(wrapper.find('[data-testid="order-filter-全部"]').classes()).toContain('is-active')

    // 点「待支付」→ 只剩待支付订单，且该筛选项高亮、原「全部」取消高亮
    await wrapper.find('[data-testid="order-filter-待支付"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(1),
    )
    expect(wrapper.find('[data-testid="order-card"]').text()).toContain('待支付')
    expect(wrapper.find('[data-testid="order-filter-待支付"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="order-filter-全部"]').classes()).not.toContain('is-active')

    // 点「已取消」→ 只显示已取消订单（切换即重置，不残留上一次结果）
    await wrapper.find('[data-testid="order-filter-已取消"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(1),
    )
    expect(wrapper.find('[data-testid="order-card"]').text()).toContain('已取消')

    // 重复点击当前筛选项不产生额外请求（PRD：同项不重复请求）
    const before = calls.length
    await wrapper.find('[data-testid="order-filter-已取消"]').trigger('click')
    await flushPromises()
    expect(calls.length).toBe(before)
  })

  it('OLF-5 分筛选空态：无匹配订单显示对应空态文案，且不显示其他筛选的订单', async () => {
    seed({ status: 'PROCESSING', reviewed: undefined })
    const { wrapper } = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(1),
    )

    await wrapper.find('[data-testid="order-filter-已取消"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="order-empty"]').exists()).toBe(true))
    expect(wrapper.find('[data-testid="order-empty"]').text()).toContain('暂无已取消订单')
    expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(0)

    // 「进行中」应命中 P0 历史状态 PROCESSING（契约 §3.5：PROCESSING 仅 P0 保留）
    await wrapper.find('[data-testid="order-filter-进行中"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(1),
    )
  })

  it('OLF-6 接口失败保留当前筛选并可重试；重试成功后恢复渲染', async () => {
    seed({ status: 'CANCELLED', reviewed: undefined })
    const { wrapper } = await mountList()
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(1),
    )

    // 切换筛选期间接口失败 → 保留筛选（不自动跳回全部）并给出重试
    vi.mocked(mockDispatch).mockImplementation(async (config) => {
      if ((config.url ?? '') === '/orders') {
        calls.push((config.params as { status?: string } | undefined)?.status)
        return { status: 500, payload: { code: 50000, message: '服务器开小差了', data: null } } as never
      }
      return actualMocks.mockDispatch(config)
    })
    await wrapper.find('[data-testid="order-filter-待支付"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="order-error"]').exists()).toBe(true))
    // 失败后保留筛选，且不把失败误当「暂无订单」空态
    expect(wrapper.find('[data-testid="order-filter-待支付"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="order-empty"]').exists()).toBe(false)
    // 待支付筛选下传单值 status 参数（契约 §3.5）
    expect(calls[calls.length - 1]).toBe('PENDING_PAYMENT')

    // 重试成功 → 恢复渲染该筛选结果
    vi.mocked(mockDispatch).mockImplementation(actualMocks.mockDispatch)
    orderMockState.splice(0, orderMockState.length, {
      ...ORDER_SEED[0]!,
      orderId: 'of-retry',
      storeId: 'm002',
      status: 'PENDING_PAYMENT',
      payDeadline: '2099-01-01 00:00:00',
    })
    await wrapper.find('[data-testid="order-retry"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-testid="order-card"]')).toHaveLength(1),
    )
    expect(wrapper.find('[data-testid="order-error"]').exists()).toBe(false)
  })
})
