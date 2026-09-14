import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MineView from '../MineView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'

/**
 * 我的页 P0 行为测试 T51–T55（2026-09-07 第三批，口径来自 PRD 7.16.1 我的页行（862），AI 辅助脚手架）
 * T51 已登录渲染：昵称/账号来自会话，"收货地址"入口，未实现模块入口存在，页脚版本号固定值
 * T52 未登录进入 → 显示"去登录"引导（PRD：未登录显示去登录，页面内处理），点击跳登录带 redirect
 * T53 点击"收货地址" → 跳转地址管理页
 * T54 退出登录 → 清除会话并跳登录页（PRD：退出登录清除会话；退出后不能返回受保护页面）
 * T55 未实现入口（会员/收藏/红包）点击 → 提示暂未开放（PRD：未选定入口显示暂未开放）
 * 口径：未实现模块不显示假数量（PRD 862 列）；账号字段缺失隐藏对应字段
 */
describe('MineView（我的页 P0）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    offToast?.()
  })

  async function mountMine(piniaOpt: ReturnType<typeof createPinia> | undefined = undefined) {
    const p = piniaOpt ?? pinia
    setActivePinia(p)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/addresses', name: 'address-list', component: { template: '<div />' } },
        { path: '/favorites', name: 'favorites', component: { template: '<div />' } },
        { path: '/member', name: 'member', component: { template: '<div />' } },
        { path: '/coupons', name: 'coupons', component: { template: '<div />' } },
        { path: '/mine', name: 'mine', component: MineView },
        { path: '/ai-chat', name: 'ai-chat', component: { template: '<div />' } },
      ],
    })
    await router.push('/mine')
    await router.isReady()
    const wrapper = mount(MineView, { global: { plugins: [p, router] } })
    return { wrapper, router }
  }

  it('T51 已登录渲染昵称/账号、收货地址入口与固定版本号，不显示假数量', async () => {
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const { wrapper } = await mountMine()
    await flushPromises()
    expect(wrapper.find('[data-testid="mine-nickname"]').text()).toContain('张同学')
    expect(wrapper.find('[data-testid="mine-account"]').text()).toContain('13800000001')
    expect(wrapper.find('[data-testid="entry-addresses"]').exists()).toBe(true)
    // 未实现模块不显示假数量（PRD 862 列）：页面不出现编造的数字徽标
    expect(wrapper.text()).not.toContain('128')
    // 版本号为前端固定值
    expect(wrapper.find('[data-testid="mine-version"]').text()).toContain('v0.1.0')
  })

  it('T52 未登录进入 → 显示"去登录"引导，点击跳登录带 redirect（PRD：未登录显示去登录）', async () => {
    const { wrapper, router } = await mountMine()
    await flushPromises()
    const loginEntry = wrapper.find('[data-testid="login-entry"]')
    expect(loginEntry.exists()).toBe(true)
    await loginEntry.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(String(router.currentRoute.value.query.redirect)).toContain('/mine')
  })

  it('T53 点击"收货地址" → 跳转地址管理页', async () => {
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const { wrapper, router } = await mountMine()
    await flushPromises()
    await wrapper.find('[data-testid="entry-addresses"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('address-list')
  })

  it('T54 退出登录 → 清除会话并跳登录页（PRD：退出登录清除会话）', async () => {
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const { wrapper, router } = await mountMine()
    await flushPromises()
    await wrapper.find('[data-testid="logout-btn"]').trigger('click')
    await vi.waitFor(
      () => {
        expect(session.isLoggedIn).toBe(false)
        expect(router.currentRoute.value.name).toBe('login')
      },
      { timeout: 2000 },
    )
  })

  // 2026-09-12 口径演进（批次⑥/CHG-001）：会员权益、我的收藏、红包卡券三个入口先后接成真路由，
  // 本用例相应改为「三入口均进入对应页面」；仍占位的入口（本页暂无可点未实现项）不再断言暂未开放。
  it('T55 会员/收藏/红包三入口进入对应页面', async () => {
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const { wrapper, router } = await mountMine()
    await flushPromises()
    await wrapper.find('[data-testid="entry-member"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('member')
    await wrapper.find('[data-testid="entry-favorites"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('favorites')
    // 红包卡券 → 红包页（CHG-001 TODO-USER-028）
    await wrapper.find('[data-testid="entry-coupons"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('coupons')
  })
})

/**
 * 我的页 AI 点餐助手入口用例 MINE-AI-1（AI点餐助手前端PRD §2.3，2026-09-14）
 * PRD §2.3：「我的」页面功能列表新增「AI 点餐助手」条目（带对话图标），点击进入 AI 对话页。
 * 本组在 feat: 实现前必须红（条目由 feat: 加入 MineView.vue）。
 */
describe('MineView（AI 点餐助手入口，AI点餐助手前端PRD §2.3）', () => {
  it('MINE-AI-1 我的页显示「AI 点餐助手」条目并跳转对话页', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/mine', name: 'mine', component: MineView },
        { path: '/ai-chat', name: 'ai-chat', component: { template: '<div />' } },
      ],
    })
    await router.push('/mine')
    await router.isReady()
    // 常用功能列表仅在已登录时渲染（PRD 862 列：未登录显示「去登录」引导）
    useSessionStore().user = { account: '13800000001', nickname: '张同学' }
    const wrapper = mount(MineView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    const entry = wrapper.find('[data-testid="entry-ai-chat"]')
    expect(entry.exists()).toBe(true)
    expect(entry.text()).toContain('AI 点餐助手')
    await entry.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ai-chat')
  })
})
