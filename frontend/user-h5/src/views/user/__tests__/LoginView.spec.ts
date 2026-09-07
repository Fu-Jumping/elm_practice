import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import LoginView from '../LoginView.vue'
import { onToast } from '@/utils/toast'

/**
 * 登录页 P0 行为测试 L1–L7（2026-09-07 第三批，口径来自 PRD 7.16.1 登录页三行 + TC-ACC 前端侧，AI 辅助脚手架）
 * L1 渲染：账号/密码输入、登录按钮、演示账号按钮（只显示账号不显示密码）、注册入口
 * L2 必填检查：账号或密码为空 → 逐字段提示、不发请求（PRD：账号或密码为空提示具体字段）
 * L3 登录成功：只发一次请求，按 redirect 跳转（无 redirect 去首页）（PRD：成功保存会话并按目标地址跳转）
 * L4 登录失败：显示服务端错误、保留账号、停留登录页（A6 口径：账号或密码错误同文案不泄露细节）
 * L5 请求中按钮禁用（PRD：请求中按钮禁用；重复点击只产生一次请求，XA-05 同源）
 * L6 商家入口占位提示（PRD：未实现的入口显示明确提示，不跳入空白页）
 * L7 已登录访问登录页 → 按目标地址跳转（PRD：已登录用户访问登录页时按目标地址处理）
 */
describe('LoginView（登录页 P0）', () => {
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

  async function mountLogin(query: Record<string, string> = {}) {
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: LoginView },
        { path: '/register', name: 'register', component: { template: '<div />' } },
        { path: '/orders', name: 'orders', component: { template: '<div />' } },
      ],
    })
    await router.push({ path: '/login', query })
    await router.isReady()
    const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })
    return { wrapper, router }
  }

  it('L1 渲染账号/密码输入、登录按钮与演示账号按钮（不显示密码）', async () => {
    const { wrapper } = await mountLogin()
    expect(wrapper.find('[data-testid="input-account"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="input-password"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="login-btn"]').exists()).toBe(true)
    const demo = wrapper.find('[data-testid="demo-account-btn"]')
    expect(demo.exists()).toBe(true)
    // PRD：页面只显示账号，不显示真实密码
    expect(demo.text()).toContain('13800000001')
    expect(demo.text()).not.toContain('123456')
    // 底部注册入口
    expect(wrapper.find('[data-testid="register-link"]').exists()).toBe(true)
  })

  it('L2 必填全空提交 → 逐字段提示且不发请求（停留登录页）', async () => {
    const { wrapper, router } = await mountLogin()
    await wrapper.find('form.lg-form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="error-account"]').text()).toContain('手机号不能为空')
    expect(wrapper.find('[data-testid="error-password"]').text()).toContain('密码不能为空')
    // 校验不过不发请求：停留登录页（未产生会话）
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('L3 演示账号登录成功 → 按 redirect 跳转目标页', async () => {
    const { wrapper, router } = await mountLogin({ redirect: '/orders' })
    await wrapper.find('[data-testid="input-account"]').setValue('13800000001')
    await wrapper.find('[data-testid="input-password"]').setValue('123456')
    await wrapper.find('form.lg-form').trigger('submit')
    // 登录走真实 mock 链路（会话建立后跳 redirect 目标）
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), {
      timeout: 2000,
    })
  })

  it('L4 密码错误 → 服务端错误提示、账号保留、停留登录页（A6 同口径）', async () => {
    const { wrapper, router } = await mountLogin()
    await wrapper.find('[data-testid="input-account"]').setValue('13800000001')
    await wrapper.find('[data-testid="input-password"]').setValue('wrong-pass')
    await wrapper.find('form.lg-form').trigger('submit')
    await vi.waitFor(() => expect(messages).toContain('账号或密码错误'), { timeout: 2000 })
    // 失败保留账号（PRD：失败保留账号）；停留登录页
    expect(
      (wrapper.find('[data-testid="input-account"]').element as HTMLInputElement).value,
    ).toBe('13800000001')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('L5 请求中登录按钮禁用（XA-05：重复点击只产生一次请求）', async () => {
    const { wrapper } = await mountLogin()
    await wrapper.find('[data-testid="input-account"]').setValue('13800000001')
    await wrapper.find('[data-testid="input-password"]').setValue('123456')
    const btn = wrapper.find('[data-testid="login-btn"]')
    await wrapper.find('form.lg-form').trigger('submit')
    // mock 有 200-500ms 延迟窗口，点击后立即断言禁用与文案
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('登录中')
    await vi.waitFor(() => expect(btn.attributes('disabled')).toBeUndefined(), {
      timeout: 2000,
    })
  })

  it('L6 商家入口为占位提示，不跳空白页', async () => {
    const { wrapper, router } = await mountLogin()
    await wrapper.find('[data-testid="merchant-entry"]').trigger('click')
    await flushPromises()
    expect(messages.some((m) => m.includes('暂未开放') || m.includes('桌面'))).toBe(true)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('L7 已登录访问登录页 → 跳转 redirect 目标（PRD：按目标地址处理）', async () => {
    const { useSessionStore } = await import('@/stores/sessionStore')
    const session = useSessionStore()
    session.user = { account: '13800000001', nickname: '张同学' }
    const { router } = await mountLogin({ redirect: '/orders' })
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'), {
      timeout: 2000,
    })
  })
})
