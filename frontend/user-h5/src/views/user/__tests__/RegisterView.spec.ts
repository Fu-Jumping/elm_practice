import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import RegisterView from '../RegisterView.vue'
import { onToast } from '@/utils/toast'

/**
 * 注册页 P0 行为测试 R1–R9（2026-09-08 第四批，口径来自 PRD 7.16.1 注册页两行 + TC-ACC-009 前端侧，AI 辅助脚手架）
 * R1 渲染：顶部栏（返回+标题）、手机号/昵称/密码/确认密码输入、协议默认未勾选、立即注册按钮、去登录入口
 * R2 必填检查：全空提交 → 五项逐字段提示、不发请求（PRD：必填…逐项提示）
 * R3 格式检查：手机号 10 位/密码 5 位/两次密码不一致 → 逐字段提示、不发请求（TC-ACC-002/004/006 前端镜像）
 * R4 注册成功：toast 提示并回登录页，不建立会话（PRD：成功清空密码并返回登录页；成功后重新登录验证会话）
 * R5 重复注册：演示账号 409 → 服务端错误提示、表单保留（账号+昵称供修改）、停留注册页
 * R6 请求中按钮禁用显示"注册中"（XA-05：重复点击只产生一次请求）
 * R7 顶部栏返回（空表单）：直接回登录页，不弹确认（PRD：表单无内容时直接返回）
 * R8 顶部栏返回（有内容）：确认放弃后返回/取消保留输入（PRD：先确认是否放弃）
 * R9 底部"已有账号？去登录"：回登录页（导出稿底部链接行）
 */
