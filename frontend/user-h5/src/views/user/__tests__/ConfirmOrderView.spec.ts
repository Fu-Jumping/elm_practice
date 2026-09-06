import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmOrderView from '../ConfirmOrderView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useCartStore } from '@/stores/cartStore'
import { onToast } from '@/utils/toast'
import { ADDRESS_SEED, addressMockState } from '@/mocks/address'

/**
 * 确认订单页 P0 行为测试 T26–T30（2026-09-07，用例口径来自 TDD 规划矩阵 + PRD 7.4/7.16，AI 辅助脚手架）
 * 依据：PRD 7.4 确认订单与优惠计算、PRD 7.16 确认订单页三行、契约 §3.3/§3.5、TC-ADR-006、TC-ORD-011
 * T26 页面渲染：默认地址卡 + 购物车商品行 + 实付金额行（含打包费，不单列打包费行）+ 去支付可用
 * T27 未登录进入 → 跳登录带 redirect（PRD：未登录转登录）
 * T28 无地址 → 去支付禁用 + 引导提示（PRD：地址不存在时引导新增）
 * T29 填备注提交成功 → 只走一次创建订单 → 该店购物车清空 + 跳订单列表 + 成功提示
 * T30 storeId 缺失 → 返回商家列表（PRD：参数缺失返回列表）
 * 口径：实付金额展示含打包费（39.00 + 2.00 = 41.00）；金额以后端为准，前端合计仅 expectedTotal 提示
 */
describe('ConfirmOrderView（确认订单页 P0）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    // 地址 mock 为模块级内存态：每条用例重灌种子，隔离 T28 的清空操作
    addressMockState.splice(0, addressMockState.length, ...ADDRESS_SEED.map((item) => ({ ...item })))
  })

  afterEach(() => {
    offToast?.()
  })

  async function mountConfirm(query: Record<string, string> = { storeId: 'm002' }) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/orders', name: 'orders', component: { template: '<div />' } },
        { path: '/orders/confirm', name: 'order-confirm', component: ConfirmOrderView },
      ],
    })
    await router.push({ path: '/orders/confirm', query })
    await router.isReady()
    const wrapper = mount(ConfirmOrderView, { global: { plugins: [pinia, router] } })
    return { wrapper, router }
  }

  /** 已登录 + 向 m002 购物车加购 p101 ×2（走真实 mock 链路，合计 39.00） */
  async function loginAndFillCart() {
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const cart = useCartStore()
    await cart.addItem('m002', 'p101', 2)
    await vi.waitFor(() => expect(cart.lines).toHaveLength(1), { timeout: 2000 })
    return { session, cart }
  }

  it('T26 渲染默认地址卡、商品行与实付金额（含打包费，不单列打包费行）', async () => {
    await loginAndFillCart()
    const { wrapper } = await mountConfirm()
    // 地址卡：来自地址接口并默认选中默认地址（契约 §3.3 + 固定演示数据）
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-card"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const addressCard = wrapper.find('[data-testid="address-card"]')
    expect(addressCard.text()).toContain('张同学')
    expect(addressCard.text()).toContain('13800000001')
    expect(addressCard.text()).toContain('天津大学北洋园校区')
    expect(addressCard.text()).toContain('12号楼 304室')
    // 商品行：来自购物车接口（名称/数量/单价，金额两位小数）
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-items"]').text()).toContain('香辣鸡腿堡'),
      { timeout: 2000 },
    )
    const items = wrapper.find('[data-testid="order-items"]')
    expect(items.text()).toContain('19.50')
    expect(items.text()).toContain('2')
    // 实付金额：39.00 + 2.00 打包费 = 41.00；不出现"打包费"独立行（PRD 7.4 评审决议）
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="payable-amount"]').text()).toContain('41.00'),
      { timeout: 2000 },
    )
    expect(wrapper.text()).not.toContain('打包费')
    // 检查通过 → 去支付可用
    expect(wrapper.find('[data-testid="submit-order-btn"]').attributes('disabled')).toBeUndefined()
  })

  it('T27 未登录进入 → 跳登录并带 redirect（PRD：未登录转登录）', async () => {
    const { router } = await mountConfirm()
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 2000 })
    expect(String(router.currentRoute.value.query.redirect)).toContain('/orders/confirm')
  })

  it('T28 无地址 → 去支付禁用并提示先添加收货地址（PRD：地址不存在时引导新增）', async () => {
    await loginAndFillCart()
    addressMockState.splice(0, addressMockState.length)
    const { wrapper } = await mountConfirm()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-missing-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="address-missing-tip"]').text()).toContain('请先添加收货地址')
    expect(wrapper.find('[data-testid="submit-order-btn"]').attributes('disabled')).toBeDefined()
  })

  it('T29 填备注提交成功 → 购物车清空 + 跳订单列表 + 成功提示', async () => {
    const { cart } = await loginAndFillCart()
    const { wrapper, router } = await mountConfirm()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="remark-input"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="remark-input"]').setValue('少放辣')
    await wrapper.find('[data-testid="submit-order-btn"]').trigger('click')
    // 成功后：该店购物车清空（PRD：成功前不得清空，成功后由明确前端流程清空）
    await vi.waitFor(() => expect(cart.lines).toHaveLength(0), { timeout: 2000 })
    expect(router.currentRoute.value.name).toBe('orders')
    expect(messages).toContain('下单成功')
  })

  it('T30 storeId 缺失 → 返回商家列表（PRD：参数缺失返回列表）', async () => {
    await loginAndFillCart()
    const { router } = await mountConfirm({})
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })
})
