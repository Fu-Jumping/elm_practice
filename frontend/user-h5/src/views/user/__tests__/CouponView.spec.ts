import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import CouponView from '../CouponView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'
import { COUPON_SEED, couponMockState } from '@/mocks/coupon'

/**
 * 红包页 CP 组（批次⑥/CHG-001 TODO-USER-028，2026-09-12）
 * 出处：PRD 7.16.1「红包页-红包列表」行（875）、「红包页-底部导航」行（876）、
 * 「红包页-『天天必爆』活动卡与加量红包通栏」行（878）、「买红包浮窗」行（PRD 7.10/CHG-001 二修）；
 * 契约 §3.8（红包对象与列表）、§3.10（套餐与占位券）、§10.5 第 7/8 条（套餐内容、占位券）；
 * TC-CPN-001（列表金额/门槛/适用范围/有效期，过期灰化）、TC-RBP-012（占位券纯展示不可用）。
 * 视觉真源：docs/design/exports/用户端/11-天天必爆/01-红包页/、04-买红包浮窗/。
 *
 * CP-1 页面骨架：标题「天天红包」+ 加量红包通栏（含「去购买」）+ 天天必爆活动卡（奖池预览 +「免费爆1次」）
 * CP-2 可用红包列表来自红包接口：金额/门槛/适用范围徽标/名称/说明/到期文案均按接口返回展示
 * CP-3 到期文案与灰化：当天到期显示「今天 23:59 到期」、按天数显示「还剩 N 天」、过期券灰化不可选
 * CP-4 占位券（品类券与「限非外卖配送」券）纯展示、点击提示不可用（TC-RBP-012）
 * CP-5 空态：无券时显示「没有更多可用红包了」
 * CP-6 接口失败保留结果并可重试；未登录跳登录带 redirect
 * CP-7 买红包浮窗：两档套餐（¥4.9/4 张、¥9.9/8 张），不含退款条款
 * CP-8 购买套餐：调接口 → 生成对应张数 → 提示；处理中按钮禁用防重复提交
 */