describe('RegisterView（注册页 P0）', () => {
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
    vi.restoreAllMocks()
  })

  async function mountRegister() {
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/register', name: 'register', component: RegisterView },
      ],
    })
    await router.push('/register')
    await router.isReady()
    const wrapper = mount(RegisterView, { global: { plugins: [pinia, router] } })
    return { wrapper, router }
  }

  /** 填写合法注册表单（账号不重复，避免用例间 mock 注册集合污染） */
  async function fillValidForm(
    wrapper: Awaited<ReturnType<typeof mountRegister>>['wrapper'],
    account = '13900001111',
  ) {
    await wrapper.find('[data-testid="input-account"]').setValue(account)
    await wrapper.find('[data-testid="input-nickname"]').setValue('王同学')
    await wrapper.find('[data-testid="input-password"]').setValue('123456')
    await wrapper.find('[data-testid="input-confirm-password"]').setValue('123456')
    await wrapper.find('[data-testid="agreement-checkbox"]').setValue(true)
  }

  it('R1 渲染顶部栏、四个输入、协议复选（默认未勾选）、注册按钮与去登录入口', async () => {
    const { wrapper } = await mountRegister()
    expect(wrapper.find('[data-testid="topbar-back"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('注册账号')
    expect(wrapper.find('[data-testid="input-account"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="input-nickname"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="input-password"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="input-confirm-password"]').exists()).toBe(true)
    // 协议默认未勾选（PRD：协议默认未勾选）
    const agreement = wrapper.find('[data-testid="agreement-checkbox"]')
    expect(agreement.exists()).toBe(true)
    expect((agreement.element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('[data-testid="register-btn"]').text()).toContain('立即注册')
    expect(wrapper.find('[data-testid="login-link"]').exists()).toBe(true)
  })

  it('R2 全空提交 → 五项逐字段提示且不发请求（停留注册页）', async () => {
    const { wrapper, router } = await mountRegister()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="error-account"]').text()).toContain('手机号不能为空')
    expect(wrapper.find('[data-testid="error-nickname"]').text()).toContain('昵称不能为空')
    expect(wrapper.find('[data-testid="error-password"]').text()).toContain('密码不能为空')
    expect(wrapper.find('[data-testid="error-confirm-password"]').text()).toContain('请再次输入密码')
    expect(wrapper.find('[data-testid="error-agreement"]').text()).toContain('请先阅读并勾选协议')
    // 校验不过不发请求：无任何 toast、停留注册页（未产生会话）
    expect(messages).toHaveLength(0)
    expect(router.currentRoute.value.name).toBe('register')
  })

  it('R3 格式错误（10位手机号/5位密码/两次密码不一致）→ 逐字段提示且不发请求', async () => {
    const { wrapper, router } = await mountRegister()
    await wrapper.find('[data-testid="input-account"]').setValue('1380000000')
    await wrapper.find('[data-testid="input-nickname"]').setValue('王同学')
    await wrapper.find('[data-testid="input-password"]').setValue('12345')
    await wrapper.find('[data-testid="input-confirm-password"]').setValue('123456')
    await wrapper.find('[data-testid="agreement-checkbox"]').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="error-account"]').text()).toContain('手机号格式错误')
    expect(wrapper.find('[data-testid="error-password"]').text()).toContain('密码长度须为 6-20 位')
    expect(wrapper.find('[data-testid="error-confirm-password"]').text()).toContain('两次输入的密码不一致')
    expect(messages).toHaveLength(0)
    expect(router.currentRoute.value.name).toBe('register')
  })

  it('R4 注册成功 → toast 提示并回登录页，不建立会话', async () => {
    const { wrapper, router } = await mountRegister()
    const { useSessionStore } = await import('@/stores/sessionStore')
    const session = useSessionStore()
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(messages).toContain('注册成功，请登录'), { timeout: 2000 })
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), {
      timeout: 2000,
    })
    // 注册不建立会话（PRD：成功后重新登录验证会话）
    expect(session.isLoggedIn).toBe(false)
  })

  it('R5 重复注册已存在账号 → 服务端错误提示、表单保留、停留注册页', async () => {
    const { wrapper, router } = await mountRegister()
    await fillValidForm(wrapper, '13800000001')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(messages).toContain('账号已存在'), { timeout: 2000 })
    // 失败保留已填内容（PRD：账号已存在时保留账号和昵称供修改）
    expect(
      (wrapper.find('[data-testid="input-account"]').element as HTMLInputElement).value,
    ).toBe('13800000001')
    expect(
      (wrapper.find('[data-testid="input-nickname"]').element as HTMLInputElement).value,
    ).toBe('王同学')
    expect(router.currentRoute.value.name).toBe('register')
  })

  it('R6 请求中注册按钮禁用显示"注册中"（XA-05：重复点击只产生一次请求）', async () => {
    const { wrapper } = await mountRegister()
    await fillValidForm(wrapper, '13900002222')
    const btn = wrapper.find('[data-testid="register-btn"]')
    await wrapper.find('form').trigger('submit')
    // mock 有 200-500ms 延迟窗口，点击后立即断言禁用与文案
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('注册中')
    await vi.waitFor(() => expect(btn.attributes('disabled')).toBeUndefined(), {
      timeout: 2000,
    })
  })

  it('R7 空表单点顶部栏返回 → 直接回登录页，不弹确认', async () => {
    const { wrapper, router } = await mountRegister()
    const confirmSpy = vi.spyOn(window, 'confirm')
    await wrapper.find('[data-testid="topbar-back"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('R8 有内容点顶部栏返回：取消则停留且内容保留，确认后返回登录页', async () => {
    const { wrapper, router } = await mountRegister()
    const confirmSpy = vi.spyOn(window, 'confirm')
    await wrapper.find('[data-testid="input-account"]').setValue('13800000002')
    // 取消放弃：停留注册页、输入保留
    confirmSpy.mockReturnValue(false)
    await wrapper.find('[data-testid="topbar-back"]').trigger('click')
    await flushPromises()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('register')
    expect(
      (wrapper.find('[data-testid="input-account"]').element as HTMLInputElement).value,
    ).toBe('13800000002')
    // 确认放弃：返回登录页
    confirmSpy.mockReturnValue(true)
    await wrapper.find('[data-testid="topbar-back"]').trigger('click')
    await flushPromises()
    expect(confirmSpy).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('R9 底部"已有账号？去登录"→ 回登录页', async () => {
    const { wrapper, router } = await mountRegister()
    await wrapper.find('[data-testid="login-link"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
  })
})
