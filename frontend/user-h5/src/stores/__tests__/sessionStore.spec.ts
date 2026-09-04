import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '../sessionStore'

// 用户端第一批 TDD 用例 A1–A5（2026-09-04 用例清单由人拍板）
// 依据：契约 §3.1（登录/登出/探活、401/400 口径）、TC-ACC-010~014、mock 演示账号 13800000001/123456
// 断言形态：http 层失败统一抛 BizError（message / code 业务码 / status HTTP 码）
// 说明：会话链路 9/3 初始化已实现（脚手架），本组为既有行为的回归保护网；
//       normalizers 一组为 TDD 红起点（见 normalizers.spec.ts）

describe('sessionStore 登录会话链路（mock 模式）', () => {
  let store: ReturnType<typeof useSessionStore>

  beforeEach(() => {
    // 每条用例一个全新的 Pinia 实例，用例之间互不污染
    setActivePinia(createPinia())
    store = useSessionStore()
  })

  it('A1 正确账号密码登录成功，进入已登录态', async () => {
    const user = await store.login('13800000001', '123456')
    expect(user).toMatchObject({ account: '13800000001', nickname: '张同学' })
    expect(store.isLoggedIn).toBe(true)
  })

  it('A2 密码错误 → BizError 401/40100，用户保持未登录', async () => {
    await expect(store.login('13800000001', 'wrong-password')).rejects.toMatchObject({
      name: 'BizError',
      code: 40100,
      status: 401,
    })
    expect(store.isLoggedIn).toBe(false)
  })

  it('A3 账号或密码为空 → BizError 400/40000', async () => {
    await expect(store.login('', '')).rejects.toMatchObject({
      name: 'BizError',
      code: 40000,
      status: 400,
    })
    expect(store.isLoggedIn).toBe(false)
  })

  it('A4 登录成功后登出，回到未登录态', async () => {
    await store.login('13800000001', '123456')
    expect(store.isLoggedIn).toBe(true)
    await store.logout()
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('A5 未登录探活返回 false，401 属预期不向外抛', async () => {
    await expect(store.checkLogin()).resolves.toBe(false)
    expect(store.isLoggedIn).toBe(false)
  })

  it('A6 账号不存在与密码错误同口径（TC-ACC-012），不泄露细节', async () => {
    // 账号换成不存在的，密码是对的 → 依然 401，报同一句话
    await expect(store.login('13900000000', '123456')).rejects.toMatchObject({
      name: 'BizError',
      code: 40100,
      status: 401,
      message: '账号或密码错误', 
    })
    expect(store.isLoggedIn).toBe(false)
  })
})
