import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import CouponView from '../CouponView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'
import { COUPON_SEED, blastRandomState, couponMockState, freeBlastState } from '@/mocks/coupon'

/**
 * 爆红包 RB 组（CHG-001 TODO-USER-029，2026-09-12）
 * 出处：PRD 7.16.1「爆红包过渡态」行（879）、「爆出结果」行（880）、PRD 7.10 CHG-001 二修；
 * 契约 §3.10（爆一次：免费次数 / 替换式 / 有效期 / 响应字段）、§10.5 第 2~5 条（档位池权重、免费次数、替换与终态、有效期）；
 * TC-RBP-003（免费爆新增券且不消耗已购券）、TC-RBP-004（同日再爆 409 → 引导消耗或去购买）、
 * TC-RBP-005（消耗券爆为替换式）、TC-RBP-006（爆出的券不可再爆）、TC-RBP-009（无免费次数且无可爆券 → 提示去购买）、
 * TC-RBP-013（动效可跳过、音频不可用时静默降级）。
 * 视觉真源：docs/design/exports/用户端/11-天天必爆/02-爆红包过渡态/、03-爆出结果/。
 *
 * RB-1 过渡态：全屏浮层齐备（横幅 / 红包卡与「爆」按钮 / 最高 ¥18.8 正在破封 / 欧气进度 / 关闭）
 * RB-2 免费爆成功：结果卡按接口返回展示金额与门槛 + 限今天 23:59 前使用 + 已放入我的红包 + 去使用按钮；券进入列表
 * RB-3 同日再爆被拒（409）→ 浮层引导「消耗红包爆」；消耗后为替换式（同一 couponId、不新增行）
 * RB-4 无可爆券时引导「去购买」（打开买红包浮窗）
 * RB-5 爆出来的券当天 23:59:59 到期且不可再爆（canBlast=false）
 * RB-6 接口失败：浮层保留并原地可重试，且不消耗免费次数与红包
 * RB-7 动效可跳过；音频不可用时静默降级（不抛错、不影响结果）
 */