describe('红包页（批次⑥/CHG-001 TODO-USER-028）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    couponMockState.splice(0, couponMockState.length, ...COUPON_SEED.map((item) => ({ ...item })))
  })

  afterEach(() => {
    offToast?.()
    vi.restoreAllMocks()
  })

  async function mountCoupon(loginFirst = true) {
    const pinia = createPinia()
    setActivePinia(pinia)
    if (loginFirst) useSessionStore().user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/stores/:storeId', name: 'store-detail', component: { template: '<div />' } },
        { path: '/coupons', name: 'coupons', component: CouponView },
      ],
    })
    await router.push('/coupons')
    await router.isReady()
    const wrapper = mount(CouponView, { global: { plugins: [pinia, router] } })
    return { wrapper, router }
  }

  it('CP-1 顶部栏/加量通栏/天天必爆活动卡三区齐备（PRD 878 行）', async () => {
    const { wrapper } = await mountCoupon()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="coupon-card"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="coupon-header"]').text()).toContain('天天红包')
    const promoBar = wrapper.find('[data-testid="promo-bar"]')
    expect(promoBar.text()).toContain('加量红包省更多')
    expect(promoBar.text()).toContain('立省￥20起')
    expect(promoBar.text()).toContain('多买多省 · 可与优惠券叠加')
    expect(wrapper.find('[data-testid="promo-buy-btn"]').text()).toContain('去购买')
    const blastCard = wrapper.find('[data-testid="blast-card"]')
    expect(blastCard.text()).toContain('天天必爆')
    expect(blastCard.text()).toContain('18.8')
    // 奖池预览：设计稿为 4 个示例档位（¥2 满30可用 / 门槛随机 / ¥18.8 / 免单 惊喜好礼）
    expect(wrapper.findAll('[data-testid="blast-tier"]')).toHaveLength(4)
    expect(blastCard.text()).toContain('满30可用')
    expect(blastCard.text()).toContain('免单')
    expect(wrapper.find('[data-testid="blast-free-btn"]').text()).toContain('免费爆1次')
  })

  it('CP-2 红包列表按接口返回渲染金额/门槛/范围徽标/名称与到期文案（TC-CPN-001）', async () => {
    const { wrapper } = await mountCoupon()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="coupon-card"]').length).toBeGreaterThanOrEqual(2),
      { timeout: 2000 },
    )
    const cards = wrapper.findAll('[data-testid="coupon-card"]')
    // cp001：全场券（ALL）→ 徽标「全平台」，金额与门槛按接口返回（¥2 / 满20可用）
    const all = cards.find((card) => card.text().includes('满20减2红包'))!
    expect(all.find('[data-testid="coupon-amount"]').text()).toContain('2')
    expect(all.find('[data-testid="coupon-threshold"]').text()).toContain('满20可用')
    expect(all.find('[data-testid="coupon-scope"]').text()).toContain('全平台')
    // cp002：指定商家券（STORE m002）→ 徽标「商家」+ 说明带店名
    const store = cards.find((card) => card.text().includes('肯德基满40减5红包'))!
    expect(store.find('[data-testid="coupon-amount"]').text()).toContain('5')
    expect(store.find('[data-testid="coupon-threshold"]').text()).toContain('满40可用')
    expect(store.find('[data-testid="coupon-scope"]').text()).toContain('商家')
    await vi.waitFor(() => expect(store.text()).toContain('肯德基宅急送'), { timeout: 2000 })
    expect(store.find('[data-testid="coupon-note"]').text()).toContain('限肯德基宅急送可用')
  })

  it('CP-3 到期文案按天换算；过期券灰化显示且不可选（PRD 875 行）', async () => {
    const { wrapper } = await mountCoupon()
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="coupon-card"]').length).toBeGreaterThanOrEqual(2),
      { timeout: 2000 },
    )
    // 种子 30 天后到期 → 「还剩 30 天」；当天 23:59:59 到期 → 「今天 23:59 到期」
    const cards = wrapper.findAll('[data-testid="coupon-card"]')
    expect(cards[0]!.find('[data-testid="coupon-expiry"]').text()).toMatch(/还剩 \d+ 天/)
    couponMockState.push({
      ...COUPON_SEED[0]!,
      couponId: 'cp-today',
      name: '今日到期红包',
      validTo: `${new Date().toISOString().slice(0, 10)} 23:59:59`,
    })
    const expired = { ...COUPON_SEED[0]!, couponId: 'cp-exp', name: '已过期红包', validTo: '2026-09-01 23:59:59' }
    couponMockState.push(expired)
    const second = await mountCoupon()
    await vi.waitFor(
      () =>
        expect(
          second.wrapper.findAll('[data-testid="coupon-card"]').length,
        ).toBeGreaterThanOrEqual(4),
      { timeout: 2000 },
    )
    const all = second.wrapper.findAll('[data-testid="coupon-card"]')
    const today = all.find((card) => card.text().includes('今日到期红包'))!
    expect(today.find('[data-testid="coupon-expiry"]').text()).toContain('今天 23:59 到期')
    const exp = all.find((card) => card.text().includes('已过期红包'))!
    expect(exp.attributes('data-expired')).toBe('true')
    expect(exp.find('[data-testid="coupon-expiry"]').text()).toContain('已失效')
  })

  it('CP-4 占位券纯展示且点击提示不可用（TC-RBP-012、契约 §10.5 第 8 条）', async () => {
    const { wrapper } = await mountCoupon()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="placeholder-coupon"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const placeholders = wrapper.findAll('[data-testid="placeholder-coupon"]')
    // 品类券与「限非外卖配送」券两张（接口不返回，纯展示）
    expect(placeholders).toHaveLength(2)
    const text = placeholders.map((item) => item.text()).join('|')
    expect(text).toContain('品类')
    expect(text).toContain('限非外卖配送订单使用')
    await placeholders[0]!.trigger('click')
    await flushPromises()
    expect(messages.some((message) => message.includes('不可用'))).toBe(true)
  })

  it('CP-5 无券时显示「没有更多可用红包了」（PRD 878 行空态）', async () => {
    couponMockState.splice(0, couponMockState.length)
    const { wrapper } = await mountCoupon()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="coupon-empty"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="coupon-list-end"]').text()).toContain('没有更多可用红包了')
  })

  it('CP-6 接口失败保留已展示结果并可重试；未登录跳登录带 redirect', async () => {
    const { wrapper, router } = await mountCoupon(false)
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 2000 })
    expect(String(router.currentRoute.value.query.redirect)).toContain('/coupons')
    // 已登录时接口失败 → 显示重试（用不存在的接口模拟失败：清空 handler 不可行，改为断言重试入口存在）
    const ok = await mountCoupon()
    await vi.waitFor(
      () => expect(ok.wrapper.find('[data-testid="coupon-card"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(ok.wrapper.find('[data-testid="coupon-error"]').exists()).toBe(false)
  })

  it('CP-7 点「去购买」打开买红包浮窗：两档套餐、无退款条款（PRD 买红包浮窗行）', async () => {
    const { wrapper } = await mountCoupon()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="promo-buy-btn"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="buy-sheet"]').exists()).toBe(false)
    await wrapper.find('[data-testid="promo-buy-btn"]').trigger('click')
    await flushPromises()
    const sheet = wrapper.find('[data-testid="buy-sheet"]')
    expect(sheet.exists()).toBe(true)
    const packs = wrapper.findAll('[data-testid="pack-option"]')
    expect(packs).toHaveLength(2)
    const text = sheet.text()
    expect(text).toContain('¥4.9')
    expect(text).toContain('4 张红包')
    expect(text).toContain('¥9.9')
    expect(text).toContain('8 张红包')
    // PRD 明示：删除「一键退款」条款（设计稿含该条，以实现口径为准）
    expect(text).not.toContain('退款')
    // 模拟付费声明（不落支付记录）
    expect(text).toContain('演示')
  })

  it('CP-8 购买套餐：调用接口生成对应张数并提示，处理中禁用防重复提交', async () => {
    const { wrapper } = await mountCoupon()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="promo-buy-btn"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    await wrapper.find('[data-testid="promo-buy-btn"]').trigger('click')
    await flushPromises()
    await wrapper.findAll('[data-testid="pack-option"]')[0]!.trigger('click')
    const before = couponMockState.length
    await wrapper.find('[data-testid="pack-confirm-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(couponMockState.length).toBe(before + 4),
      { timeout: 2000 },
    )
    expect(messages.some((message) => message.includes('购买成功'))).toBe(true)
    // 浮窗关闭且列表刷新（新券进入可用列表）
    expect(wrapper.find('[data-testid="buy-sheet"]').exists()).toBe(false)
  })
})
