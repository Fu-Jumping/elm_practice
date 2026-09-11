import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import OrderPayView from '../OrderPayView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'
import type { OrderRecord } from '@/services/api/types'

/**
 * 支付页（待支付收银台）行为测试 TD 组（TODO-USER-105，2026-09-11，CHG-003）
 * 口径出处：PRD 7.5 / 7.16.1 支付页三行（顶部栏、支付内容区）、契约 §3.5（payDeadline 与支付接口）、
 * 设计真源 `docs/design/exports/用户端/12-订单与支付/02-支付页/`。
 * 负责人确认口径：应用标题用「轻量外卖」（设计稿的英文 CampusBites 不作真源）；
 * 倒计时归零仅做前端「已失效 + 禁止支付」，不回查后端；取消弹层归 TODO-USER-002（本批占位提示）。
 * 测试场景由负责人确认后由 AI 落地；本组在 feat: 实现前必须红。
 */

const ADDRESS: OrderRecord['address'] = {
  addressId: 'da001',
  contactName: '张同学',
  contactSex: '男',
  contactPhone: '13800000001',
  region: '天津大学软件园校区',
  detail: '4号楼 302室',
  label: '学校',
  isDefault: true,
}

/** 以当前时刻为基准生成 yyyy-MM-dd HH:mm:ss 的 payDeadline（倒计时用例需要相对时间） */
function deadlineFromNow(offsetMs: number): string {
  const date = new Date(Date.now() + offsetMs)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

function payOrder(overrides: Partial<OrderRecord>): OrderRecord {
  return {
    orderId: 'op01',
    userId: 'u001',
    storeId: 'm002',
    addressId: 'da001',
    remark: '',
    status: 'PENDING_PAYMENT',
    createdAt: deadlineFromNow(-60 * 1000),
    itemSubtotal: 40.4,
    packagingFee: 2,
    deliveryFee: 3.5,
    fullReductionAmount: 5,
    couponAmount: 2,
    total: 38.9,
    payDeadline: deadlineFromNow(15 * 60 * 1000),
    address: ADDRESS,
    items: [
      { productId: 'p201', name: '麦辣鸡腿汉堡', unitPrice: 19.9, quantity: 1, subtotal: 19.9 },
      { productId: 'p202', name: '香脆薯条 (中)', unitPrice: 11.5, quantity: 1, subtotal: 11.5 },
      { productId: 'p203', name: '冰可口可乐 (大)', unitPrice: 9, quantity: 1, subtotal: 9 },
    ],
    ...overrides,
  }
}

async function mountPay(orderId: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/orders', name: 'orders', component: { template: '<div />' } },
      { path: '/orders/:orderId', name: 'order-detail', component: { template: '<div />' } },
      { path: '/orders/:orderId/pay', name: 'order-pay', component: OrderPayView },
      { path: '/orders/:orderId/pay-success', name: 'pay-success', component: { template: '<div />' } },
      { path: '/orders/:orderId/pay-fail', name: 'pay-fail', component: { template: '<div />' } },
    ],
  })
  await router.push(`/orders/${orderId}/pay`)
  await router.isReady()
  const wrapper = mount(OrderPayView, { global: { plugins: [pinia, router] } })
  await vi.waitFor(() => expect(wrapper.find('[data-testid="order-pay"]').exists()).toBe(true), {
    timeout: 2000,
  })
  return { wrapper, router }
}

