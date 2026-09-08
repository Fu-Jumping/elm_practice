import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import StoreDetailView from '../StoreDetailView.vue'
import { useCatalogStore } from '@/stores/catalogStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useCartStore } from '@/stores/cartStore'
import { onToast } from '@/utils/toast'
import { clearMockCart } from '@/mocks/cart'

/**
 * 商家详情页 P0 行为测试（2026-09-06 负责人拍板清单 T11-T18）
 * 口径来源：PRD 7.16.1 商家详情页三行 + 商家评价页行、契约 §3.2/§3.4、PRD 7.3
 * T11 详情接口数据渲染 + document.title 更新
 * T12 无效 storeId → "商家不存在" + 返回列表
 * T13 分类栏与商品列表连续联动：默认选中第一个有商品的分类；点击分类滚动定位到分区并高亮
 *     （2026-09-08 口径修正：负责人真机反馈 + 项目规则 §5「不得把分类切换做成页面切换」，
 *     右侧改为分段连续渲染全部分类商品，不再整列表切换）
 * T14 商品项字段渲染；售罄商品灰化且加购禁用
 * T15 加购后购物车栏数量/合计刷新；同商品合并数量
 * T16 店铺休息：提示可见，加购/结算禁用
 * T17 评价 Tab 占位："评价功能暂未开放"，不请求评价接口（P1 未选定）
 * T18 去结算：未登录跳登录带 redirect；已登录且购物车非空 → 进入确认订单页（9/7 口径演进：
 *     确认订单页落地后替换原"确认订单暂未开放"弱提示，见 raw/2026-09-07）
 * T45 未登录点加购 → 引导登录并带 redirect，不静默失败（9/7 联调补，加购需登录口径；
 *     T15 同步演进为登录态加购）
 */
