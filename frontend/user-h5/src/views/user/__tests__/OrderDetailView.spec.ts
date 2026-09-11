import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import OrderDetailView from '../OrderDetailView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { ORDER_SEED, orderMockState } from '@/mocks/order'
import { clearMockCart, getMockCartSnapshot } from '@/mocks/cart'
import type { OrderRecord } from '@/services/api/types'

/**
 * 订单详情页 P0 行为测试 T43–T44（2026-09-07 第二批，口径来自 PRD 7.6 + 7.16 订单详情页两行，AI 辅助脚手架）
 * T43 详情渲染：订单编号/状态/下单时间/收货信息快照/商品明细快照/金额明细三件套（TC-ORD-016/022）
 *    商品显示下单快照，不跟随当前商品改价（PRD 订单详情内容行）
 * T44 订单不存在 → 提示并返回订单列表（PRD 顶部栏行：编号缺失或订单不存在返回列表并提示）
 * 口径：P0 状态仅 PROCESSING → 文案"进行中"（B4 映射）；金额只展示后端结果
 */

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
      { path: '/orders/:orderId/pay', name: 'order-pay', component: { template: '<div />' } },
      { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
    ],
  })
  await router.push(`/orders/${orderId}`)
  await router.isReady()
  const wrapper = mount(OrderDetailView, { global: { plugins: [p, router] } })
  return { wrapper, router }
}