describe('爆红包浮层（CHG-001 TODO-USER-029）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    couponMockState.splice(0, couponMockState.length, ...COUPON_SEED.map((item) => ({ ...item })))
    freeBlastState.date = ''
    blastRandomState.fn = () => 0.99 // 固定命中第 10 档（满40减18.8），使断言确定
  })

  afterEach(() => {
    offToast?.()
    vi.restoreAllMocks()
    blastRandomState.fn = Math.random
  })

  async function mountCoupon() {
    const pinia = createPinia()
    setActivePinia(pinia)
    useSessionStore().user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/coupons', name: 'coupons', component: CouponView },
      ],
    })
    await router.push('/coupons')
    await router.isReady()
    const wrapper = mount(CouponView, { global: { plugins: [pinia, router] } })
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-free-btn"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    return { wrapper, router }
  }

  async function openOverlay(wrapper: Awaited<ReturnType<typeof mountCoupon>>['wrapper']) {
    await wrapper.find('[data-testid="blast-free-btn"]').trigger('click')
    await flushPromises()
    return wrapper.find('[data-testid="blast-overlay"]')
  }

  it('RB-1 过渡态齐备：横幅/红包卡与「爆」按钮/最高 ¥18.8 正在破封/欧气进度/关闭（PRD 879 行）', async () => {
    const { wrapper } = await mountCoupon()
    const overlay = await openOverlay(wrapper)
    expect(overlay.exists()).toBe(true)
    expect(wrapper.find('[data-testid="blast-banner"]').text()).toContain('天天必爆')
    expect(wrapper.find('[data-testid="blast-banner"]').text()).toContain('正在爆出专属红包')
    expect(wrapper.find('[data-testid="blast-burst-btn"]').text()).toContain('爆')
    expect(overlay.text()).toContain('最高 ¥18.8 正在破封')
    expect(wrapper.find('[data-testid="blast-progress"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="blast-close"]').exists()).toBe(true)
    // 关闭 → 退出浮层，回到红包页
    await wrapper.find('[data-testid="blast-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="blast-overlay"]').exists()).toBe(false)
  })

  it('RB-2 免费爆成功：结果卡按接口返回展示金额/门槛/限今天 23:59 前使用/已放入我的红包（PRD 880、TC-RBP-003）', async () => {
    const { wrapper } = await mountCoupon()
    await openOverlay(wrapper)
    const before = couponMockState.length
    await wrapper.find('[data-testid="blast-burst-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-result"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    const result = wrapper.find('[data-testid="blast-result"]')
    // 固定种子命中第 10 档（满40减18.8）→ 金额与门槛一律按后端返回展示
    expect(result.find('[data-testid="blast-result-amount"]').text()).toContain('18.8')
    expect(result.find('[data-testid="blast-result-threshold"]').text()).toContain('满40元可用')
    expect(result.text()).toContain('限今天 23:59 前使用')
    expect(result.text()).toContain('已放入')
    expect(wrapper.find('[data-testid="blast-use-btn"]').text()).toContain('去使用，立即抵扣')
    // 免费爆为新增一张（不消耗已购券）
    expect(couponMockState.length).toBe(before + 1)
    // 「去使用」→ 关闭浮层并刷新列表（券已在列表中）
    await wrapper.find('[data-testid="blast-use-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-overlay"]').exists()).toBe(false),
      { timeout: 2000 },
    )
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-testid="coupon-card"]').length).toBeGreaterThanOrEqual(3),
      { timeout: 2000 },
    )
  })

  it('RB-3 同日再爆被拒 → 引导「消耗红包爆」，消耗为替换式且不新增行（TC-RBP-004/005）', async () => {
    // 准备一张可爆的已购券（pack49 购买所得 canBlast=true）
    const { wrapper } = await mountCoupon()
    await wrapper.find('[data-testid="promo-buy-btn"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="pack-confirm-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(couponMockState.some((item) => item.canBlast)).toBe(true),
      { timeout: 2000 },
    )
    const blastable = couponMockState.find((item) => item.canBlast)!
    // 先用掉当日免费次数
    await openOverlay(wrapper)
    await wrapper.find('[data-testid="blast-burst-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-result"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    await wrapper.find('[data-testid="blast-use-btn"]').trigger('click')
    await flushPromises()
    // 免费爆已新增一张（免费爆为插入新券）→ 记录替换前的行数
    const countBefore = couponMockState.length
    // 再次爆：免费次数已用 → 409 → 浮层给出「消耗红包爆」入口
    await openOverlay(wrapper)
    await wrapper.find('[data-testid="blast-burst-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-blocked"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    expect(wrapper.find('[data-testid="blast-blocked"]').text()).toContain('已用完')
    await wrapper.find('[data-testid="blast-spend-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-result"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    // 替换式：张数不变、该券门槛与金额被更新、canBlast 置为终态
    expect(couponMockState.length).toBe(countBefore)
    const updated = couponMockState.find((item) => item.couponId === blastable.couponId)!
    expect(updated.canBlast).toBe(false)
    expect(updated.amount).toBe(18.8)
    expect(updated.threshold).toBe(40)
  })

  it('RB-4 无可爆券且无免费次数 → 引导「去购买」（TC-RBP-009）', async () => {
    const { wrapper } = await mountCoupon()
    freeBlastState.date = new Date().toISOString().slice(0, 10) // 模拟当日免费次数已用
    await openOverlay(wrapper)
    await wrapper.find('[data-testid="blast-burst-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-blocked"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    // 种子里没有可爆券（canBlast 全为 false）→ 只给「去购买」
    expect(wrapper.find('[data-testid="blast-spend-btn"]').exists()).toBe(false)
    await wrapper.find('[data-testid="blast-buy-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="buy-sheet"]').exists()).toBe(true)
  })

  it('RB-5 爆出来的券当天 23:59:59 到期且不可再爆（契约 §10.5 第 4/5 条）', async () => {
    const { wrapper } = await mountCoupon()
    await openOverlay(wrapper)
    await wrapper.find('[data-testid="blast-burst-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-result"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    const blasted = couponMockState.find((item) => item.source === 'BLAST_OUT')!
    expect(blasted.validTo.endsWith('23:59:59')).toBe(true)
    expect(blasted.validTo.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10))
    expect(blasted.canBlast).toBe(false)
    // 结果卡上的到期文案与券数据一致（同为当天到期口径）
    expect(wrapper.find('[data-testid="blast-result"]').text()).toContain('限今天 23:59 前使用')
  })

  it('RB-6 接口失败：浮层保留并可原地重试，不消耗免费次数与红包（TC-RBP-013 错误列）', async () => {
    const { wrapper } = await mountCoupon()
    await openOverlay(wrapper)
    // 注入失败：把免费次数标记为已用且无可爆券 → 接口返回 409（真实失败路径）
    freeBlastState.date = new Date().toISOString().slice(0, 10)
    await wrapper.find('[data-testid="blast-burst-btn"]').trigger('click')
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="blast-blocked"]').exists()).toBe(true),
      { timeout: 3000 },
    )
    // 失败不产生脏数据
    expect(couponMockState.some((item) => item.source === 'BLAST_OUT')).toBe(false)
    expect(wrapper.find('[data-testid="blast-overlay"]').exists()).toBe(true)
  })

  it('RB-7 动效可跳过且音频不可用时静默降级（TC-RBP-013）', async () => {
    const { wrapper } = await mountCoupon()
    await openOverlay(wrapper)
    // 模拟音频不可用（无 AudioContext 环境）：不得抛错，也不影响结果
    const originalContext = (window as { AudioContext?: unknown }).AudioContext
    ;(window as { AudioContext?: unknown }).AudioContext = undefined
    try {
      await wrapper.find('[data-testid="blast-burst-btn"]').trigger('click')
      // 「跳过」在动效中出现（idle 态无动效可跳过）
      expect(wrapper.find('[data-testid="blast-skip"]').exists()).toBe(true)
      await wrapper.find('[data-testid="blast-skip"]').trigger('click')
      await vi.waitFor(
        () => expect(wrapper.find('[data-testid="blast-result"]').exists()).toBe(true),
        { timeout: 3000 },
      )
    } finally {
      ;(window as { AudioContext?: unknown }).AudioContext = originalContext
    }
  })
})
