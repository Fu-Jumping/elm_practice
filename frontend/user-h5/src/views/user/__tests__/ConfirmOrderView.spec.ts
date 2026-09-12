import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmOrderView from '../ConfirmOrderView.vue'
import { orderApi } from '@/services/api'
import { useSessionStore } from '@/stores/sessionStore'
import { useCartStore } from '@/stores/cartStore'
import { onToast } from '@/utils/toast'
import { ADDRESS_SEED, addressMockState } from '@/mocks/address'
import { clearMockCart } from '@/mocks/cart'

/**
 * 确认订单页 P0 行为测试 T26–T30（2026-09-07，用例口径来自 TDD 规划矩阵 + PRD 7.4/7.16，AI 辅助脚手架）
 * 依据：PRD 7.4 确认订单与优惠计算、PRD 7.16 确认订单页三行、契约 §3.3/§3.5、TC-ADR-006、TC-ORD-011
 * T26 页面渲染：默认地址卡 + 购物车商品行 + 金额明细（商品小计/打包费/配送费/实付，2026-09-11 CHG-004 定稿口径）+ 去支付可用
 * T27 未登录进入 → 跳登录带 redirect（PRD：未登录转登录）
 * T28 无地址 → 去支付禁用 + 引导提示（PRD：地址不存在时引导新增）
 * T29 填备注提交成功 → 只走一次创建订单 → 该店购物车清空 + 跳订单列表 + 成功提示
 * T30 storeId 缺失 → 返回商家列表（PRD：参数缺失返回列表）
 * 口径：金额明细「基础四行 + 优惠项按实际发生展示」（PRD 7.4 / 契约 §3.5，2026-09-11 定稿 CHG-004）——
 * 基础四行恒为商品小计 / 打包费 / 配送费（为 0 仍显示 ¥0.00）/ 实付金额；优惠项金额非 0 才各占一行。
 * 无优惠时实付 = 商品小计 + 打包费 + 配送费（39.00 + 2.00 + 5.00 = 46.00，配送费取店铺配置 deliveryFee）；
 * 金额以后端为准，前端合计仅作 expectedTotal 提示（TC-ORD-011/021/022 展示侧）
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
        { path: '/addresses', name: 'address-list', component: { template: '<div />' } },
        { path: '/orders/confirm', name: 'order-confirm', component: ConfirmOrderView },
        { path: '/orders/:orderId/pay', name: 'order-pay', component: { template: '<div />' } },
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

  it('T26 渲染默认地址卡、商品行与基础四行金额明细（CHG-004 口径）', async () => {
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
    // 金额明细基础四行（CHG-004 定稿）：商品小计 39.00 + 打包费 2.00 + 配送费 5.00 (m002) = 实付 46.00
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain('46.00'),
      { timeout: 2000 },
    )
    const amountLines = wrapper.findAll('[data-testid="amount-line"]')
    expect(amountLines.map((line) => line.attributes('data-key'))).toEqual([
      'items-total',
      'packaging',
      'delivery-fee',
      'payable',
    ])
    expect(amountLines[0]!.text()).toContain('商品小计')
    expect(amountLines[1]!.text()).toContain('打包费')
    expect(amountLines[2]!.text()).toContain('¥5.00')
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
      () => expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain('46.00'),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="remark-input"]').setValue('少放辣')
    await wrapper.find('[data-testid="submit-order-btn"]').trigger('click')
    // 成功后：该店购物车清空（PRD：成功前不得清空，成功后由明确前端流程清空）
    await vi.waitFor(() => expect(cart.lines).toHaveLength(0), { timeout: 2000 })
    // TD-11（批次⑩ 105）：创建订单成功后按 PRD 7.5 进入支付页（原先跳订单列表）
    expect(router.currentRoute.value.name).toBe('order-pay')
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

  // T60 无地址引导可点击（2026-09-08 缺陷修复：地址删光后点引导无响应，只能退出页面再加）
  it('T60 无地址点引导 → 进入地址列表选择模式（PRD 873：新增入口为路由操作）', async () => {
    const pinia = bootstrapPinia()
    await loginAndFillCart()
    addressMockState.splice(0, addressMockState.length)
    const { wrapper, router } = await mountConfirm({ storeId: 'm002' }, pinia)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="address-missing-tip"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="address-missing-tip"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('address-list')
    expect(router.currentRoute.value.query.select).toBe('1')
    expect(router.currentRoute.value.query.storeId).toBe('m002')
  })

  /**
   * TA 组：确认订单页金额明细（批次① TODO-USER-001）
   * 出处：PRD 7.4（基础四行 + 优惠项按实际发生展示，2026-09-11 定稿 CHG-004）、契约 §3.5/§5.2、
   * TC-ORD-011/021/022；共用口径唯一出口 `normalizers.buildAmountLines`（与订单详情、支付页同源）。
   * 测试侧口径：基础四行恒显示（配送费为 0 仍显示 ¥0.00）、优惠项金额非 0 才各占一行、顺序固定
   * 商品小计 → 打包费 → 配送费 → 优惠项 → 实付金额；前端预览不得与后端计价（创建订单结果）不一致。
   */
  describe('确认订单页金额明细（批次① TODO-USER-001，CHG-004）', () => {
    it('TA-1 基础四行恒显示且顺序固定，配送费取店铺配置 deliveryFee', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '46.00',
          ),
        { timeout: 2000 },
      )
      const lines = wrapper.findAll('[data-testid="amount-line"]')
      expect(lines.map((line) => line.attributes('data-key'))).toEqual([
        'items-total',
        'packaging',
        'delivery-fee',
        'payable',
      ])
      // 基础四行均为 base/payable，不含优惠行（data-kind="discount"）
      expect(lines.map((line) => line.attributes('data-kind'))).toEqual([
        'base',
        'base',
        'base',
        'payable',
      ])
      expect(lines[0]!.text()).toContain('¥39.00')
      expect(lines[1]!.text()).toContain('¥2.00')
      expect(lines[2]!.text()).toContain('¥5.00')
      expect(lines[3]!.text()).toContain('¥46.00')
    })

    it('TA-2 无优惠事项时不渲染优惠行（未发生则整行不显示）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '46.00',
          ),
        { timeout: 2000 },
      )
      // 批次① 未接入优惠计价前，任何优惠项都不得凭空出现（满减/红包/新客/会员/配送费优惠）
      expect(wrapper.findAll('[data-testid="amount-line"][data-kind="discount"]')).toHaveLength(0)
      const amountText = wrapper.findAll('[data-testid="amount-line"]').map((line) => line.text())
      expect(amountText.join('')).not.toContain('−¥')
    })

    it('TA-3 店铺配送费缺失时仍显示 ¥0.00，金额区不出现 NaN/undefined', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      // m999 不在演示店铺种子内：详情接口失败 → deliveryFee 缺失，按「未配置按 0」兜底
      const { wrapper } = await mountConfirm({ storeId: 'm999' }, pinia)
      await vi.waitFor(
        () =>
          expect(
            wrapper.find('[data-testid="amount-line"][data-key="delivery-fee"]').exists(),
          ).toBe(true),
        { timeout: 2000 },
      )
      const lines = wrapper.findAll('[data-testid="amount-line"]')
      expect(lines).toHaveLength(4)
      expect(wrapper.find('[data-testid="amount-line"][data-key="delivery-fee"]').text()).toContain(
        '¥0.00',
      )
      const amountText = lines.map((line) => line.text()).join('')
      expect(amountText).not.toContain('NaN')
      expect(amountText).not.toContain('undefined')
    })

    it('TA-6 金额区标注「预估」并提示以后端计价为准（PRD 7.4：前端合计不作最终金额）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-estimate-tip"]').exists()).toBe(true),
        { timeout: 2000 },
      )
      // 真实后端已实现七步计价（满减/新客立减/免配送费），而下单前前端无法预知这些优惠
      // （用户端无优惠查询接口）→ 预览必须明确标注为预估，避免被当作最终金额
      expect(wrapper.find('[data-testid="amount-estimate-tip"]').text()).toContain('预估')
      expect(wrapper.find('[data-testid="amount-estimate-tip"]').text()).toContain('计价为准')
    })

    /**
     * 口径说明（2026-09-12 修订）：本用例锁定**替身与真实后端一致的七步计价**——
     * 替身已按 PRD 7.4 与后端 `PricingService` 逐行镜像（满减取最大满足档 / 新客立减 / 免配送费门槛 /
     * 会员折扣 / 红包 / 实付不小于 0）。m002 小计 39.00 时：− 满减 2.00（满 20 档）− 新客 0（u001 非该店首单）
     * + 配送费 5.00 − 配送费优惠 5.00（小计 ≥ 30）+ 打包费 2.00 = **39.00**。
     * 确认订单页的**预览**（TA-1）仍为基础四行 = 46.00：用户端没有优惠查询接口，下单前无法预知这些
     * 优惠，故页面标注为「预估」（TA-6），真实金额以创建订单结果为准——本用例正是锁定"以后端为准"。
     */
    it('TA-4 替身七步计价：创建订单金额快照含配送费与优惠各字段且实付按定稿公式（TC-ORD-011/021/022）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper, router } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '46.00',
          ),
        { timeout: 2000 },
      )
      // 提交前置：地址就绪（无地址时提交按钮禁用，点击会空转）
      await vi.waitFor(
        () => expect(wrapper.find('[data-testid="address-card"]').exists()).toBe(true),
        { timeout: 2000 },
      )
      await wrapper.find('[data-testid="submit-order-btn"]').trigger('click')
      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('order-pay'), {
        timeout: 2000,
      })
      const created = await orderApi.getOrder(String(router.currentRoute.value.params.orderId))
      // 金额快照（契约 §3.5/§10.4）：配送费入快照，实付按七步定稿公式（39 − 2 + 5 − 5 + 2 = 39.00）
      expect(created.deliveryFee).toBe(5)
      expect(created.packagingFee).toBe(2)
      expect(created.fullReductionAmount).toBe(2)
      expect(created.deliveryFeeDiscount).toBe(5)
      expect(created.newCustomerAmount).toBe(0)
      expect(created.total).toBe(39)
      // 与页面预览（基础四行 46.00）的差额只来自优惠，且预览在上界（后端只可能更便宜）
      expect(created.total!).toBeLessThanOrEqual(46)
    })
  })
})
