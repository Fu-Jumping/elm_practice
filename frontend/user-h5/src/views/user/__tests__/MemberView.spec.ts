import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MemberView from '../MemberView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'

/**
 * 会员权益页 MB 组（批次⑥ TODO-USER-006，2026-09-12）
 * 出处：PRD 7.16.1「会员权益页」两行（顶部栏/权益内容区）、PRD 6.11 会员权益（485 行：会员标识、
 * 会员价、会员折扣说明）、契约 §3.8（会员对象 memberOpened/discountRate/discountDesc/activatedAt，
 * **不提供开通与续费接口**）、TC-MBR-001/005。
 * 视觉真源：docs/design/exports/用户端/10-个人中心/03-会员权益/。
 * MB-1 会员标识与折扣说明按接口展示（TC-MBR-001：标识与会员价按种子数据展示）
 * MB-2 权益项为固定课程说明文案、点击展开本地说明不发请求（PRD 871 行）
 * MB-3 不出现开通/续费能力：续费仅给演示反馈、不调用写接口；页面不出现「积分」「第三方品牌」
 * MB-4 会员状态读取失败 → 显示暂无权益（PRD 871 行降级口径）
 * MB-5 未登录 → 跳登录（PRD 870 行）
 * 口径提示（提请负责人复核）：TC-MBR-005 写「页面不出现开通/续费入口」，而 PRD 871 行写
 * 「续费按钮只给演示反馈并明确提示为演示操作」——两处冲突。本实现按 PRD 执行（保留按钮 + 演示反馈 +
 * 零状态变化、零接口调用），并把冲突登记在 raw 留痕与待办证据列。
 */

// 失败注入沿用既有模式（ReviewOrderView.spec）：mock 单测可直接替换 api 实现
vi.mock('@/services/api', () => ({
  memberApi: { getMember: vi.fn() },
}))

import { memberApi } from '@/services/api'

const MEMBER_FIXTURE = {
  memberOpened: true,
  discountRate: 0.95,
  discountDesc: '会员商品 95 折',
  activatedAt: '2026-09-01 10:00:00',
}

describe('会员权益页（批次⑥ TODO-USER-006）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    // mockReset 同时清空调用历史：否则跨用例累计调用次数会让「不发接口」类断言假红
    const getMember = vi.mocked(memberApi.getMember)
    getMember.mockReset()
    getMember.mockResolvedValue({ ...MEMBER_FIXTURE })
  })

  afterEach(() => {
    offToast?.()
    vi.restoreAllMocks()
  })

  async function mountMember(loginFirst = true) {
    const pinia = createPinia()
    setActivePinia(pinia)
    if (loginFirst) useSessionStore().user = { account: '13800000001', nickname: '张同学' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/member', name: 'member', component: MemberView },
      ],
    })
    await router.push('/member')
    await router.isReady()
    const wrapper = mount(MemberView, { global: { plugins: [pinia, router] } })
    return { wrapper, router }
  }

  it('MB-1 会员标识与折扣说明按接口展示（TC-MBR-001）', async () => {
    const { wrapper } = await mountMember()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="member-status"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const page = wrapper.find('[data-testid="member-page"]')
    expect(page.text()).toContain('会员权益')
    expect(wrapper.find('[data-testid="member-status"]').text()).toContain('已开通')
    expect(page.text()).toContain('95')
    // 会员有效期无契约字段（§3.8 无有效期字段）→ 不渲染假日期
    expect(page.text()).not.toContain('2024-12-31')
  })

  it('MB-2 权益项为固定课程文案，点击展开本地说明且不发接口', async () => {
    const { wrapper } = await mountMember()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="member-status"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const items = wrapper.findAll('[data-testid="benefit-item"]')
    expect(items).toHaveLength(3)
    const labels = items.map((item) => item.text())
    expect(labels.join('|')).toContain('专享红包')
    expect(labels.join('|')).toContain('免配送费')
    expect(labels.join('|')).toContain('会员价')
    // 展开前无说明文本（本地说明按需展开，不发请求）
    expect(wrapper.findAll('[data-testid="benefit-detail"]')).toHaveLength(0)
    const callsAfterLoad = vi.mocked(memberApi.getMember).mock.calls.length
    await items[0]!.trigger('click')
    await flushPromises()
    const details = wrapper.findAll('[data-testid="benefit-detail"]')
    expect(details).toHaveLength(1)
    expect(details[0]!.text()).toContain('每月专享大额红包')
    // 点击只展开本地说明：不新增任何接口调用
    expect(vi.mocked(memberApi.getMember).mock.calls.length).toBe(callsAfterLoad)
  })

  it('MB-3 续费仅演示反馈且不调用写接口；页面不出现积分与第三方品牌字样', async () => {
    const { wrapper } = await mountMember()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="member-status"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    const page = wrapper.find('[data-testid="member-page"]')
    // 本期不建积分体系、不出现第三方品牌（PRD：不展示积分余额或兑换入口）
    expect(page.text()).not.toContain('积分')
    expect(page.text()).not.toContain('饿了么')
    expect(page.text()).not.toContain('吃货豆')
    await wrapper.find('[data-testid="member-renew-btn"]').trigger('click')
    await flushPromises()
    // 演示反馈：提示含「演示」；只读接口被调用，不存在任何开通/续费写接口
    expect(messages.some((message) => message.includes('演示'))).toBe(true)
    expect(vi.mocked(memberApi.getMember).mock.calls.length).toBe(1)
  })

  it('MB-4 会员状态读取失败 → 显示暂无权益（PRD 871 行降级）', async () => {
    vi.mocked(memberApi.getMember).mockRejectedValue(new Error('加载失败'))
    const { wrapper } = await mountMember()
    await vi.waitFor(
      () => expect(wrapper.find('[data-testid="member-fallback"]').exists()).toBe(true),
      { timeout: 2000 },
    )
    expect(wrapper.find('[data-testid="member-fallback"]').text()).toContain('暂无权益')
  })

  it('MB-5 未登录进入 → 跳登录并带 redirect（PRD 870 行）', async () => {
    const { router } = await mountMember(false)
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 2000 })
    expect(String(router.currentRoute.value.query.redirect)).toContain('/member')
  })
})
