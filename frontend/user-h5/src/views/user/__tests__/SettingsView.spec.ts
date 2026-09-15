import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import SettingsView from '../SettingsView.vue'
import { useSessionStore } from '@/stores/sessionStore'
import { onToast } from '@/utils/toast'

/**
 * 系统设置页测试（设置与 FAQ P2，PRD 7.16.1「系统设置页-顶部栏 / 设置内容区」两行）
 * SET-1 未登录进入 → 按统一规则跳登录并保留目标地址（PRD 交互/检查列）
 * SET-2 固定菜单五项齐全 + 版本号为前端固定值；不出现第三方品牌字样
 * SET-3 通知设置、隐私设置 → 提示「暂未开放」，不扩大本期范围（PRD 交互列）
 * SET-4 个人资料 → 进入资料展示页（PRD 交互列）
 * SET-5 退出登录：二次确认；取消不退出，确认后清除会话并回登录页（PRD 交互/检查列）
 * SET-6 未登录访问时页面不渲染菜单（先跳登录）
 * 本组在 feat: 实现前必须红（页面与路由由 feat: 加入）
 */
let router: ReturnType<typeof createRouter>

async function mountSettings(opts: { loggedIn?: boolean } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (opts.loggedIn !== false) {
    useSessionStore().user = { account: '13800000001', nickname: '张同学' }
  }
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/mine', name: 'mine', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/settings', name: 'settings', component: SettingsView },
      { path: '/settings/profile', name: 'profile', component: { template: '<div />' } },
    ],
  })
  await router.push('/settings')
  await router.isReady()
  const wrapper = mount(SettingsView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

describe('SettingsView（系统设置页，设置与 FAQ P2）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
  })

  afterEach(() => {
    offToast?.()
    vi.restoreAllMocks()
  })

  it('SET-1 未登录进入 → 跳登录页并保留目标地址', async () => {
    await mountSettings({ loggedIn: false })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 3000 })
    expect(String(router.currentRoute.value.query.redirect)).toContain('/settings')
  })

  it('SET-2 固定菜单五项齐全、版本号为前端固定值，且不出现第三方品牌字样', async () => {
    const wrapper = await mountSettings()
    expect(wrapper.find('[data-testid="settings-header"]').text()).toContain('系统设置')
    for (const id of ['settings-profile', 'settings-notification', 'settings-privacy', 'settings-about', 'settings-logout']) {
      expect(wrapper.find(`[data-testid="${id}"]`).exists()).toBe(true)
    }
    expect(wrapper.find('[data-testid="settings-version"]').text()).toBe('v0.1.0')
    expect(wrapper.text()).not.toContain('饿了么')
    expect(router.currentRoute.value.name).toBe('settings')
  })

  it('SET-3 通知设置 / 隐私设置点击提示「暂未开放」（PRD：不扩大本期范围）', async () => {
    const wrapper = await mountSettings()
    await wrapper.find('[data-testid="settings-notification"]').trigger('click')
    await flushPromises()
    expect(messages).toContain('暂未开放')
    await wrapper.find('[data-testid="settings-privacy"]').trigger('click')
    await flushPromises()
    expect(messages.filter((m) => m === '暂未开放').length).toBe(2)
    expect(router.currentRoute.value.name).toBe('settings')
  })

  it('SET-4 点击「个人资料」进入资料展示页；点击「关于轻量外卖」只展示固定信息', async () => {
    const wrapper = await mountSettings()
    await wrapper.find('[data-testid="settings-profile"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('profile')

    await router.push('/settings')
    await flushPromises()
    await wrapper.find('[data-testid="settings-about"]').trigger('click')
    await flushPromises()
    expect(messages.some((m) => m.includes('v0.1.0'))).toBe(true)
  })

  it('SET-5 退出登录：取消二次确认不退出；确认后清除会话并回登录页', async () => {
    const wrapper = await mountSettings()
    const session = useSessionStore()

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await wrapper.find('[data-testid="settings-logout"]').trigger('click')
    await flushPromises()
    expect(confirmSpy).toHaveBeenCalled()
    expect(session.isLoggedIn).toBe(true)
    expect(router.currentRoute.value.name).toBe('settings')

    confirmSpy.mockReturnValue(true)
    await wrapper.find('[data-testid="settings-logout"]').trigger('click')
    await vi.waitFor(
      () => {
        expect(session.isLoggedIn).toBe(false)
        expect(router.currentRoute.value.name).toBe('login')
      },
      { timeout: 3000 },
    )
  })

  it('SET-6 已登录访问不跳登录（与未登录分支对照）', async () => {
    await mountSettings()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('settings')
  })
})