describe('OrderPayView 支付页（批次⑩ TODO-USER-105）', () => {
  beforeEach(() => {
    orderMockState.splice(
      0,
      orderMockState.length,
      ...ORDER_SEED.map((item) => ({ ...item })),
      payOrder({}),
      payOrder({ orderId: 'op02', payDeadline: deadlineFromNow(-60 * 1000) }),
      payOrder({ orderId: 'op03', payDeadline: null }),
    )
  })

  it('TD-1 七区块渲染：顶部应用标题 + 倒计时卡 + 商品清单 + 金额明细 + 信息区 + 立即支付', async () => {
    const { wrapper } = await mountPay('op01')
    const page = wrapper.find('[data-testid="order-pay"]')
    const text = page.text()
    // 顶部栏：应用标题（负责人口径「轻量外卖」，不用设计稿的英文名）
    expect(text).toContain('轻量外卖')
    expect(wrapper.find('[data-testid="back-btn"]').exists()).toBe(true)
    // 倒计时卡：仅「支付剩余时间」+ mm:ss 大字
    const card = wrapper.find('[data-testid="pay-countdown-card"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('支付剩余时间')
    expect(wrapper.find('[data-testid="pay-countdown"]').text()).toMatch(/^\d{2}:\d{2}$/)
    // 商品清单（名称 + 数量 + 单价）
    expect(wrapper.findAll('[data-testid="pay-item"]')).toHaveLength(3)
    expect(text).toContain('麦辣鸡腿汉堡')
    expect(text).toContain('x1')
    expect(text).toContain('19.90')
    // 金额明细：CHG-004 基础四行 + 优惠项按实际发生（复用 normalizers 口径）
    const lines = wrapper.findAll('[data-testid="amount-line"]')
    expect(lines.map((line) => line.attributes('data-key'))).toEqual([
      'items-total',
      'packaging',
      'delivery-fee',
      'full-reduction',
      'coupon',
      'payable',
    ])
    // 信息区：商家 / 订单编号（含复制）/ 下单时间 / 收货地址
    const info = wrapper.find('[data-testid="pay-info"]')
    expect(info.text()).toContain('商家')
    expect(info.text()).toContain('订单编号')
    expect(info.text()).toContain('op01')
    expect(info.text()).toContain('下单时间')
    expect(info.text()).toContain('收货地址')
    expect(info.text()).toContain('4号楼 302室')
    expect(wrapper.find('[data-testid="copy-order-btn"]').exists()).toBe(true)
    // 底部固定「立即支付 ¥实付金额」
    const submit = wrapper.find('[data-testid="pay-order"]')
    expect(submit.exists()).toBe(true)
    expect(submit.text()).toContain('立即支付')
    expect(submit.text()).toContain('38.90')
  })

  it('TD-2 倒计时未到期可支付；到期显示「已失效」并禁用支付（边界）', async () => {
    const { wrapper } = await mountPay('op01')
    expect(wrapper.find('[data-testid="pay-order"]').attributes('disabled')).toBeUndefined()

    const { wrapper: expired } = await mountPay('op02')
    expect(expired.find('[data-testid="order-pay"]').text()).toContain('已失效')
    expect(expired.find('[data-testid="pay-order"]').attributes('disabled')).toBeDefined()
  })

  it('TD-3 payDeadline 缺失（后端未返回）→ 支付禁用但不显示「已失效」', async () => {
    const { wrapper } = await mountPay('op03')
    const text = wrapper.find('[data-testid="order-pay"]').text()
    expect(text).toContain('支付剩余时间')
    expect(text).not.toContain('已失效')
    expect(wrapper.find('[data-testid="pay-order"]').attributes('disabled')).toBeDefined()
  })

  it('TD-4 点「立即支付」模拟成功 → 进入支付成功页（订单转待接单）', async () => {
    const { wrapper, router } = await mountPay('op01')
    await wrapper.find('[data-testid="pay-order"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('pay-success'), {
      timeout: 2000,
    })
    expect(orderMockState.find((order) => order.orderId === 'op01')?.status).toBe('PENDING')
  })

  it('TD-5 模拟支付失败 → 进入支付失败页（订单仍待支付）', async () => {
    const { wrapper, router } = await mountPay('op01')
    await wrapper.find('[data-testid="pay-fail-demo"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('pay-fail'), {
      timeout: 2000,
    })
    expect(orderMockState.find((order) => order.orderId === 'op01')?.status).toBe('PENDING_PAYMENT')
  })

  it('TD-6 卡内「取消订单」文字入口给出占位提示（弹层归 TODO-USER-002）', async () => {
    const { wrapper } = await mountPay('op01')
    const entry = wrapper.find('[data-testid="pay-cancel-entry"]')
    expect(entry.exists()).toBe(true)
    await entry.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="pay-cancel-tip"]').exists()).toBe(true), {
      timeout: 2000,
    })
    expect(wrapper.find('[data-testid="pay-cancel-tip"]').text()).toContain('批次②')
  })

  it('TD-7 课程口径：不出现真实支付方式/退款/资金/客服文案，不提供联系客服入口', async () => {
    const { wrapper } = await mountPay('op01')
    const text = wrapper.find('[data-testid="order-pay"]').text()
    expect(text).not.toContain('支付宝')
    expect(text).not.toContain('微信支付')
    expect(text).not.toContain('退款')
    expect(text).not.toContain('联系客服')
  })

  it('TD-8 订单编号复制给出提示', async () => {
    const { wrapper } = await mountPay('op01')
    await wrapper.find('[data-testid="copy-order-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="copy-order-tip"]').exists()).toBe(true)
  })
})
