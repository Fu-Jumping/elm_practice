/**
 * 认证域 mock（契约 §3.1 + 固定演示数据：13800000001 / 123456）
 * 默认未登录：GET /me 返回 401，由守卫决定跳登录页
 * 注册为纯数据映射：handler 内引用 ok/fail 在请求时才执行，模块加载期零调用
 */
import type { UserSummary } from '@/services/api/types'
import type { MockHandler } from './index'
import { fail, ok } from './index'

const DEMO_USER: UserSummary = { account: '13800000001', nickname: '张同学' }
/** 已注册账号集合（mock 内存态，代替后端的数据库查重）：预置演示账号 */
const registeredAccounts = new Set<string>([DEMO_USER.account])

export const authMocks: Record<string, MockHandler> = {
    // 注册（契约 §3.1）：必填缺失 400；账号已存在 409；成功返回用户摘要（不含密码）
  'POST /users': ({ data }) => {
    const { account, password, nickname } = (data ?? {}) as {
      account?: string
      password?: string
      nickname?: string
    }
    if (!account || !password || !nickname) {
      return fail(400, 40000, '账号、密码和昵称不能为空')
    }
    if (registeredAccounts.has(account)) {
      return fail(409, 40900, '账号已存在')
    }
    registeredAccounts.add(account)
    return ok<UserSummary>({ account, nickname })
  },
  // 登录：账号或密码错误 401；字段缺失 400（契约 §3.1 语义）
  'POST /auth/login': ({ data }) => {
    const { account, password } = (data ?? {}) as { account?: string; password?: string }
    if (!account || !password) {
      return fail(400, 40000, '账号和密码不能为空')
    }
    if (account === DEMO_USER.account && password === '123456') {
      return ok<UserSummary>(DEMO_USER)
    }
    return fail(401, 40100, '账号或密码错误')
  },

  // 登出：销毁会话（mock 无状态，直接成功）
  'POST /auth/logout': () => ok(null),

  // 探活：mock 默认未登录 → 401（演示登录后状态由 sessionStore 内存态承载）
  'GET /me': () => fail(401, 40101, '未登录'),
}
