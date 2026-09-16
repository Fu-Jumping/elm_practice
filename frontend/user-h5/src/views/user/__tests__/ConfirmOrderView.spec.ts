import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmOrderView from '../ConfirmOrderView.vue'
import { orderApi } from '@/services/api'
import { COUPON_SEED, couponMockState } from '@/mocks/coupon'
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
 * 2026-09-15 修订（CHG-006）：新增 `POST /orders/preview` 后，确认订单页金额**全部取后端计价结果**，
 * m002（演示促销：满 20 减 2、满 30 免配送费）小计 39.00 时实付 = 39 − 2 + 5 − 5 + 2 = **39.00**，
 * 且与创建订单的快照逐项一致；预览接口不可用时退回本地估算（无优惠退化口径）并保留「预估」标注。
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
    // 红包替身内存态：每条用例重灌（CPN 组依赖券种子）
    couponMockState.splice(0, couponMockState.length, ...COUPON_SEED.map((item) => ({ ...item })))
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
    // 金额明细（CHG-004 + CHG-006 预览口径）：m002 小计 39.00 命中满 20 减 2 与满 30 免配送费，
    // 实付 39 − 2 + 5 − 5 + 2 = 39.00（与创建订单快照一致，见 TA-4）
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain('39.00'),
      { timeout: 2000 },
    )
    const amountLines = wrapper.findAll('[data-testid="amount-line"]')
    expect(amountLines.map((line) => line.attributes('data-key'))).toEqual([
      'items-total',
      'packaging',
      'delivery-fee',
      'full-reduction',
      'delivery-fee-discount',
      'payable',
    ])
    expect(amountLines[0]!.text()).toContain('商品小计')
    expect(amountLines[1]!.text()).toContain('打包费')
    expect(amountLines[2]!.text()).toContain('¥5.00')
    // 检查通过 → 去支付可用
    expect(wrapper.find('[data-testid="submit-order-btn"]').attributes('disabled')).toBeUndefined()
  })

  /**
   * T31 商品行必须有商品图（2026-09-16 线上缺陷：确认订单页商品行只有名称/单价/数量，无任何图片）。
   * 视觉真源 `docs/design/exports/用户端/06-订单/04-确认订单/code.html`：每行商品左侧
   * `w-16 h-16 rounded-lg object-cover` 缩略图，图片取值走 `utils/demoImages` 三级兜底链
   * （接口 image → 演示映射 → 占位图），与订单详情页 OD-12/OD-13 同口径。
   */
  it('T31 商品行渲染商品缩略图（真源 w-16 h-16，不得为空占位）', async () => {
    const pinia = bootstrapPinia()
    await loginAndFillCart()
    const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="order-items"]').text()).toContain('香辣鸡腿堡'),
      { timeout: 2000 },
    )
    const rows = wrapper.findAll('.co-item')
    const thumbs = wrapper.findAll('[data-testid="co-item-thumb"]')
    expect(rows.length).toBeGreaterThan(0)
    // 行数与图数一致：每个商品行一张缩略图，且必须是真实 <img>（历史缺陷是用空占位元素顶替）
    expect(thumbs).toHaveLength(rows.length)
    expect(thumbs[0]!.element.tagName).toBe('IMG')
    // 替身购物车行不带 image → 命中演示映射（p101 → product-m002-01）
    expect(thumbs[0]!.attributes('src')).toBe('/demo-images/product-m002-01.jpg')
    expect(thumbs[0]!.attributes('alt')).toBe('香辣鸡腿堡')
    expect(thumbs.every((thumb) => (thumb.attributes('src') ?? '') !== '')).toBe(true)
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
      () => expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain('39.00'),
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
    it('TA-1 基础四行恒显示且顺序固定，优惠行按实际发生（金额取后端计价预览）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '39.00',
          ),
        { timeout: 2000 },
      )
      const lines = wrapper.findAll('[data-testid="amount-line"]')
      expect(lines.map((line) => line.attributes('data-key'))).toEqual([
        'items-total',
        'packaging',
        'delivery-fee',
        'full-reduction',
        'delivery-fee-discount',
        'payable',
      ])
      // 基础四行恒为 base/payable；优惠行按实际发生为 discount（CHG-004 口径）
      expect(lines.map((line) => line.attributes('data-kind'))).toEqual([
        'base',
        'base',
        'base',
        'discount',
        'discount',
        'payable',
      ])
      expect(lines[0]!.text()).toContain('¥39.00')
      expect(lines[1]!.text()).toContain('¥2.00')
      expect(lines[2]!.text()).toContain('¥5.00')
      // 满减取最大满足档（39 ≥ 20 → 减 2.00）、满 30 免配送费（减全额配送费 5.00），品牌橙负数
      expect(lines[3]!.text()).toContain('−¥2.00')
      expect(lines[4]!.text()).toContain('−¥5.00')
      expect(lines[5]!.text()).toContain('¥39.00')
    })

    it('TA-2 未达门槛时不渲染优惠行（未发生则整行不显示）', async () => {
      const pinia = bootstrapPinia()
      const session = useSessionStore()
      session.user = { account: '13800000001', nickname: '张同学' }
      const cart = useCartStore()
      // 九珍果汁 9.00：未达满减门槛 20、未达免配送费门槛 30 → 无任何优惠
      await cart.addItem('m002', 'p105', 1)
      await vi.waitFor(() => expect(cart.lines).toHaveLength(1), { timeout: 2000 })
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '16.00',
          ),
        { timeout: 2000 },
      )
      // 未发生的优惠不得凭空出现（满减/红包/新客/会员/配送费优惠）
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
      // 预览接口不可用（店铺不存在 → 预览失败）时退回本地估算，仍保留「预估」标注
      expect(wrapper.find('[data-testid="amount-estimate-tip"]').text()).toContain('预估')
    })

    it('TA-6 金额区明示计价口径（预览可用时不再标「预估」）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '39.00',
          ),
        { timeout: 2000 },
      )
      // CHG-006：金额取自后端计价预览（SRS §5.6「由后端计算、页面只展示结果」），
      // 提示随之改为「系统按优惠规则实时计算」，不再用与后端结果不符的「预估」误导用户
      expect(wrapper.find('[data-testid="amount-estimate-tip"]').text()).toContain('系统按优惠规则')
      expect(wrapper.find('[data-testid="amount-estimate-tip"]').text()).toContain('以下单时结果为准')
    })

    /**
     * 口径说明（2026-09-12 修订）：本用例锁定**替身与真实后端一致的七步计价**——
     * 替身已按 PRD 7.4 与后端 `PricingService` 逐行镜像（满减取最大满足档 / 新客立减 / 免配送费门槛 /
     * 会员折扣 / 红包 / 实付不小于 0）。m002 小计 39.00 时：− 满减 2.00（满 20 档）− 新客 0（u001 非该店首单）
     * + 配送费 5.00 − 配送费优惠 5.00（小计 ≥ 30）+ 打包费 2.00 = **39.00**。
     * CHG-006 后确认订单页的**预览**同样取后端计价（`POST /orders/preview`）→ 预览与创建订单结果**逐项一致**，
     * 本用例同时锁定「预览不再是另一个数」（原「预览在上界 46.00」的差额口径已随预览接口消失）。
     */
    it('TA-4 替身七步计价：创建订单金额快照含配送费与优惠各字段且实付按定稿公式（TC-ORD-011/021/022）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper, router } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '39.00',
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
      // CHG-006：页面预览即后端计价结果 → 下单后页面显示的实付与订单快照必须一致（不再有 46 vs 39 的落差）
      expect(
        wrapper.find('[data-testid="amount-line"][data-key="payable"]').text(),
      ).toContain('¥39.00')
    })
  })

  /**
   * CPN 组：确认订单页红包选择（批次⑥ TODO-USER-006 剩余部分 + CHG-001 闭环，2026-09-12）
   * 出处：PRD 7.4 七步第 ⑥ 步、PRD 7.16.1「红包页-红包列表」行（875：确认订单页只在红包扩展选定后可选可用红包）、
   * 契约 §3.8（可用红包查询与一单一红包、下单 `couponId` 选用）、TC-CPN-002/003/004。
   * 口径：可用券由后端按门槛（门槛基数=商品小计，不含打包费/配送费）与适用范围过滤，前端只展示返回项、
   * 不自行判断可选性；金额明细的「红包优惠」行走 `buildAmountLines` 的优惠项出口（与订单详情、支付页同口径）。
   */
  describe('确认订单页红包选择（批次⑥ TODO-USER-006）', () => {
    it('CPN-1 红包选择区按接口返回可用券数量，点开弹层列出可用券', async () => {
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
      // 小计 39.00：cp001（满20减2，全场）可用；cp002（满40减5，限 m002）门槛不足 → 不返回
      await vi.waitFor(
        () => expect(wrapper.find('[data-testid="coupon-select"]').text()).toContain('1 张可用'),
        { timeout: 2000 },
      )
      await wrapper.find('[data-testid="coupon-select"]').trigger('click')
      await flushPromises()
      const options = wrapper.findAll('[data-testid="coupon-option"]')
      expect(options).toHaveLength(1)
      expect(options[0]!.text()).toContain('满20减2红包')
      expect(options[0]!.text()).toContain('全平台可用')
      // 可取消选择
      expect(wrapper.find('[data-testid="coupon-none-btn"]').exists()).toBe(true)
    })

    it('CPN-2 选择红包 → 金额明细出现「红包优惠」行且实付预览减少；可取消（TC-CPN-002）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="coupon-select"]').text()).toContain('1 张可用'),
        { timeout: 2000 },
      )
      // 先等后端计价预览就绪（CHG-006）：否则金额区还是本地估算的回落态，后续断言会读到旧数
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain(
            '39.00',
          ),
        { timeout: 2000 },
      )
      await wrapper.find('[data-testid="coupon-select"]').trigger('click')
      await flushPromises()
      await wrapper.findAll('[data-testid="coupon-option"]')[0]!.trigger('click')
      await flushPromises()
      const couponLine = wrapper.find('[data-testid="amount-line"][data-key="coupon"]')
      expect(couponLine.exists()).toBe(true)
      expect(couponLine.attributes('data-kind')).toBe('discount')
      expect(couponLine.text()).toContain('红包优惠')
      expect(couponLine.text()).toContain('−¥2.00')
      // CHG-006：实付取后端计价结果 − 已选券面额 = 39.00 − 2.00 = 37.00（与 CPN-3 订单快照一致）
      expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain('37.00')
      // 取消选择 → 优惠行消失、实付回到 46.00
      await wrapper.find('[data-testid="coupon-select"]').trigger('click')
      await flushPromises()
      await wrapper.find('[data-testid="coupon-none-btn"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="amount-line"][data-key="coupon"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="amount-line"][data-key="payable"]').text()).toContain('39.00')
    })

    it('CPN-3 提交订单把 couponId 传给后端：券置已用且订单快照 couponAmount 正确（TC-CPN-002）', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      const { wrapper, router } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () =>
          expect(wrapper.find('[data-testid="coupon-select"]').text()).toContain('1 张可用'),
        { timeout: 2000 },
      )
      await wrapper.find('[data-testid="coupon-select"]').trigger('click')
      await flushPromises()
      await wrapper.findAll('[data-testid="coupon-option"]')[0]!.trigger('click')
      await flushPromises()
      await vi.waitFor(
        () => expect(wrapper.find('[data-testid="address-card"]').exists()).toBe(true),
        { timeout: 2000 },
      )
      await wrapper.find('[data-testid="submit-order-btn"]').trigger('click')
      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('order-pay'), {
        timeout: 2000,
      })
      const created = await orderApi.getOrder(String(router.currentRoute.value.params.orderId))
      // 七步第 ⑥ 步：券金额入快照，一单一红包
      expect(created.couponAmount).toBe(2)
      // 39 − 满减 2 − 红包 2 + 配送费 5 − 配送费优惠 5 + 打包费 2 = 37.00
      expect(created.total).toBe(37)
      // 券被核销
      expect(couponMockState.find((item) => item.couponId === 'cp001')!.used).toBe(true)
    })

    it('CPN-4 无可用券时给出「暂无可用红包」且不可点开', async () => {
      const pinia = bootstrapPinia()
      await loginAndFillCart()
      // 清空券种子 → 无可用券
      couponMockState.splice(0, couponMockState.length)
      const { wrapper } = await mountConfirm({ storeId: 'm002' }, pinia)
      await vi.waitFor(
        () => expect(wrapper.find('[data-testid="coupon-select"]').exists()).toBe(true),
        { timeout: 2000 },
      )
      expect(wrapper.find('[data-testid="coupon-select"]').text()).toContain('暂无可用红包')
      await wrapper.find('[data-testid="coupon-select"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="coupon-sheet"]').exists()).toBe(false)
    })
  })
})