describe('StoreDetailView（商家详情页 P0）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    // 购物车 mock 为模块级内存态：每条用例清空，隔离跨用例数量累加（同 ConfirmOrderView.spec）
    clearMockCart('m002')
    clearMockCart('m003')
  })

  afterEach(() => {
    offToast?.()
  })

  async function mountDetail(
    path = '/stores/m002',
    pinia: ReturnType<typeof createPinia> | undefined = undefined,
  ) {
    const p = pinia ?? createPinia()
    setActivePinia(p)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: StoreDetailView },
        { path: '/orders/confirm', name: 'order-confirm', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
      ],
    })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(StoreDetailView, { global: { plugins: [p, router] } })
    return { wrapper, router }
  }

  it('T11 详情接口数据渲染，document.title 更新为店名', async () => {
    const { wrapper } = await mountDetail('/stores/m002')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="store-banner"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    const banner = wrapper.find('[data-testid="store-banner"]')
    expect(banner.text()).toContain('肯德基宅急送')
    expect(banner.text()).toContain('4.8')
    expect(banner.text()).toContain('月售3500+')
    expect(banner.text()).toContain('25分钟')
    // 起送价/配送费两位小数（PRD 金额口径）
    expect(banner.text()).toContain('¥20.00')
    expect(banner.text()).toContain('¥5.00')
    await vi.waitFor(() => expect(document.title).toContain('肯德基宅急送'))
  })

  it('T12 无效 storeId 显示商家不存在，可返回列表', async () => {
    const { wrapper, router } = await mountDetail('/stores/none')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="store-missing"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    expect(wrapper.find('[data-testid="store-missing"]').text()).toContain('商家不存在')
    await wrapper.find('[data-testid="store-back-home"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('T13 分类栏与商品列表连续联动：默认选中第一个有商品的分类，点击分类滚动定位并高亮', async () => {
    const { wrapper } = await mountDetail('/stores/m002')
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="cat-rail-item"]').length).toBe(3),
      { timeout: 5000 },
    )
    const rails = wrapper.findAll('[data-testid="cat-rail-item"]')
    // 默认选中第一个有商品的分类（等分类与商品都就绪后由 watcher 落定）
    await vi.waitFor(
      () =>
        expect(wrapper.findAll('[data-testid="cat-rail-item"]')[0]!.classes()).toContain(
          'cat-rail-item--active',
        ),
      { timeout: 5000 },
    )
    // 连续渲染：三个分类的商品同时存在于列表（过滤式切换只会保留当前分类的商品）
    await vi.waitFor(
      () => {
        const text = wrapper.find('[data-testid="product-list"]').text()
        expect(text).toContain('香辣鸡腿堡')
        expect(text).toContain('黄金鸡块（5块）')
        expect(text).toContain('九珍果汁')
      },
      { timeout: 5000 },
    )
    // 每个分类一个分区锚点，供点击定位与滚动高亮使用
    expect(wrapper.find('[data-testid="product-section-c101"]').text()).toBe('主食')
    expect(wrapper.find('[data-testid="product-section-c102"]').text()).toBe('小食')
    expect(wrapper.find('[data-testid="product-section-c103"]').text()).toBe('饮品')
    // 点击第三个分类：立即高亮 + 列表滚动定位到该分区
    const listEl = wrapper.find('[data-testid="product-list"]').element as HTMLElement
    const scrollTo = vi.fn()
    listEl.scrollTo = scrollTo as unknown as HTMLElement['scrollTo']
    await rails[2]!.trigger('click')
    expect(
      wrapper.findAll('[data-testid="cat-rail-item"]')[2]!.classes(),
    ).toContain('cat-rail-item--active')
    expect(scrollTo).toHaveBeenCalled()
    // jsdom 无布局（offsetTop 恒为 0），断言调用参数为数字 top 即可
    const arg = scrollTo.mock.calls[0]![0] as { top: number }
    expect(typeof arg.top).toBe('number')
  })

  it('T14 商品项字段渲染，售罄商品灰化且加购禁用', async () => {
    const { wrapper } = await mountDetail('/stores/m002')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="product-list"]').text()).toContain('香辣鸡腿堡'),
      { timeout: 5000 },
    )
    const list = wrapper.find('[data-testid="product-list"]')
    expect(list.text()).toContain('招牌汉堡，香辣多汁')
    // 月售/好评率为契约缺口展示字段（mock 提供，缺失时隐藏）
    expect(list.text()).toContain('月售1200+')
    expect(list.text()).toContain('好评率98%')
    expect(list.text()).toContain('¥19.50')
    // p106 热辣香骨鸡 stock=0 → 售罄灰化 + 加购禁用（契约：库存 0 显示售罄禁止加购）
    const soldOut = wrapper.find('[data-testid="product-item-p106"]')
    expect(soldOut.classes()).toContain('product-item--soldout')
    expect(soldOut.find('[data-testid="add-btn-p106"]').attributes('disabled')).toBeDefined()
  })

  it('T45 未登录点加购 → 引导登录并带 redirect，不静默失败（9/7 联调补）', async () => {
    // 口径：加购需登录（后端 401），前端按 PRD 校验顺序"登录先行"引导；公开页 401 静默仅适用于浏览
    const { wrapper, router } = await mountDetail('/stores/m002')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="add-btn-p101"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    await wrapper.find('[data-testid="add-btn-p101"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(String(router.currentRoute.value.query.redirect)).toContain('/stores/m002')
    // 未登录不产生加购数据
    const cart = useCartStore()
    expect(cart.lines).toHaveLength(0)
  })

  it('T15 加购后购物车栏数量与合计刷新，同商品合并为单行', async () => {
    const { wrapper } = await mountDetail('/stores/m002')
    // 9/7 口径演进：加购需登录（T45），登录态由内存会话承载
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="add-btn-p101"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    // 第一次加购，等购物车栏刷新到 1（XA-05：加购进行中按钮禁用，需等完成再点下一次）
    await wrapper.find('[data-testid="add-btn-p101"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="cart-bar-count"]').text()).toBe('1'),
      { timeout: 5000 },
    )
    // 第二次加购同商品：合并为同一行，数量累加为 2
    await wrapper.find('[data-testid="add-btn-p101"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="cart-bar-count"]').text()).toBe('2'),
      { timeout: 5000 },
    )
    // 19.50 × 2 = 39.00（金额两位小数）
    expect(wrapper.find('[data-testid="cart-bar-total"]').text()).toContain('39.00')
    // 合并口径（契约 §3.4：同商品重复加购合并数量）：两行并为一行
    const cartStore = useCartStore()
    expect(cartStore.lines).toHaveLength(1)
    expect(cartStore.lines[0]!.quantity).toBe(2)
  })

  it('T16 店铺休息：提示可见，加购与结算禁用', async () => {
    const { wrapper } = await mountDetail('/stores/m004')
    await vi.waitFor(() => expect(wrapper.text()).toContain('老胖烧烤'), { timeout: 5000 })
    expect(wrapper.find('[data-testid="store-closed-tip"]').text()).toContain('休息')
    // 商品列表可能在 mock 延迟窗口内未返回，先等加购按钮渲染
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid^="add-btn-"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    expect(wrapper.find('[data-testid^="add-btn-"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="checkout-btn"]').attributes('disabled')).toBeDefined()
  })

  it('T17 评价 Tab 占位：显示评价功能暂未开放', async () => {
    const { wrapper } = await mountDetail('/stores/m002')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="tab-review"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    await wrapper.find('[data-testid="tab-review"]').trigger('click')
    expect(wrapper.find('[data-testid="review-placeholder"]').text()).toContain(
      '评价功能暂未开放',
    )
  })

  it('T18 去结算：未登录跳登录带 redirect；已登录且购物车非空进入确认订单页', async () => {
    // 用 m003 隔离购物车状态（cart mock 为模块级内存态，避免与 T15 的 m002 购物车耦合）
    const { wrapper, router } = await mountDetail('/stores/m003')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="checkout-btn"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    // 未登录：登录校验先行（PRD 去结算校验顺序）
    await wrapper.find('[data-testid="checkout-btn"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(String(router.currentRoute.value.query.redirect)).toContain('/stores/m003')
    // 已登录 + 购物车非空：校验通过，确认订单页未实现 → 弱提示
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    // 商品列表可能在 mock 延迟窗口内未返回，等加购按钮就绪再点
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="add-btn-p204"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    await wrapper.find('[data-testid="add-btn-p204"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="cart-bar-count"]').text()).toBe('1'),
      { timeout: 5000 },
    )
    await wrapper.find('[data-testid="checkout-btn"]').trigger('click')
    await flushPromises()
    // 9/7 口径演进：确认订单页落地，替换原"确认订单暂未开放"弱提示，进入确认订单并携带商家编号
    expect(router.currentRoute.value.name).toBe('order-confirm')
    expect(router.currentRoute.value.query.storeId).toBe('m003')
  })

  // T47-T50 购物车弹层与商品行步进器（2026-09-07 第三批，PRD 7.16.1 商家详情页行 + 契约 §3.4，
  // AI 设计落地沿用 1359 追认框架）：行内步进器 "- 数量 +"、减到 0 转删除、购物车栏点击展开弹层
  async function loginAndAdd(storeId: string, productId: string, times = 1) {
    // 先建并激活 pinia：登录态与视图共用同一实例（同 ConfirmOrderView.spec 骨架）
    const pinia = createPinia()
    setActivePinia(pinia)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const { wrapper, router } = await mountDetail(`/stores/${storeId}`, pinia)
    await vi.waitFor(
      () => expect(wrapper.find(`[data-testid="add-btn-${productId}"]`).exists()).toBe(true),
      { timeout: 5000 },
    )
    for (let i = 0; i < times; i++) {
      await wrapper.find(`[data-testid="add-btn-${productId}"]`).trigger('click')
      await vi.waitFor(
        () =>
          expect(
            Number(wrapper.find(`[data-testid="product-qty-${productId}"]`).text() || '0'),
          ).toBe(i + 1),
        { timeout: 5000 },
      )
    }
    return { wrapper, router }
  }

  it('T47 已加购商品显示行内步进器 "- 数量 +"，未加购商品仅有 + 按钮', async () => {
    const { wrapper } = await loginAndAdd('m002', 'p101', 2)
    expect(wrapper.find('[data-testid="minus-btn-p101"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="product-qty-p101"]').text()).toBe('2')
    // 未加购的 p102 仍是纯 + 态
    expect(wrapper.find('[data-testid="minus-btn-p102"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="add-btn-p102"]').exists()).toBe(true)
  })

  it('T48 步进器 + 数量加一并同步购物车栏（TC-CRT-004）', async () => {
    const { wrapper } = await loginAndAdd('m002', 'p101', 1)
    await wrapper.find('[data-testid="add-btn-p101"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="product-qty-p101"]').text()).toBe('2'),
      { timeout: 5000 },
    )
    expect(wrapper.find('[data-testid="cart-bar-count"]').text()).toBe('2')
  })

  it('T49 步进器 - 减到 0 转删除：步进器消失、购物车栏清零（TC-CRT-005/006）', async () => {
    const { wrapper } = await loginAndAdd('m002', 'p101', 2)
    await wrapper.find('[data-testid="minus-btn-p101"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="product-qty-p101"]').text()).toBe('1'),
      { timeout: 5000 },
    )
    await wrapper.find('[data-testid="minus-btn-p101"]').trigger('click')
    // 减到 0：前端转 DELETE 移除该行，商品行回到 + 态
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="minus-btn-p101"]').exists()).toBe(false),
      { timeout: 5000 },
    )
    expect(wrapper.find('[data-testid="cart-bar-count"]').exists()).toBe(false)
  })

  it('T50 点击购物车栏展开弹层：商品行与合计可见，可关闭（PRD 购物车弹层行）', async () => {
    const { wrapper } = await loginAndAdd('m002', 'p101', 2)
    await wrapper.find('[data-testid="cart-bar"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="cart-popup"]').exists()).toBe(true),
      { timeout: 5000 },
    )
    const popup = wrapper.find('[data-testid="cart-popup"]')
    expect(popup.text()).toContain('香辣鸡腿堡')
    expect(popup.text()).toContain('39.00')
    expect(popup.findAll('[data-testid="cart-popup-item"]').length).toBe(1)
    // 关闭弹层
    await wrapper.find('[data-testid="cart-popup-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="cart-popup"]').exists()).toBe(false)
  })

  it('T63 跨商家隔离提示：A 店有商品进 B 店时提示独立结算（TC-CRT-012）', async () => {
    // 口径：购物车按"当前用户+店铺"隔离（契约 §3.4）；A 店商品保留不合并，进 B 店时提示
    const pinia = createPinia()
    setActivePinia(pinia)
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const cart = useCartStore()
    // A 店（m002）加购 2 件
    await cart.fetchCart('m002')
    await cart.addItem('m002', 'p101', 2)
    await vi.waitFor(() => expect(cart.lines).toHaveLength(1), { timeout: 5000 })
    // 进入 B 店（m003）详情 → 触发跨店提示（A 店商品保留，B 店独立结算）
    await mountDetail('/stores/m003', pinia)
    await vi.waitFor(
      () => expect(messages.some((m) => m.includes('独立结算') || m.includes('保留'))).toBe(true),
      { timeout: 5000 },
    )
  })

  it('T67 跨店切换不残留旧店默认分类：逛过 m002 再进 m005 显示本店商品（2026-09-08 真浏览器复现缺陷）', async () => {
    // 缺陷链路：catalogStore 全局残留上一店分类/商品 → 进新店挂载时 watch(immediate)
    // 用旧店数据把 activeCategoryId 锁到旧店分类 id → 新店数据到达后 watcher 直接 return
    // → 当前分类下无商品 → “暂无商品”；退出重进因组件重建+缓存属本店才恢复。
    // PRD 7.16.1 点餐内容区行：默认选中第一个有商品的分类；商品接口为空才显示空态。
    const pinia = createPinia()
    const { wrapper: first } = await mountDetail('/stores/m002', pinia)
    await vi.waitFor(
      () => expect(first.findAll('[data-testid^="product-item-"]').length).toBeGreaterThan(0),
      { timeout: 5000 },
    )
    // 共享同一 pinia 进 m005（模拟返回列表后再进店；mock 分类 c201/c202 与 m002 的 c101~c103 不同）
    const { wrapper: second } = await mountDetail('/stores/m005', pinia)
    await vi.waitFor(
      () => expect(second.findAll('[data-testid^="product-item-"]').length).toBeGreaterThan(0),
      { timeout: 5000 },
    )
    // 默认选中 m005 第一个有商品的分类（招牌），不落“暂无商品”空态
    const activeCat = second.find('.cat-rail-item--active')
    expect(activeCat.exists()).toBe(true)
    expect(activeCat.text()).toBe('招牌')
    expect(second.find('[data-testid="product-list"]').text()).not.toContain('暂无商品')
  })

  it('T68 滚动商品列表时分类高亮同步（scroll-spy：偏移量判定 + 观察器触发）', async () => {
    // jsdom 无 IntersectionObserver：注入假实现捕获回调（实现以它作为同步触发源之一）
    let captured: { cb: IntersectionObserverCallback } | null = null
    class FakeIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        captured = { cb }
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    try {
      const { wrapper } = await mountDetail('/stores/m002')
      await vi.waitFor(
        () => expect(wrapper.findAll('[data-testid^="product-item-"]').length).toBeGreaterThan(0),
        { timeout: 5000 },
      )
      await vi.waitFor(() => expect(captured).not.toBeNull(), { timeout: 5000 })

      // 造几何（jsdom 无布局）：三个分区依次位于 0 / 400 / 800，列表可视高 400、内容高 1200
      const listEl = wrapper.find('[data-testid="product-list"]').element as HTMLElement
      const sections = Array.from(listEl.querySelectorAll('[data-section-id]')) as HTMLElement[]
      expect(sections.length).toBe(3)
      sections.forEach((el, index) => {
        Object.defineProperty(el, 'offsetTop', { value: index * 400, configurable: true })
      })
      Object.defineProperty(listEl, 'scrollHeight', { value: 1200, configurable: true })
      Object.defineProperty(listEl, 'clientHeight', { value: 400, configurable: true })
      let scrollTop = 0
      Object.defineProperty(listEl, 'scrollTop', {
        get: () => scrollTop,
        set: (value: number) => {
          scrollTop = value
        },
        configurable: true,
      })
      const activeIndex = () =>
        wrapper
          .findAll('[data-testid="cat-rail-item"]')
          .findIndex((rail) => rail.classes().includes('cat-rail-item--active'))
      const fireObserver = async () => {
        captured!.cb([], captured as unknown as IntersectionObserver)
        await nextTick()
      }

      // 列表在顶部 → 第一个分区高亮
      scrollTop = 0
      await fireObserver()
      expect(activeIndex()).toBe(0)
      // 滚过第二个分区标题 → 第二个分区高亮（长分区内滚动时观察器不回调，靠 scroll 事件同步）
      scrollTop = 500
      await wrapper.find('[data-testid="product-list"]').trigger('scroll')
      expect(activeIndex()).toBe(1)
      // 滚到底部 → 最后一个分区高亮（最后一个分区可能永远到不了命中线，需底部特判）
      scrollTop = 900
      await wrapper.find('[data-testid="product-list"]').trigger('scroll')
      expect(activeIndex()).toBe(2)
      // 从底部滑回顶部 → 高亮回到第一个分区（IntersectionObserver 交集无变化时不回调的场景）
      scrollTop = 0
      await wrapper.find('[data-testid="product-list"]').trigger('scroll')
      expect(activeIndex()).toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('T69 换店不闪现上一家店铺详情：旧店详情不参与渲染（2026-09-08 负责人真机反馈）', async () => {
    // 缺陷链路：catalogStore.storeDetail 全局残留上一店详情（T67 只修了分类/商品）→
    // 进新店首帧即渲染旧店横幅（头图/店名/评分），新店响应到达后才切换，形成闪烁。
    const pinia = createPinia()
    setActivePinia(pinia)
    const catalog = useCatalogStore()
    catalog.storeDetail = {
      storeId: 'm002',
      name: '肯德基宅急送',
      rating: 4.8,
      monthlySales: 3500,
      deliveryMinutes: 25,
      startPrice: 20,
      deliveryFee: 5,
      status: 'OPEN',
    }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: StoreDetailView },
        { path: '/orders/confirm', name: 'order-confirm', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
      ],
    })
    await router.push('/stores/m001')
    await router.isReady()
    const wrapper = mount(StoreDetailView, { global: { plugins: [pinia, router] } })
    // 首帧同步断言（不等接口返回）：不得渲染 m002 的横幅
    const firstFrame = wrapper.find('[data-testid="store-banner"]')
    expect(firstFrame.exists() ? firstFrame.text() : '').not.toContain('肯德基宅急送')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="store-banner"]').text()).toContain('老王小店'),
      { timeout: 5000 },
    )
  })

  it('T70 点击分类先滚外层到 Tab 吸顶线，再定位内层分区（项目规则 §5 滚动交接）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: StoreDetailView },
        { path: '/orders/confirm', name: 'order-confirm', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
      ],
    })
    await router.push('/stores/m002')
    await router.isReady()
    // 外层滚动容器由 MainLayout 提供（.app-main），此处用宿主组件模拟
    const Host = {
      components: { StoreDetailView },
      template: '<div class="app-main"><StoreDetailView /></div>',
    }
    const wrapper = mount(Host, { global: { plugins: [pinia, router] } })
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="cat-rail-item"]').length).toBe(3),
      { timeout: 5000 },
    )
    // 造几何（jsdom 无布局）：外层已滚 0，Tab 距视口顶 300px，顶部栏高 44px → 吸顶线目标 256px
    const mainEl = wrapper.find('.app-main').element as HTMLElement
    let outerScrollTop = 0
    Object.defineProperty(mainEl, 'scrollTop', {
      get: () => outerScrollTop,
      set: (value: number) => {
        outerScrollTop = value
      },
      configurable: true,
    })
    const tabsEl = wrapper.find('.store-tabs').element as HTMLElement
    tabsEl.getBoundingClientRect = () => ({ top: 300 }) as DOMRect
    const headerEl = wrapper.find('.detail-header').element as HTMLElement
    Object.defineProperty(headerEl, 'offsetHeight', { value: 44, configurable: true })
    const listEl = wrapper.find('[data-testid="product-list"]').element as HTMLElement
    const innerScrollTo = vi.fn()
    listEl.scrollTo = innerScrollTo as unknown as HTMLElement['scrollTo']

    await wrapper.findAll('[data-testid="cat-rail-item"]')[2]!.trigger('click')

    // 外层先滚到吸顶线（300 - 44 = 256），随后才滚内层列表
    expect(outerScrollTop).toBe(256)
    expect(innerScrollTo).toHaveBeenCalled()
  })
})
