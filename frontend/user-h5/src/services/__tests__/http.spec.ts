import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { request, BizError } from '@/services/http'
import { onToast } from '@/utils/toast'
import { mockDispatch } from '@/mocks'

vi.mock('@/mocks', () => ({ mockDispatch: vi.fn() }))

// http 层内部 import 全局 router（401 分支按 currentRoute.meta.auth 判定跳转），
// 替换为测试专用 memory router：需含公开页、受保护页（meta.auth=true）与登录页
vi.mock('@/router', async () => {
  const { createMemoryHistory, createRouter } = await import('vue-router')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/orders', name: 'orders', component: { template: '<div />' }, meta: { title: '订单', auth: true } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
  return { default: router }
})

import router from '@/router'

/**
 * http 层 401 分支锁定用例（2026-09-08 补录，第三批任务）。
 * 口径来源：services/http/index.ts handleHttpError 与 PRD"未登录可浏览"；
 * 实现 XA-06 于 2026-09-07 联调期先行落地（当时 mock 体系无法注入公开页 401 场景，
 * 修复未带用例，例外留痕见 raw/2026-09-07/用户端-1356.md）——本用例为补锁定性质，
 * 预期直接转绿（非红绿对），红绿纪律例外以 raw 留痕为准。
 *
 * XA-06a 公开页（meta.auth 非 true）接口 401 → 静默降级：不 toast、不跳登录
 * XA-06b 受保护页（meta.auth=true）接口 401 → toast + 跳登录带 redirect（对照分支）
 * XA-06c 登录接口自身 401 → toast 但不跳转（A6：账号或密码错误属业务失败）
 */
describe('http 层 401 分支（XA-06 公开页静默降级）', () => {
  const messages: string[] = []
  let offToast: (() => void) | undefined

  const unauthorized = (message: string) => ({
    status: 401,
    payload: { code: 40100, message, data: null as unknown },
  })

  beforeEach(() => {
    messages.length = 0
    offToast = onToast((message) => messages.push(message))
    vi.stubEnv('VITE_API_MODE', 'mock')
  })

  afterEach(() => {
    offToast?.()
    vi.unstubAllEnvs()
    vi.mocked(mockDispatch).mockReset()
  })

  it('XA-06a 公开页接口 401 → 静默降级：不 toast、不跳登录，调用方收到 BizError(401)', async () => {
    await router.push('/')
    await router.isReady()
    vi.mocked(mockDispatch).mockResolvedValue(unauthorized('未登录或会话已过期'))

    const err = await request({ method: 'get', url: '/cart' }).catch((e) => e)

    expect(err).toBeInstanceOf(BizError)
    expect((err as BizError).status).toBe(401)
    expect(messages).toEqual([])
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('XA-06b 受保护页接口 401 → toast 并跳登录带 redirect（对照分支锁定）', async () => {
    await router.push('/orders')
    await router.isReady()
    vi.mocked(mockDispatch).mockResolvedValue(unauthorized('未登录或会话已过期'))

    const err = await request({ method: 'get', url: '/orders' }).catch((e) => e)

    expect(err).toBeInstanceOf(BizError)
    expect((err as BizError).status).toBe(401)
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/orders')
    expect(messages).toContain('未登录或会话已过期')
  })

  it('XA-06c 登录接口自身 401 → toast 但不跳转（A6 账号或密码错误口径锁定）', async () => {
    await router.push('/')
    await router.isReady()
    vi.mocked(mockDispatch).mockResolvedValue(unauthorized('账号或密码错误'))

    const err = await request({ method: 'post', url: '/auth/login', data: {} }).catch((e) => e)

    expect(err).toBeInstanceOf(BizError)
    expect((err as BizError).status).toBe(401)
    expect(messages).toContain('账号或密码错误')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
  })
})
