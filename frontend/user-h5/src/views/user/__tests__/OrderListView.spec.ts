import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import OrderListView from '../OrderListView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'
import { clearMockCart, getMockCartSnapshot } from '@/mocks/cart'
import { onToast } from '@/utils/toast'

/**
 * 订单列表页 P0 行为测试 T40–T42（2026-09-07 第二批，口径来自 PRD 7.6 + 7.16 订单列表页三行，AI 辅助脚手架）
 * T40 订单卡渲染：店铺、状态文案、实付金额两位小数、下单时间（金额/状态/时间使用接口值）
 * T41 空态：无订单提示（PRD：空结果显示对应空态）
 * T42 点击卡片进入订单详情
 * 口径：P0 仅"全部"筛选；订单按创建时间倒序（TC-ORD-013）
 */
describe('OrderListView（订单列表页 P0）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
  })

  afterEach(() => offToast?.())

  /** 以当前时刻为基准生成 yyyy-MM-dd HH:mm:ss（待支付倒计时用例需要相对时间） */
  function deadlineFromNow(offsetMs: number): string {
    const date = new Date(Date.now() + offsetMs)
    const pad = (n: number): string => String(n).padStart(2, '0')
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    )
  }

  function bootstrapPinia() {
    const pinia = createPinia()
    setActivePinia(pinia)
    return pinia
  }

  async function mountList(pinia?: ReturnType<typeof createPinia>) {
    const p = pinia ?? bootstrapPinia()
    setActivePinia(p)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/orders', name: 'orders', component: OrderListView },
        { path: '/orders/:orderId', name: 'order-detail', component: { template: '<div />' } },
        { path: '/orders/:orderId/pay', name: 'order-pay', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
        { path: '/orders/:orderId/review', name: 'order-review', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
      ],
    })
    await router.push('/orders')
    await router.isReady()
    const wrapper = mount(OrderListView, { global: { plugins: [p, router] } })
    return { wrapper, router }
  }

  it('T40 订单卡渲染店铺/状态/金额/时间，按创建时间倒序', async () => {
    const { wrapper } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="order-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    const cards = wrapper.findAll('[data-testid="order-card"]')
    // 最新在前（o0002 麦当劳 27.50）；店名来自店铺列表映射（异步），等映射就绪
    await vi.waitFor(() => expect(cards[0]!.text()).toContain('麦当劳'), { timeout: 2000 })
    expect(cards[0]!.text()).toContain('进行中')
    expect(cards[0]!.text()).toContain('27.50')
    expect(cards[0]!.text()).toContain('2026-09-07 11:30:00')
    // 第二笔（o0001 肯德基宅急送 41.00）
    await vi.waitFor(() => expect(cards[1]!.text()).toContain('肯德基宅急送'), { timeout: 2000 })
    expect(cards[1]!.text()).toContain('41.00')
  })

  it('T41 无订单显示空态提示', async () => {
    orderMockState.splice(0, orderMockState.length)
    const { wrapper } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-empty"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="order-empty"]').text()).toContain('暂无订单')
  })

  it('T42 点击订单卡进入订单详情并携带订单号', async () => {
    const { wrapper, router } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="order-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    await cards_first(wrapper).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('order-detail')
    expect(router.currentRoute.value.params.orderId).toBe('o0002')
  })

  /** 取第一张订单卡（列表渲染后存在） */
  function cards_first(wrapper: ReturnType<typeof mount>) {
    return wrapper.findAll('[data-testid="order-card"]')[0]!
  }

  it('TD-9 待支付订单卡提供「去支付」并进入支付页（PRD 订单列表页行，批次⑩ 105）', async () => {
    orderMockState.splice(0, orderMockState.length, {
      ...ORDER_SEED[1]!,
      orderId: 'op09',
      status: 'PENDING_PAYMENT',
      payDeadline: '2099-01-01 00:00:00',
    })
    const { wrapper, router } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-card"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const entry = wrapper.find('[data-testid="order-pay-entry"]')
    expect(entry.exists()).toBe(true)
    await entry.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('order-pay')
    expect(router.currentRoute.value.params.orderId).toBe('op09')
  })
  it('TQ-1 待支付卡片显示支付剩余时间；已到期显示「已失效」并禁用「去支付」（PRD 列表页异常列）', async () => {
    orderMockState.splice(
      0,
      orderMockState.length,
      {
        ...ORDER_SEED[1]!,
        orderId: 'op31',
        status: 'PENDING_PAYMENT',
        createdAt: '2026-09-11 12:00:00',
        payDeadline: deadlineFromNow(15 * 60 * 1000),
      },
      {
        ...ORDER_SEED[1]!,
        orderId: 'op32',
        status: 'PENDING_PAYMENT',
        createdAt: '2026-09-11 11:00:00',
        payDeadline: deadlineFromNow(-60 * 1000),
      },
    )
    const { wrapper } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="order-countdown"]').length).toBe(2),
      { timeout: 2000 },
    )
    const countdowns = wrapper.findAll('[data-testid="order-countdown"]')
    // 列表按创建时间倒序：op31（未到期）在前、op32（已过期）在后
    expect(countdowns[0]!.text()).toMatch(/剩余 \d{2}:\d{2}/)
    expect(countdowns[1]!.text()).toContain('已失效')
    const entries = wrapper.findAll('[data-testid="order-pay-entry"]')
    expect(entries[0]!.attributes('aria-disabled')).not.toBe('true')
    expect(entries[1]!.attributes('aria-disabled')).toBe('true')
    await entries[1]!.trigger('click')
    await flushPromises()
    expect(messages.join('|')).toContain('已失效')
  })

  it('TQ-2 已完成卡片「再来一单」重建购物车并跳商家详情页（契约 §3.5）', async () => {
    clearMockCart('m002')
    orderMockState.splice(0, orderMockState.length, {
      ...ORDER_SEED[0]!,
      orderId: 'op33',
      status: 'COMPLETED',
      // 003 起「再来一单」仅对已评价的已完成订单展示（待评价订单展示「去评价」）
      reviewed: true,
      storeId: 'm002',
      items: [{ productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 2, subtotal: 39 }],
    })
    const { wrapper, router } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-reorder-entry"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="order-reorder-entry"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('store-detail'), {
      timeout: 2000,
    })
    expect(router.currentRoute.value.params.storeId).toBe('m002')
    const lines = getMockCartSnapshot('m002')
    expect(lines).toHaveLength(1)
    expect(lines[0]!.quantity).toBe(2)
  })

  it('TQ-3 再来一单遇到不可购商品：能加尽加并按商品名汇总提示', async () => {
    clearMockCart('m002')
    orderMockState.splice(0, orderMockState.length, {
      ...ORDER_SEED[0]!,
      orderId: 'op34',
      status: 'COMPLETED',
      // 003 起「再来一单」仅对已评价的已完成订单展示（待评价订单展示「去评价」）
      reviewed: true,
      storeId: 'm002',
      items: [
        { productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 1, subtotal: 19.5 },
        { productId: 'p999', name: '已下架商品', unitPrice: 9, quantity: 1, subtotal: 9 },
      ],
    })
    const { wrapper, router } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-reorder-entry"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="order-reorder-entry"]').trigger('click')
    await vi.waitFor(() => expect(messages.join('|')).toContain('已下架商品'), { timeout: 2000 })
    expect(messages.join('|')).toContain('1 件')
    expect(getMockCartSnapshot('m002')).toHaveLength(1)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('store-detail'), {
      timeout: 2000,
    })
  })

  it('TV-8 已完成未评价显示「待评价」并提供「去评价」；已评价显示「已完成」无入口（批次⑩ 003）', async () => {
    orderMockState.splice(
      0,
      orderMockState.length,
      {
        ...ORDER_SEED[0]!,
        orderId: 'or11',
        status: 'COMPLETED',
        reviewed: false,
        storeId: 'm002',
        createdAt: '2026-09-11 12:00:00',
      },
      {
        ...ORDER_SEED[0]!,
        orderId: 'or12',
        status: 'COMPLETED',
        reviewed: true,
        storeId: 'm002',
        createdAt: '2026-09-11 11:00:00',
      },
    )
    const { wrapper, router } = await mountList()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="order-card"]').length).toBe(2),
      { timeout: 2000 },
    )
    const cards = wrapper.findAll('[data-testid="order-card"]')
    expect(cards[0]!.text()).toContain('待评价')
    expect(cards[1]!.text()).toContain('已完成')
    const entries = wrapper.findAll('[data-testid="order-review-entry"]')
    expect(entries).toHaveLength(1)
    await entries[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('order-review')
  })
})
