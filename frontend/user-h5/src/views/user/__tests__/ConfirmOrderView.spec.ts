import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmOrderView from '../ConfirmOrderView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { useCartStore } from '@/stores/cartStore'
import { onToast } from '@/utils/toast'
import { ADDRESS_SEED, addressMockState } from '@/mocks/address'
import { clearMockCart } from '@/mocks/cart'

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
    // 地址/购物车 mock 均为模块级内存态：每条用例重灌/清空，隔离跨用例污染
    // （同商品加购会合并数量，不清理会让用例间金额互相累加）
    addressMockState.splice(0, addressMockState.length, ...ADDRESS_SEED.map((item) => ({ ...item })))
    clearMockCart('m002')
  })

  afterEach(() => {
    offToast?.()
  })

  async function mountConfirm(
    query: Record<string, string> = { storeId: 'm002' },
    pinia: ReturnType<typeof createPinia> | undefined = undefined,
  ) {
    const p = pinia ?? createPinia()
    setActivePinia(p)
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
    const wrapper = mount(ConfirmOrderView, { global: { plugins: [p, router] } })
    return { wrapper, router }
  }

  /**
   * 已登录 + 向 m002 购物车加购 p101 ×2（走真实 mock 链路，合计 39.00）
   * 必须在 mountConfirm 之前以同一 pinia 执行（视图 onMounted 即做登录校验），否则会被踢回登录页
   */
  async function loginAndFillCart() {
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const cart = useCartStore()
    await cart.addItem('m002', 'p101', 2)
    await vi.waitFor(() => expect(cart.lines).toHaveLength(1), { timeout: 2000 })
    return { session, cart }
  }

  /** 测试前置：建 pinia 并激活（登录态/购物车与视图共用同一实例） */
  function bootstrapPinia() {
    const pinia = createPinia()
    setActivePinia(pinia)
    return pinia
  }

  it('T26 渲染默认地址卡、商品行与实付金额（含打包费，不单列打包费行）', async () => {
    const pinia = bootstrapPinia()
    await loginAndFillCart()
    const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
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
    const pinia = bootstrapPinia()
    await loginAndFillCart()
    addressMockState.splice(0, addressMockState.length)
    const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-missing-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="address-missing-tip"]').text()).toContain('请先添加收货地址')
    expect(wrapper.find('[data-testid="submit-order-btn"]').attributes('disabled')).toBeDefined()
  })

  it('T29 填备注提交成功 → 购物车清空 + 跳订单列表 + 成功提示', async () => {
    const pinia = bootstrapPinia()
    const { cart } = await loginAndFillCart()
    const { wrapper, router } = await mountConfirm({ storeId: 'm002' }, pinia)
    // 等地址与金额就绪（mock 有 200-500ms 延迟窗口；未就绪时提交按钮禁用，点击会空转）
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-card"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="payable-amount"]').text()).toContain('41.00'),
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
    const pinia = bootstrapPinia()
    await loginAndFillCart()
    const { router } = await mountConfirm({}, pinia)
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })

  // T56-T57 提交前置校验（2026-09-07 第三批，TC-ORD-006/009 前端侧 + PRD 851 行：
  // 购物车为空、商家关闭、最低起送金额不满足时禁止提交并说明原因）
  it('T56 店铺休息 → 提交禁用并说明原因（TC-ORD-006 前端侧）', async () => {
    const pinia = bootstrapPinia()
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const cart = useCartStore()
    // m004 老胖烧烤 CLOSED；加购 2 份羊肉串（56 ≥ 起送 30）隔离起送因素
    await cart.addItem('m004', 'p206', 2)
    await vi.waitFor(() => expect(cart.lines).toHaveLength(1), { timeout: 2000 })
    const { wrapper } = await mountConfirm({ storeId: 'm004' }, pinia)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="submit-block-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="submit-block-tip"]').text()).toContain('休息')
    expect(wrapper.find('[data-testid="submit-order-btn"]').attributes('disabled')).toBeDefined()
  })

  it('T57 起送金额不满足 → 提交禁用并提示差多少（TC-ORD-009 前端侧）', async () => {
    const pinia = bootstrapPinia()
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const cart = useCartStore()
    // m002 起送 20；加购 1 份九珍果汁（9 < 20）
    await cart.addItem('m002', 'p105', 1)
    await vi.waitFor(() => expect(cart.lines).toHaveLength(1), { timeout: 2000 })
    const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="submit-block-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="submit-block-tip"]').text()).toContain('11')
    expect(wrapper.find('[data-testid="submit-order-btn"]').attributes('disabled')).toBeDefined()
  })

  // T59 地址选择回填（2026-09-07 第三批，PRD 873 行：返回确认订单时把选择结果回填，不直接创建订单）
  it('T59 query.addressId 优先于默认地址回填；点地址卡进列表选择模式', async () => {
    const pinia = bootstrapPinia()
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const cart = useCartStore()
    await cart.addItem('m002', 'p101', 2)
    await vi.waitFor(() => expect(cart.lines).toHaveLength(1), { timeout: 2000 })
    // 地址列表追加 da002（非默认），选择模式回传 da002
    addressMockState.push({
      addressId: 'da002',
      contactName: '李同学',
      contactSex: '女',
      contactPhone: '13900000000',
      region: '天津大学北洋园校区',
      detail: '11号楼 502室',
      label: '家',
      isDefault: false,
    })
    const { wrapper, router } = await mountConfirm({ storeId: 'm002', addressId: 'da002' }, pinia)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-card"]').text()).toContain('李同学'),
      { timeout: 2000 },
    )
    // 回填的是所选地址而非默认地址（da001 张同学）
    expect(wrapper.find('[data-testid="address-card"]').text()).toContain('11号楼 502室')
    expect(wrapper.find('[data-testid="address-card"]').text()).not.toContain('12号楼 304室')
    // 点地址卡 → 进入地址列表选择模式（携带 select 与 storeId，不直接创建订单）
    await wrapper.find('[data-testid="address-card"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('address-list')
    expect(router.currentRoute.value.query.select).toBe('1')
    expect(router.currentRoute.value.query.storeId).toBe('m002')
  })
})
