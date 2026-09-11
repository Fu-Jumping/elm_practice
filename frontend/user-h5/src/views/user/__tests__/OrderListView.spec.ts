import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import OrderListView from '../OrderListView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'

/**
 * 订单列表页 P0 行为测试 T40–T42（2026-09-07 第二批，口径来自 PRD 7.6 + 7.16 订单列表页三行，AI 辅助脚手架）
 * T40 订单卡渲染：店铺、状态文案、实付金额两位小数、下单时间（金额/状态/时间使用接口值）
 * T41 空态：无订单提示（PRD：空结果显示对应空态）
 * T42 点击卡片进入订单详情
 * 口径：P0 仅"全部"筛选；订单按创建时间倒序（TC-ORD-013）
 */
describe('OrderListView（订单列表页 P0）', () => {
  beforeEach(() => {
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
  })

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
})
