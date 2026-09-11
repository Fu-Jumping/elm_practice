import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import PaySuccessView from '../PaySuccessView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'
import type { OrderRecord } from '@/services/api/types'

/**
 * 支付成功页行为测试 TB 组（TODO-USER-105b，2026-09-11）
 * 口径出处：PRD 7.5 / 7.16.1 支付成功页四行（成功横幅、订单摘要卡、会员提示、底部操作）、
 * 设计真源 `docs/design/exports/用户端/07-支付/03-支付成功/`。
 * 课程口径替换（PRD 明示）：支付方式显示「模拟支付」（设计稿「支付宝」不实现）；
 * 会员提示用固定课程文案（设计稿「获得 10 积分/查看积分」不实现——**本期不建积分体系、不展示积分余额或兑换入口**）。
 * 测试场景由负责人确认后由 AI 落地；本组在 feat: 实现前必须红。
 */

function paidOrder(overrides: Partial<OrderRecord>): OrderRecord {
  return {
    orderId: 'op11',
    userId: 'u001',
    storeId: 'm002',
    addressId: 'da001',
    remark: '',
    status: 'PENDING',
    createdAt: '2026-09-11 12:00:00',
    paidAt: '2026-09-11 12:03:05',
    itemSubtotal: 40.4,
    packagingFee: 2,
    deliveryFee: 3.5,
    fullReductionAmount: 5,
    couponAmount: 2,
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

async function mountSuccess(orderId: string) {
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
      { path: '/orders/:orderId/pay-success', name: 'pay-success', component: PaySuccessView },
    ],
  })
  await router.push(`/orders/${orderId}/pay-success`)
  await router.isReady()
  const wrapper = mount(PaySuccessView, { global: { plugins: [pinia, router] } })
  await vi.waitFor(
    () => expect(wrapper.find('[data-testid="pay-success"]').exists()).toBe(true),
    { timeout: 2000 },
  )
  return { wrapper, router }
}

describe('PaySuccessView 支付成功页（批次⑩ TODO-USER-105b）', () => {
  beforeEach(() => {
    orderMockState.splice(
      0,
      orderMockState.length,
      ...ORDER_SEED.map((item) => ({ ...item })),
      paidOrder({}),
      paidOrder({ orderId: 'op12', status: 'PENDING_PAYMENT', paidAt: null }),
      paidOrder({ orderId: 'op13', itemSubtotal: 0, packagingFee: 0, total: 0, paidAt: null }),
    )
  })

  it('TB-1 成功横幅（金额来自接口）+ 摘要卡（编号/模拟支付/支付时间）+ 底部两个操作', async () => {
    const { wrapper } = await mountSuccess('op11')
    const page = wrapper.find('[data-testid="pay-success"]')
    const text = page.text()
    expect(text).toContain('支付成功')
    expect(text).toContain('38.90')
    const summary = wrapper.find('[data-testid="pay-summary-card"]')
    expect(summary.text()).toContain('op11')
    expect(summary.text()).toContain('模拟支付')
    expect(summary.text()).toContain('2026-09-11 12:03:05')
    expect(wrapper.find('[data-testid="goto-order-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="goto-home-btn"]').exists()).toBe(true)
  })

  it('TB-2 课程口径：不出现积分/兑换与真实支付渠道', async () => {
    const { wrapper } = await mountSuccess('op11')
    const text = wrapper.find('[data-testid="pay-success"]').text()
    expect(text).not.toContain('积分')
    expect(text).not.toContain('兑换')
    expect(text).not.toContain('支付宝')
    expect(text).not.toContain('微信支付')
  })

  it('TB-3 会员提示为固定课程文案且纯展示（无按钮入口）', async () => {
    const { wrapper } = await mountSuccess('op11')
    const tip = wrapper.find('[data-testid="member-tip"]')
    expect(tip.exists()).toBe(true)
    expect(tip.text()).toContain('会员红包已同步')
    expect(tip.text()).toContain('下次下单可使用')
    expect(tip.findAll('button')).toHaveLength(0)
  })

  it('TB-4 查看订单进订单详情；回到首页进首页', async () => {
    const { wrapper, router } = await mountSuccess('op11')
    await wrapper.find('[data-testid="goto-order-btn"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('order-detail')
    expect(router.currentRoute.value.params.orderId).toBe('op11')

    const second = await mountSuccess('op11')
    await second.wrapper.find('[data-testid="goto-home-btn"]').trigger('click')
    await flushPromises()
    expect(second.router.currentRoute.value.name).toBe('home')
  })

  it('TB-5 金额缺失显示「暂无金额」、支付时间缺失显示「暂无时间」', async () => {
    const { wrapper } = await mountSuccess('op13')
    const text = wrapper.find('[data-testid="pay-success"]').text()
    expect(text).toContain('暂无金额')
    expect(text).toContain('暂无时间')
    expect(text).not.toContain('¥0.00')
  })

  it('TB-6 非已支付状态不显示成功（PRD：状态未知显示待确认，不显示成功）', async () => {
    const { wrapper } = await mountSuccess('op12')
    const text = wrapper.find('[data-testid="pay-success"]').text()
    expect(text).toContain('支付结果待确认')
    expect(text).not.toContain('支付成功')
  })
})
