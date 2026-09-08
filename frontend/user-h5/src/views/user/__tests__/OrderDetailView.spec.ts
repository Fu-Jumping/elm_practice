import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import OrderDetailView from '../OrderDetailView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'

/**
 * 订单详情页 P0 行为测试 T43–T44（2026-09-07 第二批，口径来自 PRD 7.6 + 7.16 订单详情页两行，AI 辅助脚手架）
 * T43 详情渲染：订单编号/状态/下单时间/收货信息快照/商品明细快照/金额明细三件套（TC-ORD-016/022）
 *    商品显示下单快照，不跟随当前商品改价（PRD 订单详情内容行）
 * T44 订单不存在 → 提示并返回订单列表（PRD 顶部栏行：编号缺失或订单不存在返回列表并提示）
 * 口径：P0 状态仅 PROCESSING → 文案"进行中"（B4 映射）；金额只展示后端结果
 */
describe('OrderDetailView（订单详情页 P0）', () => {
  beforeEach(() => {
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
  })

  function bootstrapPinia() {
    const pinia = createPinia()
    setActivePinia(pinia)
    return pinia
  }

  async function mountDetail(orderId: string, pinia?: ReturnType<typeof createPinia>) {
    const p = pinia ?? bootstrapPinia()
    setActivePinia(p)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/orders', name: 'orders', component: { template: '<div />' } },
        { path: '/orders/:orderId', name: 'order-detail', component: OrderDetailView },
      ],
    })
    await router.push(`/orders/${orderId}`)
    await router.isReady()
    const wrapper = mount(OrderDetailView, { global: { plugins: [p, router] } })
    return { wrapper, router }
  }

  it('T43 详情渲染编号/状态/时间/收货信息/商品快照/金额三件套，返回回列表', async () => {
    const { wrapper, router } = await mountDetail('o0002')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-detail"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const detail = wrapper.find('[data-testid="order-detail"]')
    expect(detail.text()).toContain('o0002')
    expect(detail.text()).toContain('进行中')
    expect(detail.text()).toContain('2026-09-07 11:30:00')
    // 收货信息来自地址快照
    expect(detail.text()).toContain('张同学')
    expect(detail.text()).toContain('13800000001')
    expect(detail.text()).toContain('12号楼 304室')
    // 商品明细快照（名称/单价/数量）
    expect(detail.text()).toContain('巨无霸')
    expect(detail.text()).toContain('25.50')
    // 金额明细三件套：小计 25.50 + 打包费 2.00 = 实付 27.50（TC-ORD-022）
    expect(detail.text()).toContain('2.00')
    expect(detail.text()).toContain('27.50')
    // 顶部返回 → 订单列表
    await wrapper.find('[data-testid="back-btn"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('orders')
  })

  it('T44 订单不存在 → 提示并返回订单列表（TC-ORD-015 前端侧）', async () => {
    const { wrapper, router } = await mountDetail('o9999')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-missing-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="order-missing-tip"]').text()).toContain('订单不存在')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), {
      timeout: 2000,
    })
  })
})
