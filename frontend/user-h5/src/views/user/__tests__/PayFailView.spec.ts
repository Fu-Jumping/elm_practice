import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import PayFailView from '../PayFailView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'
import type { OrderRecord } from '@/services/api/types'

/**
 * 支付失败页行为测试 TB 组（TODO-USER-105b，2026-09-11）
 * 口径出处：PRD 7.5 / 7.16.1 支付失败页两行（顶部栏、失败内容区）、
 * 设计真源 `docs/design/exports/用户端/07-支付/04-支付失败/`。
 * 课程口径替换（PRD 明示）：**本期不提供联系客服入口**（设计稿「联系客服」不实现），
 * 次按钮位按 PRD 7.5「提供重试支付与返回订单列表」改为「返回订单列表」。
 * 「重新支付」先查订单当前状态：仍待支付 → 回支付页；已成功 → 进成功结果（PRD 失败内容区行）。
 * 测试场景由负责人确认后由 AI 落地；本组在 feat: 实现前必须红。
 */

function failOrder(overrides: Partial<OrderRecord>): OrderRecord {
  return {
    orderId: 'op21',
    userId: 'u001',
    storeId: 'm002',
    addressId: 'da001',
    remark: '',
    status: 'PENDING_PAYMENT',
    createdAt: '2026-09-11 12:00:00',
    payDeadline: '2026-09-11 12:15:00',
    itemSubtotal: 40.4,
    packagingFee: 2,
    deliveryFee: 3.5,
    total: 38.9,
    address: {
      addressId: 'da001',
      contactName: '张同学',
      contactSex: '男',
      contactPhone: '13800000001',
      region: '天津大学软件园校区',
      detail: '4号楼 302室',
      label: '学校',
      isDefault: true,
    },
    items: [{ productId: 'p201', name: '麦辣鸡腿汉堡', unitPrice: 19.9, quantity: 1, subtotal: 19.9 }],
    ...overrides,
  }
}

async function mountFail(orderId: string, reason?: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/orders', name: 'orders', component: { template: '<div />' } },
      { path: '/orders/:orderId', name: 'order-detail', component: { template: '<div />' } },
      { path: '/orders/:orderId/pay', name: 'order-pay', component: { template: '<div />' } },
      { path: '/orders/:orderId/pay-success', name: 'pay-success', component: { template: '<div />' } },
      { path: '/orders/:orderId/pay-fail', name: 'pay-fail', component: PayFailView },
    ],
  })
  await router.push({ name: 'pay-fail', params: { orderId }, query: reason ? { reason } : undefined })
  await router.isReady()
  const wrapper = mount(PayFailView, { global: { plugins: [pinia, router] } })
  await vi.waitFor(
    () => expect(wrapper.find('[data-testid="pay-fail"]').exists()).toBe(true),
    { timeout: 2000 },
  )
  return { wrapper, router }
}

describe('PayFailView 支付失败页（批次⑩ TODO-USER-105b）', () => {
  beforeEach(() => {
    orderMockState.splice(
      0,
      orderMockState.length,
      ...ORDER_SEED.map((item) => ({ ...item })),
      failOrder({}),
      failOrder({ orderId: 'op22', status: 'PENDING', paidAt: '2026-09-11 12:03:05' }),
    )
  })

  it('TB-7 失败页渲染：顶部栏 + 失败原因 + 待支付金额与订单号 + 重新支付；无客服入口', async () => {
    const { wrapper } = await mountFail('op21', '余额不足')
    const page = wrapper.find('[data-testid="pay-fail"]')
    const text = page.text()
    expect(text).toContain('支付失败')
    expect(text).toContain('余额不足')
    const card = wrapper.find('[data-testid="fail-order-card"]')
    expect(card.text()).toContain('待支付金额')
    expect(card.text()).toContain('38.90')
    expect(card.text()).toContain('op21')
    expect(wrapper.find('[data-testid="retry-pay-btn"]').exists()).toBe(true)
    expect(text).not.toContain('联系客服')
    expect(text).not.toContain('退款')
  })

  it('TB-8 失败原因缺失 → 显示通用提示', async () => {
    const { wrapper } = await mountFail('op21')
    expect(wrapper.find('[data-testid="pay-fail"]').text()).toContain('支付超时或余额不足，请尝试重新支付')
  })

  it('TB-9 重新支付：订单仍待支付 → 回支付页', async () => {
    const { wrapper, router } = await mountFail('op21')
    await wrapper.find('[data-testid="retry-pay-btn"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('order-pay'), { timeout: 2000 })
    expect(router.currentRoute.value.params.orderId).toBe('op21')
  })

  it('TB-10 重新支付：订单已支付成功 → 进入成功结果（不再显示失败页）', async () => {
    const { wrapper, router } = await mountFail('op22')
    await wrapper.find('[data-testid="retry-pay-btn"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('pay-success'), { timeout: 2000 })
  })

  it('TB-11 返回订单列表', async () => {
    const { wrapper, router } = await mountFail('op21')
    await wrapper.find('[data-testid="back-to-orders-btn"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('orders')
  })
})