describe('OrderDetailView（订单详情页 P0）', () => {
  beforeEach(() => {
    orderMockState.splice(0, orderMockState.length, ...ORDER_SEED.map((item) => ({ ...item })))
  })

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

/**
 * 批次⑩ OD 组（TODO-USER-104，2026-09-11；CHG-003 订单跟踪页并入订单详情 + CHG-004 金额明细口径）
 * 口径出处：PRD 7.6 时间线映射表 / 7.16.1 订单详情页四行、契约 §3.5、TC-ORD-022、设计真源
 * `docs/design/exports/用户端/12-订单与支付/01-订单详情-含订单跟踪/`。
 * 测试场景由负责人确认（ETA 本地推算 / 占位按钮 toast / 取消弹层归 TODO-USER-002）后 AI 落地。
 * 时间线 data-state 取值：done（已达成）/ current（当前节点）/ todo（未达）。
 */
const OD_ADDRESS: OrderRecord['address'] = {
  addressId: 'da001',
  contactName: '张同学',
  contactSex: '男',
  contactPhone: '13800000001',
  region: '天津大学软件园校区',
  detail: '4号楼 302室',
  label: '学校',
  isDefault: true,
}

const OD_ITEMS: NonNullable<OrderRecord['items']> = [
  { productId: 'p101', name: '香辣鸡腿堡', unitPrice: 19.5, quantity: 1, subtotal: 19.5 },
  { productId: 'p102', name: '薯条(中)', unitPrice: 11.5, quantity: 1, subtotal: 11.5 },
]

function odOrder(overrides: Partial<OrderRecord>): OrderRecord {
  return {
    orderId: 'od00',
    userId: 'u001',
    storeId: 'm002',
    addressId: 'da001',
    remark: '',
    status: 'COOKING',
    createdAt: '2026-09-11 10:00:00',
    itemSubtotal: 39,
    packagingFee: 2,
    deliveryFee: 3,
    total: 44,
    address: OD_ADDRESS,
    items: OD_ITEMS.map((item) => ({ ...item })),
    ...overrides,
  }
}

/** 六状态夹具：五节点时间线各档 + 已取消（金额口径 od02 覆盖 0 配送费与红包优惠、od03 覆盖无优惠） */
const OD_SEED: OrderRecord[] = [
  odOrder({ orderId: 'od01', status: 'PENDING_PAYMENT' }),
  odOrder({
    orderId: 'od02',
    status: 'PENDING',
    paidAt: '2026-09-11 10:05:00',
    deliveryFee: 0,
    couponAmount: 5,
    total: 36,
  }),
  odOrder({ orderId: 'od03', status: 'COOKING', paidAt: '2026-09-11 10:05:00', createdAt: '2026-09-11 12:00:00' }),
  odOrder({ orderId: 'od04', status: 'DELIVERING', paidAt: '2026-09-11 10:05:00' }),
  odOrder({ orderId: 'od05', status: 'COMPLETED', paidAt: '2026-09-11 10:05:00' }),
  odOrder({
    orderId: 'od06',
    status: 'CANCELLED',
    paidAt: null,
    cancelReason: '地址填错了',
    cancelledAt: '2026-09-11 10:10:00',
    cancelledBy: 'USER',
  }),
]

const TIMELINE_LABELS = ['已下单', '已支付', '商家接单', '配送中', '已完成'] as const

function stepStates(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-testid="timeline-step"]').map((step) => step.attributes('data-state'))
}

describe('OrderDetailView 批次⑩（CHG-003 订单详情含跟踪时间线）', () => {
  beforeEach(() => {
    orderMockState.splice(
      0,
      orderMockState.length,
      ...ORDER_SEED.map((item) => ({ ...item })),
      ...OD_SEED.map((item) => ({ ...item })),
    )
  })

  async function mountOd(orderId: string) {
    const ctx = await mountDetail(orderId)
    await vi.waitFor(
      () => expect(ctx.wrapper.find('[data-testid="order-status-head"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    return ctx
  }

  it('OD-1 待支付：状态头「待支付」，时间线当前节点=已下单，其余未达；可支付且取消可用', async () => {
    const { wrapper } = await mountOd('od01')
    expect(wrapper.find('[data-testid="order-status-head"]').text()).toContain('待支付')
    expect(wrapper.findAll('[data-testid="timeline-step"]').map((s) => s.text())).toEqual([...TIMELINE_LABELS])
    expect(stepStates(wrapper)).toEqual(['current', 'todo', 'todo', 'todo', 'todo'])
    // 底部操作区：待支付提供「去支付」入口（批次⑩ 105 起改为跳转支付页），取消按钮可用（PRD 7.16.1 底部操作区行）
    expect(wrapper.find('[data-testid="order-pay-entry"]').exists()).toBe(true)
    const cancel = wrapper.find('[data-testid="cancel-order-btn"]')
    expect(cancel.exists()).toBe(true)
    expect(cancel.attributes('aria-disabled')).not.toBe('true')
  })

  it('OD-2 待接单：已下单达成、已支付当前；取消可用且提供联系商家入口', async () => {
    const { wrapper } = await mountOd('od02')
    expect(wrapper.find('[data-testid="order-status-head"]').text()).toContain('待接单')
    expect(stepStates(wrapper)).toEqual(['done', 'current', 'todo', 'todo', 'todo'])
    expect(wrapper.find('[data-testid="cancel-order-btn"]').attributes('aria-disabled')).not.toBe('true')
    expect(wrapper.find('[data-testid="contact-merchant-btn"]').exists()).toBe(true)
  })

  it('OD-3 制作中：商家接单当前；取消按钮置灰且点击提示「商家已接单，无法取消」', async () => {
    const { wrapper } = await mountOd('od03')
    expect(stepStates(wrapper)).toEqual(['done', 'done', 'current', 'todo', 'todo'])
    // 置灰但仍可点击 → 点击给出原因提示（PRD：保留但置灰、点击提示；原生 disabled 会吞点击，故用 aria-disabled）
    const cancel = wrapper.find('[data-testid="cancel-order-btn"]')
    expect(cancel.attributes('aria-disabled')).toBe('true')
    await cancel.trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="cancel-disabled-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="cancel-disabled-tip"]').text()).toContain('商家已接单，无法取消')
  })

  it('OD-4 配送中：配送中为当前节点', async () => {
    const { wrapper } = await mountOd('od04')
    expect(wrapper.find('[data-testid="order-status-head"]').text()).toContain('配送中')
    expect(stepStates(wrapper)).toEqual(['done', 'done', 'done', 'current', 'todo'])
  })

  it('OD-5 已完成：全部节点点亮；提供去评价/再来一单/联系商家操作', async () => {
    const { wrapper } = await mountOd('od05')
    expect(stepStates(wrapper)).toEqual(['done', 'done', 'done', 'done', 'done'])
    expect(wrapper.find('[data-testid="goto-review-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reorder-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="contact-merchant-btn"]').exists()).toBe(true)
  })

  it('OD-6 已取消：状态头「已取消」+ 取消原因展示 + 时间线整体置灰 + 无底部操作栏', async () => {
    const { wrapper } = await mountOd('od06')
    expect(wrapper.find('[data-testid="order-status-head"]').text()).toContain('已取消')
    expect(wrapper.find('[data-testid="cancel-reason"]').text()).toContain('地址填错了')
    expect(wrapper.find('[data-testid="order-timeline"]').attributes('data-greyed')).toBe('true')
    // 无可用操作时隐藏操作栏（PRD 7.16.1 底部操作区异常列）
    expect(wrapper.find('[data-testid="order-footer-actions"]').exists()).toBe(false)
  })

  it('OD-7 金额明细（CHG-004）：基础四行恒显示（配送费 0 仍 ¥0.00）+ 优惠非 0 各一行且顺序固定', async () => {
    const { wrapper } = await mountOd('od02')
    const lines = wrapper.findAll('[data-testid="amount-line"]')
    expect(lines.map((line) => line.attributes('data-key'))).toEqual([
      'items-total',
      'packaging',
      'delivery-fee',
      'coupon',
      'payable',
    ])
    expect(lines[0]?.text()).toContain('商品小计')
    expect(lines[0]?.text()).toContain('¥39.00')
    // 配送费为 0 时仍显示 ¥0.00（基础四行恒显示）
    expect(lines[2]?.text()).toContain('配送费')
    expect(lines[2]?.text()).toContain('¥0.00')
    // 优惠行以品牌橙负数展示（kind=discount 供样式挂钩）
    expect(lines[3]?.text()).toContain('红包优惠')
    expect(lines[3]?.text()).toContain('−¥5.00')
    expect(lines[3]?.attributes('data-kind')).toBe('discount')
    expect(lines[4]?.text()).toContain('实付金额')
    expect(lines[4]?.text()).toContain('¥36.00')

    // 无优惠订单：仅基础四行，不渲染满减/红包行（未发生不显示）
    const { wrapper: plain } = await mountOd('od03')
    const plainLines = plain.findAll('[data-testid="amount-line"]')
    expect(plainLines.map((line) => line.attributes('data-key'))).toEqual([
      'items-total',
      'packaging',
      'delivery-fee',
      'payable',
    ])
    const plainText = plain.find('[data-testid="order-detail"]').text()
    expect(plainText).not.toContain('满减优惠')
    expect(plainText).not.toContain('红包优惠')
  })

  it('OD-8 课程口径替换：不出现「查看配送进度/蜂鸟专送/微信支付」，支付方式=模拟支付、配送服务=课程占位', async () => {
    const { wrapper } = await mountOd('od03')
    const text = wrapper.find('[data-testid="order-detail"]').text()
    expect(text).not.toContain('查看配送进度')
    expect(text).not.toContain('蜂鸟专送')
    expect(text).not.toContain('微信支付')
    expect(text).toContain('模拟支付')
    expect(text).toContain('课程演示配送')
  })

  it('OD-9 预计送达：按 createdAt+40 分钟本地推算（课程演示口径，契约无 ETA 字段）', async () => {
    const { wrapper } = await mountOd('od03')
    const head = wrapper.find('[data-testid="order-status-head"]').text()
    expect(head).toContain('预计')
    expect(head).toContain('12:40')
    expect(head).toContain('送达')
  })

  it('OD-10 订单信息卡：订单号+复制提示+下单时间（yyyy-MM-dd HH:mm:ss）', async () => {
    const { wrapper } = await mountOd('od03')
    const text = wrapper.find('[data-testid="order-detail"]').text()
    expect(text).toContain('od03')
    expect(text).toContain('2026-09-11 12:00:00')
    await wrapper.find('[data-testid="copy-order-btn"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="copy-order-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="copy-order-tip"]').text()).toContain('已复制')
  })

  it('OD-11 商家区：店名可进商家详情；商品按快照展示并汇总件数', async () => {
    const { wrapper, router } = await mountOd('od03')
    expect(wrapper.find('[data-testid="store-entry"]').exists()).toBe(true)
    await wrapper.find('[data-testid="store-entry"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('store-detail')
    const text = wrapper.find('[data-testid="order-detail"]').text()
    expect(text).toContain('香辣鸡腿堡')
    expect(text).toContain('薯条(中)')
    expect(text).toContain('共 2 件商品')
  })

  it('TP-10 可用态点「取消订单」打开弹层，提交成功后详情刷新为已取消并展示原因（TODO-USER-002）', async () => {
    const { wrapper } = await mountOd('od01')
    const cancel = wrapper.find('[data-testid="cancel-order-btn"]')
    expect(cancel.attributes('aria-disabled')).toBe('false')
    await cancel.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="cancel-sheet"]').exists()).toBe(true), {
      timeout: 2000,
    })
    await wrapper.findAll('[data-testid="reason-chip"]')[0]!.trigger('click')
    await wrapper.find('[data-testid="cancel-confirm-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-status-head"]').text()).toContain('已取消'),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="cancel-reason"]').text()).toContain('不想要了')
  })

  it('TQ-4 已完成订单点「再来一单」重建购物车并跳商家详情页（批次⑩ 008）', async () => {
    clearMockCart('m002')
    const { wrapper, router } = await mountOd('od05')
    await wrapper.find('[data-testid="reorder-btn"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('store-detail'), {
      timeout: 2000,
    })
    expect(router.currentRoute.value.params.storeId).toBe('m002')
    expect(getMockCartSnapshot('m002')).toHaveLength(2)
  })

  it('TD-10 待支付订单点「去支付」进入支付页（批次⑩ 105 入口接线）', async () => {
    const { wrapper, router } = await mountOd('od01')
    await wrapper.find('[data-testid="order-pay-entry"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('order-pay')
    expect(router.currentRoute.value.params.orderId).toBe('od01')
  })
})
